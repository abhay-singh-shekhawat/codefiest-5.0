import { useEffect, useState } from 'react'

function scrollToSection(id) {
  // Use Lenis if available (set up in App.jsx) for buttery smooth scroll;
  // fall back to native smooth scroll otherwise.
  const el = document.getElementById(id)
  if (!el) return
  if (window.__lenis && typeof window.__lenis.scrollTo === 'function') {
    window.__lenis.scrollTo(el, { duration: 1.4, offset: 0 })
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  REGISTRATION COUNTDOWN                                                  */
/*  Deadline: 30 Sept 2026, 12:00 PM (local time)                          */
/* ─────────────────────────────────────────────────────────────────────── */
function RegistrationCountdown() {
  const DEADLINE = new Date('2026-09-30T12:00:00').getTime()

  const compute = () => {
    const diff = Math.max(0, DEADLINE - Date.now())
    const days  = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const mins  = Math.floor((diff / (1000 * 60)) % 60)
    const secs  = Math.floor((diff / 1000) % 60)
    return { diff, days, hours, mins, secs }
  }

  const [t, setT] = useState(compute)

  useEffect(() => {
    const id = setInterval(() => setT(compute()), 1000)
    return () => clearInterval(id)
  }, [])

  const closed = t.diff <= 0

  return (
    <div
      className="flex items-center gap-3 bg-[#0a1f22]/90 backdrop-blur-md border border-amber-400/40 px-5 py-2.5 rounded-xl shadow-2xl"
      title="Registration closes 30 Sept 2026, 12:00 PM"
    >
      <div className="flex flex-col leading-none">
        <span className="font-pixel text-[10px] text-amber-300/70 tracking-widest uppercase mb-1">
          {closed ? 'CLOSED' : 'REG. CLOSES IN'}
        </span>
        {closed ? (
          <span className="font-pixel text-[14px] text-amber-300 font-bold tracking-wider">
            30 SEP · 12:00 PM
          </span>
        ) : (
          <div className="flex items-baseline gap-1.5 font-pixel font-bold text-amber-300 tabular-nums"
               style={{ fontSize: '18px', textShadow: '0 0 8px rgba(251,191,36,0.45)' }}>
            <span>{String(t.days).padStart(2, '0')}<span className="text-[10px] opacity-60 ml-0.5">D</span></span>
            <span className="opacity-50">:</span>
            <span>{String(t.hours).padStart(2, '0')}<span className="text-[10px] opacity-60 ml-0.5">H</span></span>
            <span className="opacity-50">:</span>
            <span>{String(t.mins).padStart(2, '0')}<span className="text-[10px] opacity-60 ml-0.5">M</span></span>
            <span className="opacity-50">:</span>
            <span>{String(t.secs).padStart(2, '0')}<span className="text-[10px] opacity-60 ml-0.5">S</span></span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Navbar({ soundEnabled, toggleChiptune }) {
  const navItems = [
    { label: 'Themes',   target: 'section-themes'   },
    { label: 'Timeline', target: 'section-timeline' },
    { label: 'Glimpse',  target: 'section-glimpse'  },
    { label: 'Prizes',   target: 'section-prizes'   },
    { label: 'Our Team', target: 'section-team'     },
  ]

  return (
    <header className="relative z-40 w-full px-6 py-4 lg:px-12 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-[#0b2123]/90 text-white px-3.5 py-1.5 rounded-md border-2 border-[#123631] shadow-[0_3px_0_#071517] backdrop-blur-md">
          <span className="font-pixel text-xs text-arcadeYellow font-bold tracking-wider mr-2">&lt;CF/5.0&gt;</span>
          <span className="font-pixel text-sm font-bold tracking-tight text-white">CODEFIESTA</span>
        </div>
      </div>

      <nav className="hidden xl:flex items-center gap-2 bg-[#0c2626]/80 backdrop-blur-md p-1.5 rounded-xl border border-teal-500/30 shadow-2xl">
        {navItems.map((item) => (
          <button
            key={item.target}
            className="retro-nav-pill px-4 py-1.5 text-xs font-pixel font-semibold uppercase bg-[#184844] hover:bg-[#205e58] text-white rounded-lg border border-[#0e2c29]"
            onClick={() => scrollToSection(item.target)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-teal-500/40 text-teal-300 transition backdrop-blur-md"
          onClick={toggleChiptune}
          title="Toggle Retro Sound"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" />
          </svg>
        </button>
        <RegistrationCountdown />
      </div>
    </header>
  )
}
