/**
 * TeamPage.jsx  (v3 — Clean Arcade Crew Roster)
 *
 * Style goals:
 *   • Matches the chamfered clip-path panels used across the site
 *   • Minimal content — name + role only, no fluff
 *   • Conveyors vs Coordinators differentiated by size + accent only
 *   • No decorative dot grids, no glow halos, no scanline overlays
 *   • Subtle warm hover, lanyard detail kept for physicality
 */

import { useRef, useCallback, useState, useEffect } from 'react'
import { motion } from 'framer-motion'

/* ─────────────────────────────────────────────────────────────────────── */
/*  DATA                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */
const CONVENERS = [
  {
    name: 'Dr. Pradeep Jha',
    role: 'Lead Visionary',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=530&fit=crop&crop=face',
    accentColor: '#f5c344',
    tilt: -2,
  },
  {
    name: 'Pankaj Jain',
    role: 'Strategic Mind',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=530&fit=crop&crop=face',
    accentColor: '#fb923c',
    tilt: 2,
  },
]

const COORDINATORS = [
  { name: 'Aryan Mehta',   role: 'Logistics Lead',        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=530&fit=crop&crop=face', accentColor: '#fbbf24', tilt: -1.5 },
  { name: 'Sneha Rao',     role: 'Tech Ops',              photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=530&fit=crop&crop=face', accentColor: '#f59e0b', tilt: 2 },
  { name: 'Rohan Verma',   role: 'Experience Manager',    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=530&fit=crop&crop=face', accentColor: '#f5c344', tilt: -2 },
  { name: 'Priya Sharma',  role: 'Outreach Commander',    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=530&fit=crop&crop=face', accentColor: '#fb923c', tilt: 1.5 },
  { name: 'Kabir Nair',    role: 'Content Strategist',    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=530&fit=crop&crop=face', accentColor: '#fbbf24', tilt: -1 },
]

/* ─────────────────────────────────────────────────────────────────────── */
/*  ARCADE PILL (page section badge — same vocabulary as Page 1)          */
/* ─────────────────────────────────────────────────────────────────────── */
function ArcadePill({ children }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '5px 16px', borderRadius: 999,
      background: 'rgba(245,195,68,0.12)',
      border: '2px solid rgba(245,195,68,0.45)',
      boxShadow: '0 3px 0 rgba(179,130,23,0.5), 0 6px 18px rgba(245,195,68,0.12)',
      marginBottom: 10,
    }}>
      <span className="font-pixel text-arcadeYellow tracking-widest uppercase" style={{ fontSize: 10 }}>
        {children}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  SECTION HEADER                                                          */
/* ─────────────────────────────────────────────────────────────────────── */
function SectionHeader({ title }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="text-center mb-10"
    >
      <ArcadePill>// {title}</ArcadePill>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  WARM RULE                                                               */
/* ─────────────────────────────────────────────────────────────────────── */
function WarmRule() {
  return (
    <div className="flex items-center gap-4 my-14 max-w-2xl mx-auto px-6">
      <div className="flex-1 h-px"
        style={{ background: 'linear-gradient(90deg,transparent,rgba(245,195,68,0.35))' }} />
      <span className="font-pixel text-arcadeYellow/40 tracking-widest text-[9px] uppercase">
        ★ ★ ★
      </span>
      <div className="flex-1 h-px"
        style={{ background: 'linear-gradient(90deg,rgba(245,195,68,0.35),transparent)' }} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  CLEAN ARCADE BADGE CARD                                                 */
/*                                                                          */
/*  One card. One photo. One name. One role. Nothing else.                 */
/* ─────────────────────────────────────────────────────────────────────── */
function BadgeCard({ member, delay = 0, large = false }) {
  const cardRef  = useRef(null)
  const frameRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const ac = member.accentColor

  const onMouseMove = useCallback(e => {
    const card = cardRef.current; if (!card) return
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const { left, top, width, height } = card.getBoundingClientRect()
      const x = (e.clientX - left) / width  - 0.5
      const y = (e.clientY - top)  / height - 0.5
      card.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) rotate(${member.tilt}deg)`
    })
  }, [member.tilt])

  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    const card = cardRef.current; if (!card) return
    card.style.transition = 'transform 0.45s cubic-bezier(0.23,1,0.32,1)'
    card.style.transform  = `rotate(${member.tilt}deg)`
    setTimeout(() => { if (card) card.style.transition = '' }, 460)
    setHovered(false)
  }, [member.tilt])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const cardW  = large ? 'w-56 sm:w-64' : 'w-48 sm:w-52'
  const padY   = large ? '18px' : '14px'
  const lanyardH = large ? 28 : 20

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`${cardW} flex-shrink-0`}
    >
      {/* Lanyard clip */}
      <div className="flex justify-center">
        <div style={{
          width: 2, height: lanyardH,
          background: `linear-gradient(to bottom, transparent, ${ac}80)`,
          borderRadius: 1,
        }} />
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onMouseEnter={() => setHovered(true)}
        style={{
          transform: `rotate(${member.tilt}deg)`,
          clipPath: 'polygon(12px 0%,calc(100% - 12px) 0%,100% 12px,100% calc(100% - 12px),calc(100% - 12px) 100%,12px 100%,0% calc(100% - 12px),0% 12px)',
          background: 'rgba(2,8,23,0.55)',
          backdropFilter: 'blur(12px)',
          border: `1.5px solid ${hovered ? ac : ac + '55'}`,
          boxShadow: hovered
            ? `0 0 0 1px ${ac}40, 0 12px 28px rgba(0,0,0,0.6)`
            : `0 0 0 1px ${ac}18, 0 8px 22px rgba(0,0,0,0.5)`,
          transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
          cursor: 'default',
        }}
      >
        {/* Top accent strip */}
        <div style={{
          height: 2,
          background: `linear-gradient(90deg, transparent, ${ac}, transparent)`,
        }} />

        {/* Photo */}
        <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: '#0a0804' }}>
          <img
            src={member.photo}
            alt={member.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
            loading="lazy"
          />
        </div>

        {/* Info — name + role only */}
        <div style={{ padding: `${padY} 16px`, textAlign: 'center' }}>
          <h3 className="font-pixel font-black uppercase tracking-wide"
            style={{
              fontSize: large ? '0.95rem' : '0.8rem',
              color: '#f8fafc',
              lineHeight: 1.2,
              marginBottom: 6,
            }}>
            {member.name}
          </h3>
          <p style={{
            fontFamily: '"Silkscreen", monospace',
            fontSize: 9,
            color: ac,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {member.role}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  PAGE                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */
export default function TeamPage() {
  return (
    <div className="relative min-h-screen w-full py-24 px-6">

      <div className="relative z-10 max-w-5xl mx-auto">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-20"
        >
          <h1
            className="voxel-3d-text voxel-white-block font-pixel font-black uppercase text-center"
            style={{ fontSize: 'clamp(2.8rem,7vw,5rem)', marginTop: 4 }}
          >
            The Team
          </h1>
          <p style={{ color: 'rgba(203,193,170,0.55)', fontSize: 14, maxWidth: 420,
            margin: '14px auto 0', lineHeight: 1.6 }}>
            The crew that architects, powers, and launches Codefiesta every year.
          </p>
        </motion.div>

        {/* ══ CONVENERS ══ */}
        <SectionHeader title="Conveners" />
        <div className="flex flex-wrap justify-center gap-12">
          {CONVENERS.map((m, i) => (
            <BadgeCard key={m.name} member={m} delay={0.08 + i * 0.12} large />
          ))}
        </div>

        <WarmRule />

        {/* ══ COORDINATORS ══ */}
        <SectionHeader title="Coordinators" />

        <div className="flex flex-wrap justify-center gap-8">
          {COORDINATORS.map((m, i) => (
            <BadgeCard key={m.name} member={m} delay={0.06 + i * 0.08} />
          ))}
        </div>

      </div>
    </div>
  )
}
