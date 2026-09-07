import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

/**
 * MagneticCursor
 * ─────────────────────────────────────────────────────────────────────────
 * Renders two layers fixed to the viewport:
 *
 *  1. A small "dot" that snaps exactly to the mouse (no lag).
 *  2. A larger "ring" that follows with a spring (buttery lag).
 *
 * When the cursor enters an element with  data-cursor="magnify"
 * the ring expands into a glowing magnifier circle and the hovered
 * element receives a CSS scale-up via a class toggle.
 *
 * Usage:
 *   • Mount <MagneticCursor /> once in App (outside everything else).
 *   • Add  data-cursor="magnify"  to any element you want the effect on.
 */
export default function MagneticCursor() {
  const [magnify, setMagnify] = useState(false)
  const [visible, setVisible] = useState(false)

  // Raw mouse position (no spring — for the dot)
  const rawX = useMotionValue(-100)
  const rawY = useMotionValue(-100)

  // Springy position for the ring
  const springCfg = { stiffness: 180, damping: 22, mass: 0.6 }
  const ringX = useSpring(rawX, springCfg)
  const ringY = useSpring(rawY, springCfg)

  // Ring size spring
  const ringSize = useSpring(28, { stiffness: 220, damping: 24 })
  const ringOpacity = useSpring(0.55, { stiffness: 200, damping: 20 })

  const magnifyTargetRef = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      rawX.set(e.clientX)
      rawY.set(e.clientY)
      if (!visible) setVisible(true)
    }

    const onEnter = (e) => {
      const el = e.target.closest('[data-cursor]')
      if (!el) return
      const mode = el.dataset.cursor

      if (mode === 'magnify') {
        setMagnify(true)
        ringSize.set(110)
        ringOpacity.set(0.85)
        magnifyTargetRef.current = el
        el.classList.add('cursor-magnify-active')
      }
    }

    const onLeave = (e) => {
      const el = e.target.closest('[data-cursor]')
      if (!el) return
      setMagnify(false)
      ringSize.set(28)
      ringOpacity.set(0.55)
      if (magnifyTargetRef.current) {
        magnifyTargetRef.current.classList.remove('cursor-magnify-active')
        magnifyTargetRef.current = null
      }
    }

    const onMouseLeaveDoc = () => setVisible(false)
    const onMouseEnterDoc = () => setVisible(true)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onEnter)
    window.addEventListener('mouseout',  onLeave)
    document.documentElement.addEventListener('mouseleave', onMouseLeaveDoc)
    document.documentElement.addEventListener('mouseenter', onMouseEnterDoc)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onEnter)
      window.removeEventListener('mouseout',  onLeave)
      document.documentElement.removeEventListener('mouseleave', onMouseLeaveDoc)
      document.documentElement.removeEventListener('mouseenter', onMouseEnterDoc)
    }
  }, [rawX, rawY, ringSize, ringOpacity, visible])

  if (typeof window === 'undefined') return null

  return (
    <>
      {/* ── Dot — snaps instantly ── */}
      <motion.div
        className="pointer-events-none fixed z-[9999] rounded-full"
        style={{
          x: rawX,
          y: rawY,
          translateX: '-50%',
          translateY: '-50%',
          width:  magnify ? 6 : 7,
          height: magnify ? 6 : 7,
          backgroundColor: magnify ? '#fbbf24' : '#ffffff',
          opacity: visible ? 1 : 0,
          mixBlendMode: 'difference',
          transition: 'width 0.15s, height 0.15s, background-color 0.15s',
        }}
      />

      {/* ── Ring — spring lag ── */}
      <motion.div
        className="pointer-events-none fixed z-[9998] rounded-full"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          width:  ringSize,
          height: ringSize,
          opacity: visible ? ringOpacity : 0,
          border: magnify
            ? '2px solid rgba(251,191,36,0.9)'
            : '1.5px solid rgba(255,255,255,0.55)',
          backgroundColor: magnify
            ? 'rgba(251,191,36,0.06)'
            : 'transparent',
          boxShadow: magnify
            ? '0 0 32px 8px rgba(251,191,36,0.18), inset 0 0 18px 4px rgba(251,191,36,0.10)'
            : 'none',
          backdropFilter: magnify ? 'blur(2px)' : 'none',
        }}
      >
        {/* Magnifier lens cross-hairs */}
        {magnify && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Horizontal line */}
            <span className="absolute w-4 h-px bg-yellow-300/60" />
            {/* Vertical line */}
            <span className="absolute h-4 w-px bg-yellow-300/60" />
            {/* Label */}
            <span
              className="absolute font-pixel text-[8px] text-yellow-300/80 tracking-widest uppercase"
              style={{ bottom: 10 }}
            >
              zoom
            </span>
          </motion.div>
        )}
      </motion.div>
    </>
  )
}
