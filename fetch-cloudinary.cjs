// fetch-cloudinary.cjs
// One-shot script: lists all image resources in the Cloudinary account using
// the Admin REST API (server-side, since it needs the API secret) and writes
// the public_ids + a list of delivery URLs to public/cloudinary-photos.json
// so the React app can fetch it client-side without ever seeing the secret.
//
// Uses native fetch + crypto (Node 18+) — no extra npm dependencies needed.

const fs   = require('fs')
const path = require('path')
const crypto = require('crypto')

// ── Read CLOUDINARY_URL from .env (no dotenv dependency) ──────────────────
function readCloudinaryUrl() {
  if (process.env.CLOUDINARY_URL) return process.env.CLOUDINARY_URL
  try {
    const raw = fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    const m = raw.match(/CLOUDINARY_URL\s*=\s*(\S+)/)
    if (m) return m[1]
  } catch (_) {}
  return null
}

const url = readCloudinaryUrl()
if (!url) {
  console.error('CLOUDINARY_URL not found in env or .env')
  process.exit(1)
}

// Parse: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
// We can't use `new URL()` because the `://` confuses it; split manually.
{
  const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
  if (!m) {
    console.error(`Could not parse CLOUDINARY_URL: ${url}`)
    process.exit(1)
  }
  var cloudName = m[3]
  var apiKey    = m[1]
  var apiSecret = m[2]
}

console.log(`Cloud name: ${cloudName}`)
console.log(`API key:    ${apiKey.slice(0,4)}…`)
console.log(`API secret: ${apiSecret.slice(0,4)}…`)

// ── Cloudinary Admin REST helper ──────────────────────────────────────────
// Cloudinary supports Basic Auth with api_key:api_secret as credentials.
function authHeader() {
  const b64 = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  return `Basic ${b64}`
}

async function callAdmin(params) {
  // The signature string only includes the listed query parameters (no api_key,
  // no resource_type — that lives in the path).
  const sorted = Object.keys(params).sort()
  const toSign = sorted.map(k => `${k}=${params[k]}`).join('&') + apiSecret
  const signature = crypto.createHash('sha1').update(toSign).digest('hex')

  const qs = new URLSearchParams({ ...params, signature, api_key: apiKey }).toString()
  const apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?${qs}`

  const res = await fetch(apiUrl, {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cloudinary ${res.status}: ${text}`)
  }
  return res.json()
}

// ── Build a delivery URL ──────────────────────────────────────────────────
function buildDeliveryUrl(publicId) {
  // 480x560 fill with auto-gravity, auto format/quality
  const transforms = 'c_fill,g_auto,w_480,h_560,q_auto,f_auto'
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`
}

// ── List all image assets, paginated ──────────────────────────────────────
async function listAll() {
  const all = []
  let next  = undefined
  do {
    const params = {
      type:         'upload',
      resource_type:'image',
      max_results:  '500',
    }
    if (next) params.next_cursor = next
    const res = await callAdmin(params)
    all.push(...res.resources)
    next = res.next_cursor
    console.log(`  fetched ${all.length} so far...`)
  } while (next)
  return all
}

// ── Main ──────────────────────────────────────────────────────────────────
;(async () => {
  try {
    const resources = await listAll()
    console.log(`\n✓ Found ${resources.length} images`)

    const photos = resources.map((r) => ({
      public_id: r.public_id,
      format:    r.format,
      width:     r.width,
      height:    r.height,
      url:       buildDeliveryUrl(r.public_id),
    }))

    const outDir  = path.join(__dirname, 'public')
    const outFile = path.join(outDir, 'cloudinary-photos.json')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(outFile, JSON.stringify(photos, null, 2))

    console.log(`\n✓ Wrote ${photos.length} entries → ${outFile}`)
    if (photos.length) console.log('  Sample URL:', photos[0].url)
  } catch (err) {
    console.error('\n✗ Cloudinary list failed:', err.message || err)
    process.exit(1)
  }
})()
