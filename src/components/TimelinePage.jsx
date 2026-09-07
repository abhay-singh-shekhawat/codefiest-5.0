/**
 * TimelinePage.jsx — Semicircular Timeline with Cover + Hold
 *
 * Flow:
 *   1. COVER PHASE: Timeline section slides up from bottom over the theme page
 *      (normal document flow, 100vh tall cover area)
 *   2. HOLD PHASE: Once timeline covers 100% of viewport, circular scroll activates.
 *      Scroll drives the arc rotation. Page appears frozen.
 *   3. EXIT: After all milestones shown, timeline scrolls away, prize pool appears.
 *
 * Background uses the global StarBackground (no solid gradient).
 */

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TIMELINE = [
  { date: '8:00 AM',  title: 'Team Registration',   detail: 'Check in your squad, collect your badges, and get your workstations set up. The clock is already ticking.',                                color: '#00f5ff', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80' },
  { date: '10:00 AM', title: 'Opening Ceremony',     detail: 'Welcome address, sponsor introductions, and the official flag-off. Problem statements are revealed — let the hacking begin.',              color: '#a855f7', image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80' },
  { date: '11:00 AM', title: 'Hackathon Begins',     detail: 'Keyboards hot, ideas flowing. The 12-hour build sprint is live. Mentors are on standby.',                                                  color: '#22d3ee', image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&q=80' },
  { date: '2:00 PM',  title: 'Mentor Sessions',      detail: 'Round-robin expert consultations. Get your architecture reviewed, unblock bottlenecks, and sharpen your pitch.',                           color: '#f59e0b', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80' },
  { date: '4:00 PM',  title: 'Coffee Break',         detail: 'Fuel up. Step away from the screen, recharge, and come back stronger for the final push.',                                                 color: '#fb923c', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80' },
  { date: '5:00 PM',  title: 'Workshop',             detail: 'Live deep-dive session on a high-impact tech topic. Integrate fresh knowledge directly into your project.',                                 color: '#34d399', image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80' },
  { date: '9:00 PM',  title: 'Networking Session',   detail: 'Mingle with industry professionals, fellow hackers, and sponsors. Make connections that outlast the hackathon.',                           color: '#f43f5e', image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80' },
  { date: '11:00 PM', title: 'Progress Check',       detail: 'Final milestone review before submission. Lock in your build, polish your demo, and prep for judging.',                                    color: '#fbbf24', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80' },
]

const COUNT = TIMELINE.length

// Arc geometry
const ARC_RADIUS = 260
const ARC_CX = 50
const ARC_CY_RATIO = 0.5
const ARC_SPAN_DEG = 280
const ARC_START_DEG = -ARC_SPAN_DEG / 2

// Scroll space for circular rotation
const CIRCULAR_SCROLL_PX = COUNT * 550
// Extra scroll space after the arc finishes before Glimpse slides in.
// One full viewport ensures item 8 is fully visible before Glimpse covers it.
const POST_ARC_BUFFER = typeof window !== 'undefined' ? window.innerHeight : 800

export default function TimelinePage() {
  const sentinelRef = useRef(null)
  const [pinned, setPinned] = useState(false)
  const [progress, setProgress] = useState(0)
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 800)
  const [panelOpacity, setPanelOpacity] = useState(0)
  const unpinTimerRef = useRef(null)

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Scroll handler ────────────────────────────────────────────────────
  useEffect(() => {
    function onScroll() {
      const sentinel = sentinelRef.current
      if (!sentinel) return

      const sentinelTop = sentinel.getBoundingClientRect().top + window.scrollY
      const scrollY = window.scrollY

      // The ThemesPage is sticky and sits on top as a cover card.
      // Start the overlay half a viewport BEFORE the sentinel top so it's
      // already visible the instant Themes finishes scrolling off screen.
      const viewH    = window.innerHeight
      const pinStart = sentinelTop - viewH * 0.5   // overlay appears here
      const pinEnd   = sentinelTop + CIRCULAR_SCROLL_PX + POST_ARC_BUFFER

      if (scrollY >= pinStart && scrollY < pinEnd) {
        if (!pinned) {
          if (unpinTimerRef.current) { clearTimeout(unpinTimerRef.current); unpinTimerRef.current = null }
          setPinned(true)
          setPanelOpacity(1)
        }
        // Arc rotation only counts from the true sentinel top
        const p = Math.min(1, Math.max(0, (scrollY - sentinelTop) / CIRCULAR_SCROLL_PX))
        setProgress(p)
      } else {
        if (pinned) {
          setPanelOpacity(0)
          if (!unpinTimerRef.current) {
            unpinTimerRef.current = setTimeout(() => {
              setPinned(false)
              unpinTimerRef.current = null
            }, 300)
          }
        }
        if (scrollY < pinStart) setProgress(0)
        else setProgress(1)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (unpinTimerRef.current) clearTimeout(unpinTimerRef.current)
    }
  }, [pinned])

  // ── Geometry ──────────────────────────────────────────────────────────
  const rotationOffset = ARC_START_DEG + progress * ARC_SPAN_DEG
  const arcCY = vh * ARC_CY_RATIO

  const items = TIMELINE.map((item, i) => {
    const baseAngleDeg = ARC_START_DEG + (i / (COUNT - 1)) * ARC_SPAN_DEG
    const angleDeg = baseAngleDeg - rotationOffset
    const angleRad = (angleDeg * Math.PI) / 180
    const x = ARC_CX + ARC_RADIUS * Math.cos(angleRad)
    const y = arcCY + ARC_RADIUS * Math.sin(angleRad)
    const centerDist = Math.abs(angleDeg)
    const normalizedDist = centerDist / (ARC_SPAN_DEG / 2)
    const isActive = normalizedDist < 0.1
    const scale = isActive ? 1 : Math.max(0.35, 1 - normalizedDist * 0.7)
    const opacity = isActive ? 1 : Math.max(0.12, 1 - normalizedDist * 1.3)
    const visible = angleDeg > -ARC_SPAN_DEG * 0.65 && angleDeg < ARC_SPAN_DEG * 0.65
    return { ...item, x, y, angleDeg, scale, opacity, isActive, visible, index: i }
  })

  const activeItem = items.find(it => it.isActive) || items.reduce((closest, it) =>
    Math.abs(it.angleDeg) < Math.abs(closest.angleDeg) ? it : closest
  )

  const arcPathD = (() => {
    const startRad = (ARC_START_DEG * Math.PI) / 180
    const endRad = ((ARC_START_DEG + ARC_SPAN_DEG) * Math.PI) / 180
    const x1 = ARC_CX + ARC_RADIUS * Math.cos(startRad)
    const y1 = arcCY + ARC_RADIUS * Math.sin(startRad)
    const x2 = ARC_CX + ARC_RADIUS * Math.cos(endRad)
    const y2 = arcCY + ARC_RADIUS * Math.sin(endRad)
    return `M ${x1} ${y1} A ${ARC_RADIUS} ${ARC_RADIUS} 0 ${ARC_SPAN_DEG > 180 ? 1 : 0} 1 ${x2} ${y2}`
  })()

  // ── Timeline panel content ───────────────────────────────────────────
  const renderContent = () => (
    <div className="w-full h-full overflow-hidden" style={{ background: 'transparent' }}>
      {/* Header */}
      <div className="absolute inset-x-0 top-0 z-30 text-center pt-8 pointer-events-none">
        <h1 className="voxel-3d-text voxel-white-block font-pixel font-black uppercase"
          style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)' }}>
          Event Timeline
        </h1>
        <p className="mt-2 font-pixel text-xs text-cyan-300/70 tracking-widest uppercase">
          ◈ 8 AM to 11 PM. One Day. One Mission. ◈
        </p>
      </div>

      {/* SVG arc + dots */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <path d={arcPathD} fill="none" stroke="url(#arcGrad)" strokeWidth="1.5" opacity="0.35" />
            {items.filter(it => it.visible).map((it) => (
              <g key={it.index}>
                <circle cx={it.x} cy={it.y} r={it.isActive ? 5 : 3} fill={it.isActive ? it.color : '#475569'} opacity={it.opacity} />
                {it.isActive && (
                  <circle cx={it.x} cy={it.y} r="10" fill="none" stroke={it.color} strokeWidth="1.5" opacity="0.5">
                    <animate attributeName="r" values="8;16;8" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            ))}
          </svg>

      {/* Numbers along arc */}
          {items.filter(it => it.visible).map((it) => {
            const num = String(it.index + 1).padStart(2, '0')
            return (
              <div key={it.index} className="absolute pointer-events-none select-none"
                style={{
                  left: it.x, top: it.y,
                  transform: `translate(-50%, -50%) scale(${it.scale})`,
                  opacity: it.opacity,
                  transition: 'transform 0.12s ease-out, opacity 0.12s ease-out',
                  zIndex: 15,
                }}>
                <span className="font-pixel font-black block" style={{
                  fontSize: it.isActive ? '3.5rem' : '1.8rem',
                  color: it.isActive ? it.color : '#475569',
                  textShadow: it.isActive ? `0 0 30px ${it.color}66, 0 0 60px ${it.color}33` : 'none',
                  lineHeight: 1,
                }}>{num}</span>
              </div>
            )
          })}

      {/* Active item detail */}
          <AnimatePresence mode="wait">
            {activeItem && (
              <motion.div key={activeItem.index}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                className="absolute pointer-events-none"
                style={{ left: `calc(${ARC_CX + ARC_RADIUS + 150}px)`, top: '33%', transform: 'translateY(-50%)', maxWidth: '380px', zIndex: 25 }}>

                {/* ── Timeline image ── */}
                <div
                  className="relative mb-4 rounded-lg overflow-hidden"
                  style={{
                    width: '100%',
                    height: '180px',
                    border: `1px solid ${activeItem.color}44`,
                    boxShadow: `0 0 20px ${activeItem.color}22, 0 4px 24px rgba(0,0,0,0.6)`,
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeItem.index}
                      src={activeItem.image}
                      alt={activeItem.title}
                      initial={{ opacity: 0, scale: 1.06 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                      }}
                      draggable={false}
                    />
                  </AnimatePresence>
                  {/* Color tint overlay matching milestone color */}
                  <div
                    style={{
                      position: 'absolute', inset: 0,
                      background: `linear-gradient(135deg, ${activeItem.color}18 0%, transparent 60%)`,
                      pointerEvents: 'none',
                    }}
                  />
                  {/* HUD corner brackets */}
                  {[['top-1 left-1','border-t border-l'],['top-1 right-1','border-t border-r'],
                    ['bottom-1 left-1','border-b border-l'],['bottom-1 right-1','border-b border-r']].map(([pos, borders]) => (
                    <div key={pos} className={`absolute ${pos} w-3 h-3 ${borders}`}
                      style={{ borderColor: `${activeItem.color}99` }} />
                  ))}
                </div>

                {/* ── Text content ── */}
                <div className="inline-block px-3 py-1 rounded-full font-pixel text-[10px] tracking-widest uppercase mb-3"
                  style={{ backgroundColor: `${activeItem.color}18`, color: activeItem.color, border: `1px solid ${activeItem.color}44` }}>
                  {activeItem.date}
                </div>
                <h2 className="font-pixel font-black uppercase mb-3"
                  style={{ fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', color: '#ffffff', lineHeight: 1.1 }}>
                  {activeItem.title}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{activeItem.detail}</p>
                <div className="mt-4 h-0.5 rounded-full"
                  style={{ width: '60px', background: activeItem.color, boxShadow: `0 0 12px ${activeItem.color}88` }} />
              </motion.div>
            )}
          </AnimatePresence>

      {/* Scroll hint */}
          {progress < 0.02 && (
            <div className="absolute bottom-8 inset-x-0 text-center z-30 pointer-events-none">
              <motion.p animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="font-mono text-[10px] tracking-widest uppercase"
                style={{ color: 'rgba(0,245,255,0.4)' }}>
                ↓ Scroll to explore milestones ↓
              </motion.p>
            </div>
          )}

      {/* Progress bar */}
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-800/50 z-30">
            <div className="h-full" style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #00f5ff, #a855f7, #f59e0b)',
              boxShadow: '0 0 8px rgba(0,245,255,0.4)',
            }} />
          </div>
    </div>
  )

  return (
    <>
      {/* Sentinel: scroll space for circular rotation + post-arc buffer.
          The extra POST_ARC_BUFFER ensures Glimpse only slides in after
          item 8 has been fully visible at the arc center. */}
      <div ref={sentinelRef} style={{ height: `${CIRCULAR_SCROLL_PX + POST_ARC_BUFFER}px` }} />

      {/* Fixed overlay: full timeline appears when sentinel reaches viewport top */}
      {(pinned || panelOpacity > 0) && (
        <div className="fixed inset-0 z-40" style={{
          top: 0, left: 0, width: '100vw', height: '100vh',
          opacity: panelOpacity,
          pointerEvents: panelOpacity < 0.1 ? 'none' : 'auto',
        }}>
          {renderContent()}
        </div>
      )}
    </>
  )
}
