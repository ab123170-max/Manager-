import React from 'react';
import { Home, Camera, Boxes, MoreHorizontal } from 'lucide-react';
import { MenuSection, AppSubView } from '../../types';
interface Props {
  activeSlideIndex:number; activeSubView:AppSubView; activeSection:MenuSection;
  onSlideChange:(index:number)=>void; onNavigate:(section:MenuSection,subView:AppSubView)=>void;
  onOpenDrawer?:()=>void; inventoryCount?:number; alertCount?:number; lowStockCount?:number; expiredCount?:number; scanHistoryCount?:number; onOpenGoogleSheets?:()=>void;
}
export const AppSliderNavigation:React.FC<Props>=({activeSlideIndex,activeSubView,onNavigate,onOpenDrawer})=>{
  const items=[
    {id:'home',label:'Home',icon:Home,action:()=>onNavigate('inventory','home')},
    {id:'scan',label:'Scan',icon:Camera,action:()=>onNavigate('inventory_in','scan_product')},
    {id:'inventory',label:'Inventory',icon:Boxes,action:()=>onNavigate('inventory','inventory')},
    {id:'more',label:'More',icon:MoreHorizontal,action:()=>onOpenDrawer?.()}
  ];
  const active=activeSubView==='home'?'home':activeSlideIndex===0?'scan':activeSlideIndex===1?'inventory':'more';
  return <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-6px_24px_rgba(15,23,42,0.08)]" aria-label="Primary navigation">
    <div className="max-w-md mx-auto grid grid-cols-4 gap-1">{items.map(({id,label,icon:Icon,action})=>{
      const isActive=active===id;
      return <button key={id} type="button" onClick={action} className={"min-h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 "+(isActive?"bg-[#1473EA]/10 text-[#1473EA]":"text-slate-500 hover:bg-slate-50")}><Icon className={"w-5 h-5 "+(isActive?"stroke-[2.5]":"")}/><span className="text-[11px] font-extrabold">{label}</span></button>;
    })}</div>
  </nav>;
};
export default AppSliderNavigation;
