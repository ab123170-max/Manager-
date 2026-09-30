import React from 'react';
import { X, User, Camera, Boxes, History, BarChart3, FileSpreadsheet, Settings, Globe, LogOut, HelpCircle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { MenuSection, AppSubView, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AndroidNavDrawerProps {
  isOpen:boolean; onClose:()=>void;
  activeSection:MenuSection; activeSubView:AppSubView;
  onNavigate:(section:MenuSection,subView:AppSubView)=>void;
  badges?:{lowStock?:number;expiringSoon?:number;expired?:number;totalProducts?:number};
  counts?:{products?:number;lowStock?:number;expiring?:number;expired?:number;scanHistory?:number};
  userProfile?:UserProfile|null;
  onEditProfile?:()=>void; onShowOnboarding?:()=>void; onLogout?:()=>void; onOpenSettings?:()=>void; onOpenInfoHelp?:()=>void;
  onOpenGoogleSheets?:()=>void;
}

export const AndroidNavDrawer:React.FC<AndroidNavDrawerProps>=({
  isOpen,onClose,activeSection,activeSubView,onNavigate,userProfile,onEditProfile,onShowOnboarding,onLogout,onOpenSettings,onOpenInfoHelp,onOpenGoogleSheets
})=>{
  const {t,languageOption,openLanguageSelector}=useLanguage();
  if(!isOpen)return null;

  const go=(section:MenuSection,subView:AppSubView)=>{onNavigate(section,subView);onClose();};
  const row=(label:string,icon:React.ElementType,action:()=>void,active=false,badge?:number)=>{
    const Icon=icon;
    return <button type="button" onClick={action} className={"w-full min-h-12 px-3.5 rounded-2xl flex items-center gap-3 text-left transition-all duration-200 active:scale-[0.99] "+(active?"bg-[#1473EA]/10 text-[#1473EA]":"text-slate-700 hover:bg-slate-100")}>
      <span className={"w-9 h-9 rounded-xl flex items-center justify-center "+(active?"bg-[#1473EA] text-white":"bg-slate-100 text-slate-600")}><Icon className="w-4.5 h-4.5"/></span>
      <span className="flex-1 text-sm font-bold">{label}</span>
      {badge!==undefined&&badge>0&&<span className="min-w-6 h-6 px-1.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-black flex items-center justify-center">{badge}</span>}
      <span className="text-slate-300 text-lg">›</span>
    </button>;
  };

  return <div className="fixed inset-0 z-[60]">
    <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"/>
    <aside className="absolute right-0 top-0 h-full w-[min(88vw,360px)] bg-[#F5F7FA] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#1473EA]">ScanMe AI</p>
            <h2 className="text-xl font-black text-[#092B4C]">More</h2>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600" aria-label="Close"><X className="w-5 h-5"/></button>
        </div>
        {userProfile&&<button type="button" onClick={()=>{onClose();onEditProfile?.();}} className="mt-4 w-full rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-center gap-3 text-left">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1473EA]/10 text-[#1473EA] flex items-center justify-center font-black">{userProfile.profile_image_url?<img src={userProfile.profile_image_url} alt="" className="w-full h-full object-cover"/>:userProfile.full_name?.charAt(0).toUpperCase()||<User className="w-5 h-5"/>}</div>
          <div className="min-w-0 flex-1"><p className="font-extrabold text-sm text-slate-900 truncate">{userProfile.full_name}</p><p className="text-xs text-slate-500 truncate">@{userProfile.username}</p></div>
          <span className="text-slate-400">›</span>
        </button>}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <section><p className="px-2 mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Manage</p>
          <div className="bg-white rounded-3xl border border-slate-200 p-1.5 space-y-1">
            {row('Scan history',History,()=>go('inventory_in','scan_history'),activeSubView==='scan_history')}
            {row('Stock history',History,()=>go('inventory','stock_ledger'),activeSubView==='stock_ledger')}
            {row('Reports & export',BarChart3,()=>go('inventory','reports'),activeSubView==='reports')}
            {row('Stock In',ArrowDownToLine,()=>go('inventory_in','stock_in'),activeSubView==='stock_in')}
            {row('Stock Out',ArrowUpFromLine,()=>go('inventory_out','stock_out'),activeSubView==='stock_out')}
          </div>
        </section>

        <section><p className="px-2 mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Account</p>
          <div className="bg-white rounded-3xl border border-slate-200 p-1.5 space-y-1">
            {row('Profile',User,()=>{onClose();onEditProfile?.();})}
            {row('Language',Globe,()=>openLanguageSelector())}
            {row('Settings',Settings,()=>{onClose();onOpenSettings?.();})}
            {row('Info & Help',HelpCircle,()=>{onClose();onOpenInfoHelp?.();})}
          </div>
        </section>

        <section><p className="px-2 mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Connected</p>
          <div className="bg-white rounded-3xl border border-slate-200 p-1.5">
            {onOpenGoogleSheets&&row('Google Sheets',FileSpreadsheet,()=>{onClose();onOpenGoogleSheets();})}
          </div>
        </section>
      </div>

      <div className="shrink-0 p-3 border-t border-slate-200 bg-white pb-[max(12px,env(safe-area-inset-bottom))]">
        <button type="button" onClick={()=>{onClose();onLogout?.();}} className="w-full min-h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"><LogOut className="w-4 h-4"/>Logout</button>
      </div>
    </aside>
  </div>;
};
export default AndroidNavDrawer;
