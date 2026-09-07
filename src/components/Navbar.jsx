export default function Navbar({ openModal, soundEnabled, toggleChiptune }) {
  return (
    <header className="relative z-40 w-full px-6 py-4 lg:px-12 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-[#0b2123]/90 text-white px-3.5 py-1.5 rounded-md border-2 border-[#123631] shadow-[0_3px_0_#071517] backdrop-blur-md">
          <span className="font-pixel text-xs text-arcadeYellow font-bold tracking-wider mr-2">&lt;CF/5.0&gt;</span>
          <span className="font-pixel text-sm font-bold tracking-tight text-white">CODEFIESTA</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-teal-300 border border-teal-500/30">
          <span className="inline-block w-2 h-2 rounded-full bg-terminalGreen animate-ping"></span>
          <span className="uppercase tracking-wider font-pixel text-[10px]">LIVE IN 14 DAYS</span>
        </div>
      </div>

      <nav className="hidden xl:flex items-center gap-2 bg-[#0c2626]/80 backdrop-blur-md p-1.5 rounded-xl border border-teal-500/30 shadow-2xl">
        <button className="retro-nav-pill px-4 py-1.5 text-xs font-pixel font-semibold uppercase bg-white text-slate-900 rounded-lg border border-slate-700" onClick={() => openModal('aboutModal')}>
          About
        </button>
        <button className="retro-nav-pill px-4 py-1.5 text-xs font-pixel font-semibold uppercase bg-[#184844] hover:bg-[#205e58] text-white rounded-lg border border-[#0e2c29]" onClick={() => openModal('themeModal')}>
          Themes
        </button>
        <button className="retro-nav-pill px-4 py-1.5 text-xs font-pixel font-semibold uppercase bg-[#184844] hover:bg-[#205e58] text-white rounded-lg border border-[#0e2c29]" onClick={() => openModal('prizesModal')}>
          Prizes
        </button>
        <button className="retro-nav-pill px-4 py-1.5 text-xs font-pixel font-semibold uppercase bg-[#184844] hover:bg-[#205e58] text-white rounded-lg border border-[#0e2c29]" onClick={() => openModal('timelineModal')}>
          Timeline
        </button>
        <button className="retro-nav-pill px-4 py-1.5 text-xs font-pixel font-semibold uppercase bg-[#184844] hover:bg-[#205e58] text-white rounded-lg border border-[#0e2c29]" onClick={() => openModal('problemModal')}>
          Tracks
        </button>
      </nav>

      <div className="flex items-center gap-3">
        <button
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-teal-500/40 text-teal-300 transition backdrop-blur-md"
          onClick={toggleChiptune}
          title="Toggle Retro Sound"
        >
          <svg className={`w-5 h-5 fill-current ${soundEnabled ? '' : 'opacity-30'}`} viewBox="0 0 24 24">
            <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5-1.23l-5 4h-3.5c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h3.5l5 4c.67.53 1.5.06 1.5-.8v-17.4c0-.86-.83-1.33-1.5-.8zm-1.5 13.71l-3.29-2.71h-1.71v-4h1.71l3.29-2.71v9.42z"></path>
          </svg>
        </button>
        <a className="group relative inline-flex items-center justify-center px-6 py-2.5 overflow-hidden rounded-lg bg-[#ef6a43] text-white font-pixel text-xs tracking-wider font-bold border-2 border-slate-900 shadow-[0_4px_0_#9c381c] hover:shadow-[0_2px_0_#9c381c] hover:translate-y-0.5 active:translate-y-1 transition-all" href="#register">
          <span className="relative z-10 flex items-center gap-2">
            REGISTER NOW
            <span className="inline-block w-2 h-2 bg-yellow-300 rounded-sm animate-pulse"></span>
          </span>
        </a>
      </div>
    </header>
  )
}
