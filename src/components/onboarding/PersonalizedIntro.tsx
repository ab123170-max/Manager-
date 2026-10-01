/** @license SPDX-License-Identifier: Apache-2.0 */
import React,{useEffect,useMemo,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowRight,BarChart3,Boxes,Check,ChevronLeft,Clock3,Hotel,Pill,ShoppingBasket,Sparkles,Store,UtensilsCrossed,X} from 'lucide-react';
import {useLanguage} from '../../context/LanguageContext';

type BusinessKind='grocery'|'pharmacy'|'hotel'|'restaurant'|'medical'|'other';
interface PersonalizedIntroProps{isOpen:boolean;kind:BusinessKind|null;onClose:()=>void;onStart:()=>void}

const ICONS:Record<BusinessKind,React.ElementType>={grocery:ShoppingBasket,pharmacy:Pill,medical:Pill,hotel:Hotel,restaurant:UtensilsCrossed,other:Store};
const COLORS:Record<BusinessKind,string>={grocery:'text-emerald-600',pharmacy:'text-rose-600',medical:'text-rose-600',hotel:'text-sky-600',restaurant:'text-orange-600',other:'text-[#1473EA]'};
const CHARS=['👉','📦','📅','✅'];
const KEYS:Record<BusinessKind,string>={grocery:'grocery',pharmacy:'pharmacy',medical:'medical',hotel:'hotel',restaurant:'restaurant',other:'other'};

export const PersonalizedIntro:React.FC<PersonalizedIntroProps>=({isOpen,kind,onClose,onStart})=>{
 const {t}=useLanguage(); const [step,setStep]=useState(0);
 const data=useMemo(()=>{if(!kind)return null;const k=KEYS[kind];return {name:t('guide.'+k+'.name'),icon:ICONS[kind],color:COLORS[kind],steps:[0,1,2,3].map(i=>({title:t('guide.'+k+'.steps.'+i+'.0'),text:t('guide.'+k+'.steps.'+i+'.1'),tip:t('guide.'+k+'.steps.'+i+'.2'),character:CHARS[i],icon:[ICONS[kind],Boxes,Clock3,BarChart3][i]}))}},[kind,t]);
 useEffect(()=>{if(isOpen)setStep(0)},[isOpen,kind]);
 if(!isOpen||!data)return null;
 const BrandIcon=data.icon,item=data.steps[step],StepIcon=item.icon,last=step===data.steps.length-1;
 const pose=step===0?{rotate:[0,-4,4,0],x:[0,2,-2,0]}:step===1?{y:[0,-7,0]}:step===2?{rotate:[0,3,-3,0]}:{scale:[1,1.06,1]};
 return <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
  <motion.div initial={{opacity:0,y:24,scale:.98}} animate={{opacity:1,y:0,scale:1}} className="w-full max-w-md bg-white rounded-[28px] overflow-hidden shadow-2xl">
   <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100"><div className="flex items-center gap-2"><BrandIcon className={`w-5 h-5 ${data.color}`}/><span className="text-sm font-black">{t('guide.businessGuide')} · {data.name}</span></div><button onClick={onClose} aria-label={t('common.close')}><X className="w-5 h-5 text-slate-400"/></button></div>
   <div className="px-5 py-6 min-h-[330px]"><AnimatePresence mode="wait"><motion.div key={step} initial={{opacity:0,x:18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-18}} transition={{duration:.22}} className="text-center">
    <div className="mx-auto w-full max-w-[310px] flex items-center gap-3 rounded-3xl bg-gradient-to-r from-[#1473EA]/10 to-slate-50 border border-[#1473EA]/10 p-3 text-left">
     <motion.div animate={pose} transition={{duration:1.4,repeat:Infinity,repeatType:'mirror'}} className="relative w-[92px] h-[105px] shrink-0 flex items-end justify-center"><div className="absolute top-1 w-12 h-12 rounded-full bg-[#F3C9A5] border-2 border-[#092B4C]/10 flex items-center justify-center text-xl">🙂</div><div className="absolute top-10 w-16 h-12 rounded-t-2xl bg-[#092B4C] flex items-center justify-center"><span className="text-white text-lg">👔</span></div><div className="absolute top-[43px] -left-1 text-lg">💼</div><div className="absolute bottom-0 w-20 h-9 flex justify-between px-2"><span className="w-3 h-9 rounded-full bg-[#092B4C]"></span><span className="w-3 h-9 rounded-full bg-[#092B4C]"></span></div><motion.span key={item.character} initial={{opacity:0,scale:.5,y:5}} animate={{opacity:1,scale:1,y:0}} className="absolute -right-1 top-0 text-2xl">{item.character}</motion.span></motion.div>
     <div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[.12em] text-[#1473EA]">{t('guide.businessGuide')}</div><div className="mt-1 text-sm font-black text-[#092B4C]">“{item.tip}”</div></div>
    </div>
    <div className="mt-4 mx-auto w-20 h-12 rounded-2xl bg-[#1473EA]/10 flex items-center justify-center"><StepIcon className={`w-7 h-7 ${data.color}`}/></div>
    <p className="mt-4 text-[10px] font-black uppercase tracking-[.16em] text-[#1473EA]">{t('guide.step',{current:step+1,total:data.steps.length})}</p>
    <h2 className="mt-2 text-2xl font-black text-[#092B4C]">{item.title}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{item.text}</p>
    <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-left flex gap-2.5"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/><span className="text-xs text-slate-600 font-medium">{t('guide.follow')}</span></div>
   </motion.div></AnimatePresence></div>
   <div className="px-5 pb-5 flex items-center gap-2"><div className="flex-1 flex gap-1">{data.steps.map((_,i)=><span key={i} className={`h-1.5 rounded-full transition-all ${i===step?'w-7 bg-[#1473EA]':'w-2 bg-slate-200'}`}/>)}</div>{step>0&&<button onClick={()=>setStep(v=>v-1)} className="p-2.5 rounded-xl border border-slate-200"><ChevronLeft className="w-4 h-4"/></button>}<button onClick={()=>last?onStart():setStep(v=>v+1)} className="px-4 py-2.5 rounded-xl bg-[#1473EA] text-white text-xs font-black flex items-center gap-1.5">{last?t('guide.start'):t('guide.next')}{last?<Sparkles className="w-4 h-4"/>:<ArrowRight className="w-4 h-4"/>}</button></div>
  </motion.div></div>;
};