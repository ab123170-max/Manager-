import React from 'react';
import { Camera, Package, AlertTriangle, Clock3, Plus, ArrowDownToLine, ArrowUpFromLine, BarChart3, Download } from 'lucide-react';
import { isNativeApp } from '../../utils/platform';
import { trackDownloadClick, getAnonymousId } from '../../services/analyticsService';

interface HomeDashboardProps {
  productCount: number; lowStockCount: number; expiringCount: number; expiredCount: number;
  onNavigate: (section: any, subView: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({productCount, lowStockCount, expiringCount, expiredCount, onNavigate}) => {
  const nativeApp = isNativeApp();
  const anonId = getAnonymousId();
  const APK_DOWNLOAD_URL = `/api/download-apk?anon_id=${encodeURIComponent(anonId)}`;
  const stats = [
    {label:'Products',value:productCount,icon:Package,action:()=>onNavigate('inventory','inventory')},
    {label:'Low stock',value:lowStockCount,icon:AlertTriangle,action:()=>onNavigate('inventory','low_stock')},
    {label:'Expiring',value:expiringCount,icon:Clock3,action:()=>onNavigate('inventory','expiring_soon')},
    {label:'Expired',value:expiredCount,icon:AlertTriangle,action:()=>onNavigate('inventory','expired')}
  ];

  return <div className="space-y-4 pb-24">
    <section className="rounded-3xl bg-gradient-to-br from-[#092B4C] to-[#1473EA] text-white p-5 shadow-lg">
      <h1 className="text-2xl font-black">ScanMe AI</h1>
      <button type="button" onClick={()=>onNavigate('inventory_in','scan_product')} className="mt-4 min-h-12 w-full rounded-2xl bg-white text-[#092B4C] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md cursor-pointer">
        <Camera className="w-5 h-5 text-emerald-600"/>Scan with Camera
      </button>
      {!nativeApp && <a href={APK_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" onClick={trackDownloadClick} className="mt-3 min-h-12 w-full rounded-2xl border border-white/30 bg-white/10 text-white font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:bg-white/20" aria-label="Download ScanMe AI Android app">
        <Download className="w-5 h-5"/>Download Android App
      </a>}
    </section>

    <section className="grid grid-cols-2 gap-3">{stats.map(({label,value,icon:Icon,action})=><button key={label} type="button" onClick={action} className="min-h-[92px] rounded-2xl bg-white border border-slate-200 p-4 text-left shadow-sm active:scale-[0.98] transition-transform"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><Icon className="w-4 h-4 text-[#1473EA]"/></div><div className="text-2xl font-black text-slate-900 mt-2">{value}</div></button>)}</section>

    <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"><h2 className="font-extrabold text-slate-900">Quick actions</h2><div className="grid grid-cols-3 gap-2 mt-3">
      <button type="button" onClick={()=>onNavigate('inventory_in','manual_entry')} className="min-h-16 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-1 text-xs font-bold text-slate-700"><Plus className="w-4 h-4"/>Manual</button>
      <button type="button" onClick={()=>onNavigate('inventory_in','stock_in')} className="min-h-16 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-1 text-xs font-bold text-slate-700"><ArrowDownToLine className="w-4 h-4"/>Stock In</button>
      <button type="button" onClick={()=>onNavigate('inventory_out','stock_out')} className="min-h-16 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-1 text-xs font-bold text-slate-700"><ArrowUpFromLine className="w-4 h-4"/>Stock Out</button>
    </div></section>

    <button type="button" onClick={()=>onNavigate('inventory','reports')} className="w-full min-h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between px-4 text-sm font-bold text-slate-800"><span className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#1473EA]"/>Reports & Export</span><span className="text-slate-400">›</span></button>
  </div>;
};
