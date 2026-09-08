/**
 * GlimpsePage.jsx
 *
 * "GLIMPSE" — endless 3-D zoom-out collage of scattered polaroid memories (v4).
 *
 * ── What's new in v4 ──────────────────────────────────────────────────────
 *
 *  1. HEADER Z-INDEX FIX
 *     The "GLIMPSE" heading wrapper now carries  position: relative  +
 *     z-index: 10000  and  pointer-events: none  so it floats permanently
 *     on top of all photo cards (whose z-indices cap at ~9010).
 *     The edge-fade overlays are bumped to z-index: 600 so they too sit
 *     above cards without covering the heading.
 *
 *  2. NO MORE POP-INS
 *     Cards spawn at translateZ(+600px), which – together with the stage's
 *     perspective(1000px) – projects them far larger than the viewport.
 *     opacity starts at 0 and fades smoothly to 1 during the first ~8 % of
 *     each card's life, while it is still oversize and its edges lie beyond
 *     the clip boundary.  The viewer never sees a sudden "blink-in" because
 *     the card is invisible until it has already zoomed past the extreme
 *     close-up phase.
 *
 *  3. TRUE 3-D ZOOM-OUT
 *     The stage `<div>` has:
 *       perspective: 1000px;  perspective-origin: 50% 50%;
 *       transform-style: preserve-3d;
 *     Each card animates:
 *       translateX(xPx) translateY(yPx) translateZ(zPx) rotateZ(rot)
 *     where Z moves from +600px (foreground) down to -1200px (deep bg).
 *     X/Y spawn positions are randomised beyond the viewport edges
 *     (–15 vw … 115 vw / –15 vh … 115 vh) so cards visually tunnel in
 *     from the periphery.  No 2-D scale() is used — depth is handled
 *     entirely by the CSS perspective projection.
 *
 * ── Perf notes ────────────────────────────────────────────────────────────
 *  – Only DOM-style mutations; zero React state changes per frame.
 *  – IntersectionObserver pauses the rAF loop when off-screen.
 *  – prefers-reduced-motion → static scattered collage fallback.
 */

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

/* ── Image pool ───────────────────────────────────────────────────────
 * Photos are loaded at runtime from /cloudinary-photos.json, which is a
 * pre-generated manifest of every image in the Cloudinary account
 * (see fetch-cloudinary.cjs). This keeps the API secret out of the
 * browser bundle while letting us cycle through every uploaded image.
 */
const FALLBACK_PHOTOS = Array.from({ length: 24 }, (_, i) =>
  `https://picsum.photos/seed/glimpse-${String(i + 1).padStart(2, '0')}/480/560`,
)

/* ── Scene parameters ────────────────────────────────────────────────── */
const CARD_COUNT   = 28      // how many independent polaroids on stage

const SIZE_MIN     = 130     // card width in pixels
const SIZE_MAX     = 270

const ASPECT_MIN   = 1.15    // height/width ratio (portrait polaroid)
const ASPECT_MAX   = 1.40

/* 3-D Z travel — positive = toward viewer, negative = deep background */
const Z_SPAWN      =  600    // px — spawns in front of camera (off-screen)
const Z_END        = -1200   // px — dies far behind camera (tiny dot)

/* X / Y spawn in viewport-fraction units (can exceed 0-1 → off-screen) */
const X_MIN        = -0.15   // –15 vw
const X_MAX        =  1.15   // 115 vw
const Y_MIN        = -0.15
const Y_MAX        =  1.15

const ROT_MAX      = 7       // degrees of polaroid tilt
const LIFE_MIN     = 7       // seconds per card cycle (faster zoom-out)
const LIFE_MAX     = 12
const DELAY_MAX    = 3       // initial stagger spread (seconds)

/* Opacity envelope fractions (relative to card.life, after card.delay) */
const FADE_IN_END  = 0.08    // 0 → 1 while card is oversize / off-screen

const FADE_OUT_START = 0.74  // 1 → 0 as card vanishes into the deep

/* ── Math helpers ────────────────────────────────────────────────────── */
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp    = (a, b, t) => a + (b - a) * t
const rand    = (min, max) => min + Math.random() * (max - min)
const randInt = (n) => Math.floor(Math.random() * n)
const easeOutCubic    = (t) => 1 - Math.pow(1 - t, 3)
const easeInCubic     = (t) => t * t * t
const easeInOutCubic  = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/* ═══════════════════════════════════════════════════════════════════════ */
export default function GlimpsePage() {
  const stageRef  = useRef(null)
  const animIdRef = useRef(null)
  const [photos, setPhotos] = useState(FALLBACK_PHOTOS)

  // Load the real Cloudinary manifest once on mount.
  // Falls back silently to the seeded picsum pool if the JSON is missing.
  useEffect(() => {
    let cancelled = false
    fetch('/cloudinary-photos.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return
        setPhotos(data.map((d) => d.url).filter(Boolean))
      })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    // Snapshot the current photo list — re-run when the manifest resolves.
    const PHOTOS = photos

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* ── Viewport dimensions (updated on resize) ─────────────────────── */
    let W = stage.clientWidth  || window.innerWidth
    let H = stage.clientHeight || window.innerHeight

    const cards = []

    /* ── Assign fresh random parameters to a card ───────────────────── */
    const randomize = (card) => {
      card.w       = rand(SIZE_MIN, SIZE_MAX)
      card.h       = card.w * rand(ASPECT_MIN, ASPECT_MAX)

      /* Spawn position in px — mapped from vw/vh fractions */
      card.xFrac   = rand(X_MIN, X_MAX)
      card.yFrac   = rand(Y_MIN, Y_MAX)

      card.rot     = rand(-ROT_MAX, ROT_MAX)
      card.delay   = rand(0, DELAY_MAX)
      card.life    = rand(LIFE_MIN, LIFE_MAX)
      card.cycle   = card.delay + card.life
      card.age     = 0
      card.hover   = false

      /* Pick a different photo than the current one */
      let nextIdx
      do { nextIdx = randInt(PHOTOS.length) } while (nextIdx === card.imgIdx)
      card.imgIdx   = nextIdx
      card.img.src  = PHOTOS[nextIdx]

      /* If this is a mid-flight re-randomize, scatter start age so cards
         don't all sync up after looping. */
      if (card.mid) card.age = rand(0, card.cycle)
    }

    /* ── Write card dimensions & base X/Y to DOM ────────────────────── */
    const place = (card) => {
      /* Convert vw/vh fractions to px, centred on the card itself */
      card.x = card.xFrac * W - card.w * 0.5
      card.y = card.yFrac * H - card.h * 0.5

      card.el.style.width  = `${Math.round(card.w)}px`
      card.el.style.height = `${Math.round(card.h)}px`
    }

    /* ── Build one absolutely-positioned HUD card ───────────────────── */
    const buildCard = (i) => {
      const el  = document.createElement('div')
      el.className = 'glimpse-photo'

      /* Photo */
      const img = document.createElement('img')
      img.alt       = `Glimpse photo ${i + 1}`
      img.draggable = false
      img.loading   = 'lazy'
      img.decoding  = 'async'

      /* Four HUD corner brackets (CSS draws the L-shapes) */
      const corners = ['tl', 'tr', 'bl', 'br']
      const bracketEls = corners.map((pos) => {
        const b = document.createElement('span')
        b.className = `glimpse-corner glimpse-corner--${pos}`
        return b
      })

      /* HUD caption bar: label + scan-line coords */
      const cap = document.createElement('div')
      cap.className = 'glimpse-caption'

      const label = document.createElement('span')
      label.className   = 'glimpse-caption__label'
      const num = String((i % PHOTOS.length) + 1).padStart(2, '0')
      label.textContent = `GLM-${num}`

      const coords = document.createElement('span')
      coords.className = 'glimpse-caption__coords'
      // Randomised-looking coordinates that stay fixed for this card slot
      const cx = String(Math.floor(rand(100, 999))).padStart(3, '0')
      const cy = String(Math.floor(rand(100, 999))).padStart(3, '0')
      coords.textContent = `X:${cx} Y:${cy}`

      cap.appendChild(label)
      cap.appendChild(coords)

      el.appendChild(img)
      bracketEls.forEach((b) => el.appendChild(b))
      el.appendChild(cap)
      stage.appendChild(el)

      const card = {
        el, img,
        w: 0, h: 0,
        xFrac: 0, yFrac: 0,
        x: 0, y: 0,
        rot: 0,
        delay: 0, life: 0, cycle: 0, age: 0,
        imgIdx: -1, hover: false,
        seed: rand(0, 1000),
        mid: false,
        enter: null, leave: null,
      }

      card.enter = () => {
        card.hover = true
        card.el.style.zIndex = '500000'
      }
      card.leave = () => { card.hover = false }
      el.addEventListener('mouseenter', card.enter)
      el.addEventListener('mouseleave', card.leave)

      randomize(card)
      card.mid = true  // allow staggered re-entry on loop-backs

      /* Scatter initial ages so we get a full spread at first paint */
      card.age = rand(0, card.cycle)

      place(card)
      return card
    }

    for (let i = 0; i < CARD_COUNT; i++) cards.push(buildCard(i))

    /* ── Per-frame paint of a single card ───────────────────────────── */
    const paint = (card) => {
      /* Still in its stagger window — invisible, parked */
      if (card.age < card.delay) {
        card.el.style.opacity   = '0'
        card.el.style.transform =
          `translate3d(${card.x}px,${card.y}px,${Z_SPAWN}px)`
        return
      }

      const t = card.age - card.delay
      const p = clamp01(t / card.life)   // 0 → 1 over the card's lifetime

      /* ── Z depth: +600 (foreground) → -1200 (deep background) ─────── */
      const z = lerp(Z_SPAWN, Z_END, easeInCubic(p))

      /* ── Gentle sway on top of fixed rotation ──────────────────────── */
      const now  = t * 1000
      const sway = Math.sin(now * 0.00045 + card.seed) * 0.9
      const rx   = (card.rot + sway).toFixed(2)

      /* ── Opacity envelope ─────────────────────────────────────────── */
      let o
      if (p < FADE_IN_END) {
        /* Fade in from 0 → 1 while card is still oversized / out-of-frame */
        o = easeOutCubic(clamp01(p / FADE_IN_END))
      } else if (p > FADE_OUT_START) {
        /* Fade out as it recedes into the deep background */
        o = 1 - easeOutCubic(
          clamp01((p - FADE_OUT_START) / (1 - FADE_OUT_START))
        )
      } else {
        o = 1
      }

      /* ── z-index: cards further back sink behind nearer ones ────────── */
      const zi = card.hover
        ? 999999
        : Math.round(lerp(9000, 10, easeInCubic(p))) + 10

      card.el.style.transform =
        `translate3d(${card.x.toFixed(1)}px,${card.y.toFixed(1)}px,${z.toFixed(1)}px) rotateZ(${rx}deg)`
      card.el.style.opacity = o.toFixed(3)
      card.el.style.zIndex  = String(zi)
    }

    /* ── Main rAF loop ──────────────────────────────────────────────── */
    let running = false
    let prevT   = null

    const frame = (t) => {
      if (!running) return
      const dt = prevT === null ? 0 : Math.min(0.05, (t - prevT) / 1000)
      prevT = t

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        card.age += dt
        if (card.age >= card.cycle) {
          randomize(card)
          place(card)
        }
        paint(card)
      }
      animIdRef.current = requestAnimationFrame(frame)
    }

    /* ── Reduced-motion fallback: static scattered collage ──────────── */
    const staticPaint = () => {
      cards.forEach((card) => {
        card.el.style.opacity   = '1'
        card.el.style.zIndex    = String(50 + randInt(900))
        card.el.style.transform =
          `translate3d(${card.x}px,${card.y}px,0px) rotateZ(${card.rot}deg)`
      })
    }
    staticPaint()

    /* ── IntersectionObserver — pause when off-screen ───────────────── */
    let cleanup = () => {}
    if (!reduceMotion) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !running) {
            running = true
            prevT   = null
            animIdRef.current = requestAnimationFrame(frame)
          } else if (!entry.isIntersecting) {
            running = false
          }
        },
        { threshold: 0.01 },
      )
      observer.observe(stage)
      /* Kick off immediately if already on-screen */
      if (!running) {
        running = true
        prevT   = null
        animIdRef.current = requestAnimationFrame(frame)
      }
      cleanup = () => {
        running = false
        observer.disconnect()
        if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
      }
    }

    /* ── Resize handler ─────────────────────────────────────────────── */
    const onResize = () => {
      W = stage.clientWidth  || window.innerWidth
      H = stage.clientHeight || window.innerHeight
      cards.forEach(place)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cleanup()
      window.removeEventListener('resize', onResize)
      cards.forEach((card) => {
        card.el.removeEventListener('mouseenter', card.enter)
        card.el.removeEventListener('mouseleave', card.leave)
      })
      while (stage.firstChild) stage.removeChild(stage.firstChild)
    }
  }, [photos])

  return (
    <motion.section
      initial={{ opacity: 0, y: 60, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.12 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      className="relative w-full min-h-screen overflow-hidden"
      style={{ background: '#030712' }}
      aria-label="Glimpse photo gallery"
    >
      {/*
       * ── 3-D Stage ──────────────────────────────────────────────────
       * perspective: 1000px  sets up the virtual camera distance.
       * transform-style: preserve-3d  lets children live in the same
       * 3-D space so their translateZ values are projected correctly.
       * overflow: hidden  clips cards that extend beyond the viewport.
       */}
      <div
        ref={stageRef}
        className="absolute inset-0"
        style={{
          perspective:       '1000px',
          perspectiveOrigin: '50% 50%',
          transformStyle:    'preserve-3d',
          overflow:          'hidden',
        }}
      />

      {/*
       * ── Edge vignettes ─────────────────────────────────────────────
       * z-index 600 keeps them above photo cards (max ~9010) but below
       * the heading (10000).
       */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[14vh]"
        style={{
          background: 'linear-gradient(180deg, #030712 0%, rgba(3,7,18,0) 100%)',
          zIndex: 600,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[14vh]"
        style={{
          background: 'linear-gradient(0deg, #030712 0%, rgba(3,7,18,0) 100%)',
          zIndex: 600,
        }}
      />

      {/*
       * ── "GLIMPSE" heading ──────────────────────────────────────────
       * position: relative + z-index: 10000 ensures the title always
       * floats above photo cards regardless of their computed z-index.
       * pointer-events: none lets clicks pass through to cards beneath.
       */}
      <div
        className="relative flex flex-col items-center pointer-events-none"
        style={{ paddingTop: '3.25rem', zIndex: 10000 }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="voxel-3d-text voxel-white-block font-pixel font-black uppercase text-center select-none"
          style={{ fontSize: 'clamp(2.6rem, 6.5vw, 4.6rem)', letterSpacing: '0.14em', lineHeight: 1 }}
        >
          Glimpse
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="mt-3 font-pixel text-sm text-cyan-300/80 tracking-widest uppercase"
        >
          ◈ A scattered wall of memories ◈
        </motion.p>
      </div>
    </motion.section>
  )
}
