import React from 'react';

export const StartupSplash: React.FC<{ visible: boolean }> = ({ visible }) => (
  <div
    aria-hidden={!visible}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#092B4C] text-white transition-opacity duration-500"
    style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
  >
    <div className="flex flex-col items-center">
      <div
        className="h-24 w-24 rounded-[28px] bg-[#1473EA] flex items-center justify-center shadow-2xl"
        style={{ animation: 'scanmeStartupPulse 900ms ease-in-out infinite alternate' }}
      >
        <div className="h-12 w-12 rounded-full border-[7px] border-white flex items-center justify-center">
          <div className="h-3.5 w-3.5 rounded-full bg-white" />
        </div>
      </div>
      <div className="mt-5 text-2xl font-black tracking-tight">ScanMe AI</div>
      <div className="mt-1 text-xs font-semibold text-white/70">Smart Inventory Management</div>
      <div className="mt-7 h-1.5 w-20 overflow-hidden rounded-full bg-white/15">
        <div className="h-full w-1/2 rounded-full bg-white" style={{ animation: 'scanmeStartupProgress 900ms ease-in-out infinite' }} />
      </div>
    </div>
    <style>{`
      @keyframes scanmeStartupPulse { from { transform: scale(.94); opacity: .86; } to { transform: scale(1); opacity: 1; } }
      @keyframes scanmeStartupProgress { from { transform: translateX(-120%); } to { transform: translateX(220%); } }
    `}</style>
  </div>
);