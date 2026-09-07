import { useEffect, useRef } from 'react'
import anime from 'animejs'
import satelliteImg from '../assets/satellite.png'

export default function SatelliteFloating() {
  const containerRef = useRef(null)
  const glowRef = useRef(null)
  const dotRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const floatAnim = anime({
      targets: container,
      translateY: [0, -14, 0],
      rotate: [0, 2, 0, -2, 0],
      duration: 5000,
      easing: 'easeInOutSine',
      loop: true,
    })

    const glowAnim = anime({
      targets: glowRef.current,
      scale: [1, 1.3, 1],
      opacity: [0.5, 0.9, 0.5],
      duration: 2200,
      easing: 'easeInOutSine',
      loop: true,
    })

    const dotAnim = anime({
      targets: dotRef.current,
      scale: [1, 1.6, 1],
      opacity: [0.7, 1, 0.7],
      boxShadow: [
        '0 0 6px 2px rgba(245,195,68,0.6)',
        '0 0 14px 6px rgba(245,195,68,1)',
        '0 0 6px 2px rgba(245,195,68,0.6)',
      ],
      duration: 1400,
      easing: 'easeInOutSine',
      loop: true,
    })

    return () => {
      floatAnim.pause()
      glowAnim.pause()
      dotAnim.pause()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute top-32 left-10 z-40 pointer-events-auto"
    >
      <div className="relative w-28 h-28 md:w-36 md:h-36">
        {/* Yellow glow behind the image */}
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(245,195,68,0.55) 0%, rgba(245,195,68,0.15) 50%, transparent 75%)',
            filter: 'blur(18px)',
            transform: 'scale(1.1)',
          }}
        />
        {/* Glowing dot on top of the satellite */}
        <div
          ref={dotRef}
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full z-10"
          style={{
            background: '#f5c344',
            boxShadow: '0 0 8px 3px rgba(245,195,68,0.7)',
          }}
        />
        {/* Satellite image */}
        <img
          src={satelliteImg}
          alt="Satellite"
          className="relative z-10 w-full h-full object-contain drop-shadow-lg"
        />
      </div>
    </div>
  )
}
