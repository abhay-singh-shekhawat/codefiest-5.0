import { useEffect, useRef, useMemo } from 'react'
import deviceTier from '../hooks/useDeviceTier.js'

const { isMobile, isLowEndDevice } = deviceTier

// Cap star count based on device tier
const STAR_COUNT = isMobile || isLowEndDevice ? 80 : 280

// Expensive effects are disabled on mobile/low-end
const ENABLE_HALOS         = !isMobile && !isLowEndDevice
const ENABLE_CONSTELLATIONS = !isMobile && !isLowEndDevice
const ENABLE_SPARKLES       = !isMobile && !isLowEndDevice
const ENABLE_PARALLAX       = !isMobile  // no cursor on touch devices

// ── deterministic star field seeded so it never re-randomises on re-render ──
function makeStars(count, seed = 0) {
  const stars = []
  let s = seed
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
  for (let i = 0; i < count; i++) {
    stars.push({
      x:    rng() * 100,
      y:    rng() * 100,
      r:    0.5 + rng() * 1.5,
      opacity: 0.2 + rng() * 0.7,
      twinkleSpeed: 0.4 + rng() * 1.8,
      twinklePhase: rng() * Math.PI * 2,
      layer: Math.floor(rng() * 3),
      color: rng() > 0.85 ? (rng() > 0.5 ? '#bfdbfe' : '#fef08a') : '#ffffff',
    })
  }
  return stars
}

function makeConstellations(stars, count = 18) {
  const edges = []
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * stars.length)
    const b = Math.floor(Math.random() * stars.length)
    if (a !== b) edges.push([a, b])
  }
  return edges
}

const LAYER_PARALLAX = [0.008, 0.022, 0.048]

export default function StarBackground() {
  const canvasRef = useRef(null)
  const mouseRef  = useRef({ x: 0, y: 0 })
  const offsetRef = useRef({ x: 0, y: 0 })

  const stars         = useMemo(() => makeStars(STAR_COUNT, 42), [])
  const constellEdges = useMemo(
    () => ENABLE_CONSTELLATIONS ? makeConstellations(stars, 14) : [],
    [stars],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Skip mousemove listener on touch/mobile — no cursor, saves event overhead
    let onMouse = null
    if (ENABLE_PARALLAX) {
      onMouse = (e) => {
        mouseRef.current = {
          x: (e.clientX / window.innerWidth  - 0.5) * 2,
          y: (e.clientY / window.innerHeight - 0.5) * 2,
        }
      }
      window.addEventListener('mousemove', onMouse)
    }

    let prevTime = performance.now()

    const draw = (now) => {
      animId = requestAnimationFrame(draw)
      const t = now / 1000
      prevTime = now

      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // ── Constellation lines (desktop only) ──────────────────────────
      if (ENABLE_CONSTELLATIONS) {
        ctx.save()
        constellEdges.forEach(([ai, bi]) => {
          const sa = stars[ai], sb = stars[bi]
          const pxA = (sa.x/100)*W + offsetRef.current.x * LAYER_PARALLAX[sa.layer] * 60
          const pyA = (sa.y/100)*H + offsetRef.current.y * LAYER_PARALLAX[sa.layer] * 40
          const pxB = (sb.x/100)*W + offsetRef.current.x * LAYER_PARALLAX[sb.layer] * 60
          const pyB = (sb.y/100)*H + offsetRef.current.y * LAYER_PARALLAX[sb.layer] * 40
          const alpha = 0.04 + 0.04 * Math.sin(t * 0.35 + ai)
          ctx.strokeStyle = `rgba(150,200,255,${alpha})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(pxA, pyA)
          ctx.lineTo(pxB, pyB)
          ctx.stroke()
        })
        ctx.restore()
      }

      // ── Smooth parallax (desktop only) ──────────────────────────────
      if (ENABLE_PARALLAX) {
        const mx = mouseRef.current.x * 60
        const my = mouseRef.current.y * 40
        offsetRef.current.x += (mx - offsetRef.current.x) * 0.04
        offsetRef.current.y += (my - offsetRef.current.y) * 0.04
      }

      // ── Stars ────────────────────────────────────────────────────────
      stars.forEach((star) => {
        const dx = offsetRef.current.x * LAYER_PARALLAX[star.layer] * 80
        const dy = offsetRef.current.y * LAYER_PARALLAX[star.layer] * 60
        const sx = ((star.x / 100) * W + dx + W) % W
        const sy = ((star.y / 100) * H + dy + H) % H

        const twinkle = star.opacity * (0.6 + 0.4 * Math.sin(t * star.twinkleSpeed + star.twinklePhase))
        const r       = star.r * (0.85 + 0.15 * Math.sin(t * star.twinkleSpeed * 0.7 + star.twinklePhase))

        // Glow halo — desktop only
        if (ENABLE_HALOS && twinkle > 0.55 && r > 1.1) {
          const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4)
          grd.addColorStop(0, star.color.replace(')', `,${twinkle * 0.4})`).replace('rgb', 'rgba'))
          grd.addColorStop(1, 'transparent')
          ctx.fillStyle = grd
          ctx.beginPath()
          ctx.arc(sx, sy, r * 4, 0, Math.PI * 2)
          ctx.fill()
        }

        // Star dot
        ctx.fillStyle = star.color === '#ffffff'
          ? `rgba(255,255,255,${twinkle})`
          : star.color === '#bfdbfe'
          ? `rgba(191,219,254,${twinkle})`
          : `rgba(254,240,138,${twinkle})`
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()

        // Cross sparkle — desktop only
        if (ENABLE_SPARKLES && star.layer === 2 && twinkle > 0.75) {
          ctx.save()
          ctx.globalAlpha = twinkle * 0.45
          ctx.strokeStyle = star.color
          ctx.lineWidth   = 0.7
          const sl = r * 3.5
          ctx.beginPath()
          ctx.moveTo(sx - sl, sy); ctx.lineTo(sx + sl, sy)
          ctx.moveTo(sx, sy - sl); ctx.lineTo(sx, sy + sl)
          ctx.stroke()
          ctx.restore()
        }
      })
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      if (onMouse) window.removeEventListener('mousemove', onMouse)
    }
  }, [stars, constellEdges])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -10,
        width:  '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
