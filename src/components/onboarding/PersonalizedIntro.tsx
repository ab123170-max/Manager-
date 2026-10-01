/** @license SPDX-License-Identifier: Apache-2.0 */

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BarChart3, Boxes, Check, ChevronLeft, Clock3, Hotel, Pill, ShoppingBasket, Sparkles, Store, UtensilsCrossed, X } from 'lucide-react';

type BusinessKind = 'grocery' | 'pharmacy' | 'hotel' | 'restaurant' | 'medical' | 'other';

interface PersonalizedIntroProps {
  isOpen: boolean;
  kind: BusinessKind | null;
  onClose: () => void;
  onStart: () => void;
}

const DATA: Record<BusinessKind, { name: string; icon: React.ElementType; color: string; steps: { title: string; text: string; icon: React.ElementType; character: string; tip: string }[] }> = {
  grocery: { name: 'Grocery Store', icon: ShoppingBasket, color: 'text-emerald-600', steps: [
    { title: 'Scan products quickly', text: 'Capture product labels and organize important product details with less manual typing.', icon: ShoppingBasket, character: '👉', tip: 'Point your camera at a clear product label to begin.' },
    { title: 'Know what is in stock', text: 'Keep your products and stock movements organized so you can find information when you need it.', icon: Boxes, character: '📦', tip: 'Keep your important stock information together.' },
    { title: 'Watch expiry dates', text: 'Keep expiry information visible so staff can check products before they become avoidable losses.', icon: Clock3, character: '📅', tip: 'Check expiry information regularly.' },
    { title: 'Save time and reduce waste', text: 'Use one place for scanning, inventory and reports instead of relying only on notebooks or scattered records.', icon: BarChart3, character: '✅', tip: 'Use reports to review your inventory and make better decisions.' },
  ]},
  pharmacy: { name: 'Pharmacy', icon: Pill, color: 'text-rose-600', steps: [
    { title: 'Capture medicine details', text: 'Scan clear medicine packaging to help record product information such as name, price, MFD and expiry.', icon: Pill, character: '🔎', tip: 'Start with a clear medicine package and check the captured details.' },
    { title: 'Keep stock organized', text: 'Make frequently used inventory information easier for staff to find and update.', icon: Boxes, character: '📦', tip: 'Keep stock information in one place for easier checking.' },
    { title: 'Pay attention to expiry', text: 'Keep expiry information visible so staff can identify products that need checking before they become losses.', icon: Clock3, character: '📅', tip: 'Review expiry information and follow your normal store procedures.' },
    { title: 'Protect time and money', text: 'Reduce avoidable inventory waste and make stock information easier to review. Always follow professional and regulatory medicine-handling requirements.', icon: BarChart3, character: '🛡️', tip: 'Use the information as a storekeeping aid and continue following professional and regulatory requirements.' },
  ]},
  medical: { name: 'Medical Store', icon: Pill, color: 'text-rose-600', steps: [
    { title: 'Scan and record', text: 'Capture product information from clear packaging and reduce repetitive manual entry.', icon: Pill, character: '👉', tip: 'Begin by scanning a clear product label.' },
    { title: 'Organize your inventory', text: 'Keep product and stock information together for easier day-to-day checking.', icon: Boxes, character: '📦', tip: 'Keep product information together for quick daily checks.' },
    { title: 'Monitor expiry information', text: 'Make expiry dates easier to review so staff can check products before they become avoidable losses.', icon: Clock3, character: '📅', tip: 'Make expiry checks part of your regular inventory routine.' },
    { title: 'Reduce inventory waste', text: 'Save staff time and improve visibility while continuing to follow all professional and regulatory requirements.', icon: BarChart3, character: '✅', tip: 'Review inventory regularly and keep following applicable requirements.' },
  ]},
  hotel: { name: 'Hotel', icon: Hotel, color: 'text-sky-600', steps: [
    { title: 'Record supplies', text: 'Use scanning and inventory tools to organize packaged supplies and products used by your hotel.', icon: Hotel, character: '👉', tip: 'Start by recording the supplies your team uses.' },
    { title: 'Know your stock', text: 'Keep stock information easier to review across daily hotel operations.', icon: Boxes, character: '📦', tip: 'Check what you have before ordering more.' },
    { title: 'Check dates', text: 'Keep expiry information visible for products where expiry monitoring matters.', icon: Clock3, character: '📅', tip: 'Review important dates during your normal stock checks.' },
    { title: 'Reduce waste', text: 'Improve stock visibility and make purchasing and usage reviews easier with reports.', icon: BarChart3, character: '✅', tip: 'Use reports to spot avoidable stock loss.' },
  ]},
  restaurant: { name: 'Restaurant', icon: UtensilsCrossed, color: 'text-orange-600', steps: [
    { title: 'Record products and supplies', text: 'Capture useful product information and keep packaged inventory easier to organize.', icon: UtensilsCrossed, character: '👉', tip: 'Record the products and supplies your team uses.' },
    { title: 'Keep stock visible', text: 'Organize stock information so staff can check what is available before ordering more.', icon: Boxes, character: '📦', tip: 'Check available stock before ordering more.' },
    { title: 'Monitor expiry', text: 'Keep expiry information visible for ingredients and packaged products where applicable.', icon: Clock3, character: '📅', tip: 'Review dates for products where expiry monitoring applies.' },
    { title: 'Cut avoidable waste', text: 'Use inventory and reports to improve visibility and reduce unnecessary stock loss.', icon: BarChart3, character: '✅', tip: 'Review your inventory and reports regularly.' },
  ]},
  other: { name: 'Other Store', icon: Store, color: 'text-[#1473EA]', steps: [
    { title: 'Scan and organize', text: 'Use AI-assisted scanning to help capture product information and reduce manual entry.', icon: Store, character: '👉', tip: 'Start by scanning a clear product label.' },
    { title: 'Manage your stock', text: 'Keep products and stock movements organized in one simple workspace.', icon: Boxes, character: '📦', tip: 'Keep your stock information in one workspace.' },
    { title: 'Track important dates', text: 'Keep expiry information visible for products where expiry monitoring is important.', icon: Clock3, character: '📅', tip: 'Make important date checks part of your routine.' },
    { title: 'Get more visibility', text: 'Use reports to understand your inventory and reduce avoidable time and money loss.', icon: BarChart3, character: '✅', tip: 'Use reports to understand your inventory.' },
  ]},
};

export const PersonalizedIntro: React.FC<PersonalizedIntroProps> = ({ isOpen, kind, onClose, onStart }) => {
  const [step, setStep] = useState(0);
  const data = useMemo(() => (kind ? DATA[kind] : null), [kind]);

  useEffect(() => { if (isOpen) setStep(0); }, [isOpen, kind]);
  if (!isOpen || !data) return null;

  const BrandIcon = data.icon;
  const item = data.steps[step];
  const StepIcon = item.icon;
  const last = step === data.steps.length - 1;
  const pose = step === 0 ? { rotate: [0, -4, 4, 0], x: [0, 2, -2, 0] } : step === 1 ? { y: [0, -7, 0] } : step === 2 ? { rotate: [0, 3, -3, 0] } : { scale: [1, 1.06, 1] };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <motion.div initial={{ opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-md bg-white rounded-[28px] overflow-hidden shadow-2xl">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2"><BrandIcon className={`w-5 h-5 ${data.color}`} /><span className="text-sm font-black">Your {data.name} guide</span></div>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="px-5 py-6 min-h-[330px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .22 }} className="text-center">
              <div className="mx-auto w-full max-w-[310px] flex items-center gap-3 rounded-3xl bg-gradient-to-r from-[#1473EA]/10 to-slate-50 border border-[#1473EA]/10 p-3 text-left">
                <motion.div animate={pose} transition={{ duration: 1.4, repeat: Infinity, repeatType: 'mirror' }} className="relative w-[92px] h-[105px] shrink-0 flex items-end justify-center">
                  <div className="absolute top-1 w-12 h-12 rounded-full bg-[#F3C9A5] border-2 border-[#092B4C]/10 flex items-center justify-center text-xl">🙂</div>
                  <div className="absolute top-10 w-16 h-12 rounded-t-2xl bg-[#092B4C] flex items-center justify-center">
                    <span className="text-white text-lg">👔</span>
                  </div>
                  <div className="absolute top-[43px] -left-1 text-lg">💼</div>
                  <div className="absolute bottom-0 w-20 h-9 flex justify-between px-2"><span className="w-3 h-9 rounded-full bg-[#092B4C]"></span><span className="w-3 h-9 rounded-full bg-[#092B4C]"></span></div>
                  <motion.span key={item.character} initial={{ opacity: 0, scale: .5, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="absolute -right-1 top-0 text-2xl">{item.character}</motion.span>
                </motion.div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[.12em] text-[#1473EA]">Your business guide</div>
                  <div className="mt-1 text-sm font-black text-[#092B4C]">“{item.tip}”</div>
                </div>
              </div>
              <div className="mt-4 mx-auto w-20 h-12 rounded-2xl bg-[#1473EA]/10 flex items-center justify-center">
                <StepIcon className={`w-7 h-7 ${data.color}`} />
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[.16em] text-[#1473EA]">Step {step + 1} of {data.steps.length}</p>
              <h2 className="mt-2 text-2xl font-black text-[#092B4C]">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{item.text}</p>
              <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-left flex gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-600 font-medium">Follow the guide one step at a time. You can skip it anytime.</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="px-5 pb-5 flex items-center gap-2">
          <div className="flex-1 flex gap-1">{data.steps.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-7 bg-[#1473EA]' : 'w-2 bg-slate-200'}`} />)}</div>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="p-2.5 rounded-xl border border-slate-200"><ChevronLeft className="w-4 h-4" /></button>}
          <button onClick={() => last ? onStart() : setStep(s => s + 1)} className="px-4 py-2.5 rounded-xl bg-[#1473EA] text-white text-xs font-black flex items-center gap-1.5">
            {last ? 'Start using ScanMe AI' : 'Next'} {last ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
