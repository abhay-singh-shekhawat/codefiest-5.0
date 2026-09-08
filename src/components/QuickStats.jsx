export default function QuickStats() {
  return (
    <>
      {/* Bottom-left stats */}
      <aside className="hidden lg:flex flex-col gap-3 absolute bottom-12 left-10 z-30 pointer-events-auto">
        <div className="flex items-center gap-3 bg-[#0a1f22]/90 backdrop-blur-md border border-teal-500/30 px-4 py-2.5 rounded-xl shadow-2xl text-white">
          <span className="font-pixel text-lg text-yellow-300">2H</span>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-wider font-pixel uppercase text-slate-200">Non-Stop</span>
            <span className="text-[10px] text-teal-300">Creative Hackathon</span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#0a1f22]/90 backdrop-blur-md border border-teal-500/30 px-4 py-2.5 rounded-xl shadow-2xl text-white">
          <span className="font-pixel text-lg text-arcadeOrange">500+</span>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-wider font-pixel uppercase text-slate-200">Engineers</span>
            <span className="text-[10px] text-teal-300">Global Participation</span>
          </div>
        </div>
      </aside>

      {/* Bottom-right date card */}
      <aside className="hidden lg:flex absolute bottom-12 right-10 z-30 pointer-events-auto">
        <div className="flex items-center gap-5 bg-[#0a1f22]/90 backdrop-blur-md border border-teal-500/30 px-6 py-4 rounded-2xl shadow-2xl text-white">
          <span className="font-pixel text-3xl text-arcadeYellow">9–10</span>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider font-pixel uppercase text-slate-200">OCT</span>
            <span className="text-[12px] text-teal-300">Event Date</span>
          </div>
        </div>
      </aside>
    </>
  )
}
