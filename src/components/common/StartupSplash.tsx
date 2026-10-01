import React from 'react';
import { BarChart3, Boxes, Camera, Check, Hotel, Pill, ShoppingBasket, UtensilsCrossed, Sparkles, ArrowRight } from 'lucide-react';

export const StartupSplash: React.FC<{ visible: boolean }> = ({ visible }) => (
  <div
    aria-hidden={!visible}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F5F7FA] text-[#092B4C] transition-opacity duration-500"
    style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
  >
    <div className="w-full max-w-sm px-8 text-center">
      <div className="relative mx-auto h-28 w-28">
        <div className="absolute inset-0 rounded-[34px] bg-[#092B4C] shadow-xl" style={{ animation: 'scanmeIntroPop 700ms cubic-bezier(.2,.8,.2,1) both, scanmeGlow 1800ms 700ms ease-in-out infinite alternate' }} />
        <div className="absolute inset-[10px] rounded-[26px] bg-[#1473EA] flex items-center justify-center" style={{ animation: 'scanmeIntroPop 700ms 100ms cubic-bezier(.2,.8,.2,1) both' }}>
          <div className="relative h-14 w-14 rounded-2xl border-[5px] border-white/95">
            <div className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
            <div className="absolute -right-3 -bottom-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1473EA] shadow-md">
              <Check className="h-5 w-5" strokeWidth={3} />
            </div>
          </div>
        </div>
        <div className="absolute -left-7 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-[#1473EA]" style={{ animation: 'scanmeFloat 2s ease-in-out infinite' }}><Pill className="h-5 w-5" /></div>
        <div className="absolute -right-7 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-[#1473EA]" style={{ animation: 'scanmeFloat 2s .25s ease-in-out infinite' }}><ShoppingBasket className="h-5 w-5" /></div>
        <div className="absolute -left-7 bottom-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-[#1473EA]" style={{ animation: 'scanmeFloat 2s .5s ease-in-out infinite' }}><Hotel className="h-5 w-5" /></div>
        <div className="absolute -right-7 bottom-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-[#1473EA]" style={{ animation: 'scanmeFloat 2s .75s ease-in-out infinite' }}><UtensilsCrossed className="h-5 w-5" /></div>
      </div>

      <div className="mt-9" style={{ animation: 'scanmeFadeUp 700ms 250ms ease-out both' }}>
        <div className="text-3xl font-black tracking-tight">ScanMe <span className="text-[#1473EA]">AI</span></div>
        <div className="mt-2 text-sm font-bold text-slate-500" style={{ animation: 'scanmeFadeUp 700ms 450ms ease-out both' }}>Free AI storekeeping for modern businesses</div>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#1473EA]" style={{ animation: 'scanmeFadeUp 700ms 650ms ease-out both' }}><Sparkles className="h-3.5 w-3.5" /> Scan smarter · manage easier <ArrowRight className="h-3 w-3" /></div>
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
          <Camera className="h-4 w-4 text-[#1473EA]" /> Scan
          <span>•</span><Boxes className="h-4 w-4 text-[#1473EA]" /> Stock
          <span>•</span><BarChart3 className="h-4 w-4 text-[#1473EA]" /> Reports
        </div>
      </div>
      <div className="mx-auto mt-7 h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-1/2 rounded-full bg-[#1473EA]" style={{ animation: 'scanmeProgress 1100ms ease-in-out infinite' }} />
      </div>
    </div>
    <style>{`
      @keyframes scanmeIntroPop { from { transform: scale(.72); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes scanmeFadeUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes scanmeFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      @keyframes scanmeGlow { from { box-shadow: 0 0 0 rgba(20,115,234,0); } to { box-shadow: 0 0 28px rgba(20,115,234,.25); } }\n      @keyframes scanmeProgress { from { transform: translateX(-130%); } to { transform: translateX(260%); } }
    `}</style>
  </div>
);