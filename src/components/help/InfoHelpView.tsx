import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search, ChevronDown, Info, ScanLine, Boxes, BarChart3, Bell, UserRound, ShieldCheck, Settings, CircleHelp } from 'lucide-react';

type Section = { id:string; title:string; icon:React.ElementType; text:string };

const sections:Section[] = [
  {id:'about',title:'About ScanMe AI',icon:Info,text:'ScanMe AI helps you scan products and manage inventory from your phone.'},
  {id:'scanner',title:'Scanner',icon:ScanLine,text:'Use AI photo scanning, barcode scanning, QR scanning, or manual entry to add product information. Review detected information before saving.'},
  {id:'inventory',title:'Inventory',icon:Boxes,text:'Inventory stores your products, quantities, categories, prices, stock status, and expiry information. Use Stock In and Stock Out to keep quantities updated.'},
  {id:'reports',title:'Reports',icon:BarChart3,text:'Reports summarize inventory value, stock quantities, product status, and available inventory analytics. Export supported reports when needed.'},
  {id:'expiry',title:'Expiry & Alerts',icon:Bell,text:'Expiry tools show products that are expired or approaching expiry. Alert counts can appear in the app header and inventory views.'},
  {id:'account',title:'Account & Login',icon:UserRound,text:'Create an account, verify your email when required, sign in with your authorized account, reset your password, edit your profile, and log out from More.'},
  {id:'security',title:'Privacy & Security',icon:ShieldCheck,text:'Your account and inventory features are designed around authenticated access. Never share your password, verification codes, or private account information.'},
  {id:'settings',title:'Settings & Language',icon:Settings,text:'Use Settings and Language to manage available app preferences and your profile.'},
  {id:'help',title:'Troubleshooting',icon:CircleHelp,text:'If a feature does not work, check your internet connection, camera permissions, account status, and try again. For scanner results, use clear product images and review the extracted data before saving.'},
];

interface Props { onClose:()=>void; }

export const InfoHelpView:React.FC<Props> = ({onClose}) => {
  const [query,setQuery]=useState('');
  const [open,setOpen]=useState<string|null>(null);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q) return sections;
    return sections.filter(s => (s.title+' '+s.text).toLowerCase().includes(q));
  },[query]);

  return (
    <div className="fixed inset-0 z-[70] bg-[#F5F7FA] overflow-y-auto">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-2xl mx-auto h-14 px-3 flex items-center gap-2">
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95" aria-label="Back">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <h1 className="text-base font-black text-slate-900 flex-1">Info & Help</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-3 sm:p-5 pb-10">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="Search help..."
            className="w-full h-12 pl-10 pr-4 rounded-2xl bg-white border border-slate-200 outline-none focus:border-[#1473EA] text-sm"
          />
        </div>

        <div className="space-y-2">
          {filtered.map(s=>{
            const Icon=s.icon;
            const expanded=open===s.id || query.trim().length>0;
            return (
              <section key={s.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button type="button" onClick={()=>setOpen(expanded && !query ? null : s.id)} className="w-full min-h-14 px-4 flex items-center gap-3 text-left">
                  <span className="w-9 h-9 rounded-xl bg-[#1473EA]/10 text-[#1473EA] flex items-center justify-center shrink-0"><Icon className="w-4 h-4"/></span>
                  <span className="flex-1 text-sm font-extrabold text-slate-800">{s.title}</span>
                  <ChevronDown className={'w-4 h-4 text-slate-400 transition-transform '+(expanded?'rotate-180':'')}/>
                </button>
                {expanded && <div className="px-4 pb-4 pl-16 text-sm leading-6 text-slate-600">{s.text}</div>}
              </section>
            );
          })}
        </div>

        {filtered.length===0 && <div className="text-center py-12 text-sm text-slate-500">No help found. Try another search.</div>}
      </main>
    </div>
  );
};

export default InfoHelpView;
