/**
 * PrizePoolPage.jsx  (v3 — interactive animations)
 *
 * On top of the previous polish (hover lift, pulse-glow hero, counters,
 * pill tags) this version adds:
 *
 *  1. 3-D CURSOR TILT — card rotates up to ±12 ° toward the mouse position
 *     using perspective + rotateX/rotateY via vanilla JS mouse tracking.
 *
 *  2. SHINE SWEEP — a radial gradient highlight follows the cursor inside
 *     the card, giving a holographic "light bouncing off glass" feel.
 *
 *  3. CLICK BURST — rapid scale punch (1 → 1.06 → 1) + an expanding ring
 *     ripple centred on the click point.
 *
 *  4. HOVER SPARK SPRAY — on mouseenter, 6 tiny sparks fly outward from the
 *     card in random directions and fade out.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Counter hook ─────────────────────────────────────────────────────── */
function useCounter(target, duration = 1800, active = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const e = 1 - (1 - p) * (1 - p)   // ease-out-quad
      setValue(Math.floor(e * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return `₹${value.toLocaleString('en-IN')}`
}

/* ── Data ─────────────────────────────────────────────────────────────── */
const SPECIAL_TAGS    = ['Best UI/UX', 'Most Innovative', 'Best Use of AI']
const INTERNSHIP_TAGS = ['Career Growth', 'Tech Companies', 'Real Projects']

const PRIZES = [
  {
    title: 'Grand Cash Pool',
    amount: 150000,
    color: '#fbbf24',
    glowColor: 'rgba(234,179,8,0.32)',
    borderHover: '#fbbf24',
  },
  {
    title: 'Special Categories',
    tags: SPECIAL_TAGS,
    color: '#a855f7',
    glowColor: 'rgba(168,85,247,0.28)',
    borderHover: '#a855f7',
  },
  {
    title: 'Internship Opportunities',
    tags: INTERNSHIP_TAGS,
    color: '#22d3ee',
    glowColor: 'rgba(34,211,238,0.25)',
    borderHover: '#22d3ee',
  },
  {
    title: 'Swag & Goodies',
    label: 'For Everyone',
    subtitle: 'T-shirts, stickers, and exclusive merchandise',
    color: '#34d399',
    glowColor: 'rgba(52,211,153,0.25)',
    borderHover: '#34d399',
  },
]

/* ── Background particles ─────────────────────────────────────────────── */
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${(i * 8.3) % 100}%`,
            top: `${(i * 13.7) % 100}%`,
            backgroundColor: ['#fbbf24','#a855f7','#22d3ee','#34d399'][i % 4],
            boxShadow: `0 0 8px ${['#fbbf24','#a855f7','#22d3ee','#34d399'][i % 4]}`,
          }}
          animate={{ y:[0,-30,0], opacity:[0.2,0.8,0.2], scale:[1,1.5,1] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  )
}

/* ── Pill tag ─────────────────────────────────────────────────────────── */
function PillTag({ text, color }) {
  return (
    <span
      className="prize-pill-tag"
      style={{
        '--pill-color': color,
        '--pill-bg':    `${color}18`,
        '--pill-border':`${color}44`,
        '--pill-glow':  `${color}55`,
        '--pill-glow-hover': `${color}99`,
      }}
    >
      {text}
    </span>
  )
}

/* ── Hover spark spray ────────────────────────────────────────────────── */
function SparkBurst({ color, active }) {
  const sparks = [0,1,2,3,4,5]
  const angles = sparks.map((i) => (i / sparks.length) * 360)

  return (
    <AnimatePresence>
      {active && sparks.map((i) => {
        const angle = angles[i]
        const rad   = (angle * Math.PI) / 180
        const dist  = 28 + Math.random() * 18
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: Math.cos(rad) * dist,
              y: Math.sin(rad) * dist,
              scale: 0.3,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}`,
              pointerEvents: 'none',
              zIndex: 20,
            }}
          />
        )
      })}
    </AnimatePresence>
  )
}

/* ── Click ring ripple ────────────────────────────────────────────────── */
function RippleEffect({ ripples, color }) {
  return (
    <>
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          initial={{ opacity: 0.7, scale: 0, x: r.x - 40, y: r.y - 40 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            boxShadow: `0 0 10px ${color}88`,
            pointerEvents: 'none',
            zIndex: 15,
          }}
        />
      ))}
    </>
  )
}

/* ── Interactive prize card ───────────────────────────────────────────── */
function PrizeCard({ prize, index, counterActive }) {
  const cardRef      = useRef(null)
  const shineRef     = useRef(null)
  const frameRef     = useRef(null)

  const [sparking, setSparking]   = useState(false)
  const [ripples,  setRipples]    = useState([])
  const [punching, setPunching]   = useState(false)

  const counterVal = useCounter(prize.amount ?? 0, 1800, counterActive && !!prize.amount)

  /* ── 3-D tilt + shine on mouse move ─────────────────────────────── */
  const onMouseMove = useCallback((e) => {
    const card = cardRef.current
    if (!card) return

    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const { left, top, width, height } = card.getBoundingClientRect()
      const x = (e.clientX - left) / width   // 0-1
      const y = (e.clientY - top)  / height  // 0-1

      const rotX =  (y - 0.5) * -22   // tilt up/down ±11°
      const rotY =  (x - 0.5) *  22   // tilt left/right ±11°

      card.style.transform =
        `perspective(700px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-6px) scale(1.02)`

      /* Shine: radial gradient follows cursor */
      if (shineRef.current) {
        shineRef.current.style.background =
          `radial-gradient(circle at ${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%,` +
          `rgba(255,255,255,0.13) 0%, transparent 65%)`
        shineRef.current.style.opacity = '1'
      }
    })
  }, [])

  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    const card = cardRef.current
    if (card) {
      card.style.transition = 'transform 0.5s ease, box-shadow 0.3s ease'
      card.style.transform  = ''
      setTimeout(() => { if (card) card.style.transition = '' }, 500)
    }
    if (shineRef.current) shineRef.current.style.opacity = '0'
  }, [])

  /* ── Spark burst on hover enter ─────────────────────────────────── */
  const onMouseEnter = useCallback(() => {
    setSparking(true)
    setTimeout(() => setSparking(false), 550)
  }, [])

  /* ── Click burst (scale punch + ring ripple) ─────────────────────── */
  const onClick = useCallback((e) => {
    const card = cardRef.current
    if (!card) return

    /* Scale punch */
    setPunching(true)
    setTimeout(() => setPunching(false), 220)

    /* Ring ripple at click position relative to card */
    const { left, top } = card.getBoundingClientRect()
    const rx = e.clientX - left
    const ry = e.clientY - top
    const id = Date.now() + Math.random()
    setRipples((prev) => [...prev, { id, x: rx, y: ry }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 650)
  }, [])

  /* Cleanup rAF on unmount */
  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      animate={punching ? { scale: 1.06 } : { scale: 1 }}
    >
      <div
        ref={cardRef}
        className="prize-grid-card group"
        style={{
          '--card-color':        prize.color,
          '--card-glow':         prize.glowColor,
          '--card-border-hover': prize.borderHover,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          willChange: 'transform',
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
      >
        {/* Shine overlay */}
        <span
          ref={shineRef}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease',
            zIndex: 10,
          }}
        />

        {/* Ripple rings */}
        <RippleEffect ripples={ripples} color={prize.color} />

        {/* Spark burst */}
        <SparkBurst color={prize.color} active={sparking} />

        {/* ── Card content ── */}
        <div style={{ position: 'relative', zIndex: 5 }}>

          {/* Top accent line */}
          <div
            className="prize-card-accent-line"
            style={{ background: `linear-gradient(90deg, ${prize.color}, transparent)` }}
          />

          {/* Title */}
          <h3
            className="font-pixel text-base font-bold mb-3 uppercase tracking-wider"
            style={{ color: prize.color }}
          >
            {prize.title}
          </h3>

          {/* Counted amount */}
          {prize.amount != null && (
            <div
              className="font-pixel text-2xl font-black mb-3"
              style={{
                color: prize.color,
                textShadow: `0 0 12px ${prize.color}88, 0 0 24px ${prize.color}44`,
              }}
            >
              {counterActive ? counterVal : '₹0'}
            </div>
          )}

          {/* Label badge (Swag card) */}
          {prize.label && (
            <div
              className="inline-block px-3 py-1 rounded-full font-pixel text-xs mb-3 uppercase tracking-widest"
              style={{
                backgroundColor: `${prize.color}22`,
                color: prize.color,
                border: `1px solid ${prize.color}44`,
              }}
            >
              {prize.label}
            </div>
          )}

          {/* Pill tags */}
          {prize.tags && (
            <div className="flex flex-wrap gap-2 mb-3">
              {prize.tags.map((tag) => (
                <PillTag key={tag} text={tag} color={prize.color} />
              ))}
            </div>
          )}

          {/* Subtitle */}
          {prize.subtitle && (
            <p className="text-sm text-slate-400 leading-relaxed">{prize.subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function PrizePoolPage() {
  const sectionRef       = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold: 0.25 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const heroCounter = useCounter(700000, 2000, inView)

  return (
    <div ref={sectionRef} className="relative min-h-screen w-full py-20 px-6 overflow-hidden">

      <FloatingParticles />

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div className="inline-block mb-3 px-4 py-2 rounded-full border border-yellow-400/30 bg-yellow-500/10 backdrop-blur-md">
            <span className="font-pixel text-xs text-yellow-300 tracking-widest uppercase">
              Rewards & Recognition
            </span>
          </motion.div>

          <h1
            className="voxel-3d-text voxel-white-block font-pixel font-black uppercase text-center mb-4"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}
          >
            Prize Pool
          </h1>

          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Turn your ideas into reality and win amazing prizes including cash prize
          </p>

          {/* Hero card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative inline-block"
          >
            <div className="prize-hero-card">
              <div className="flex flex-col items-center gap-3">
                <span className="font-pixel text-sm text-yellow-300/70 tracking-widest uppercase">
                  Total Prize Worth
                </span>
                <div
                  className="font-pixel font-black text-yellow-400 prize-hero-amount"
                  style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', lineHeight: 1 }}
                >
                  {inView ? heroCounter : '₹0'}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PRIZES.map((prize, i) => (
            <PrizeCard key={i} prize={prize} index={i} counterActive={inView} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center mt-16"
        >
          <p className="font-pixel text-xs text-cyan-300/60 tracking-widest uppercase">
            ◈ Build • Innovate • Win ◈
          </p>
        </motion.div>

      </div>
    </div>
  )
}
