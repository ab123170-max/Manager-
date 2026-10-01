/** @license SPDX-License-Identifier: Apache-2.0 */

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BarChart3, Boxes, Check, ChevronLeft, Clock3, Download, Hotel, Pill, ShoppingBasket, Sparkles, Store, UtensilsCrossed, X } from 'lucide-react';

type BusinessKind = 'grocery' | 'pharmacy' | 'hotel' | 'restaurant' | 'medical' | 'other';

interface PersonalizedIntroProps {
  isOpen: boolean;
  kind: BusinessKind | null;
  onClose: () => void;
  onStart: () => void;
}

const DATA: Record<BusinessKind, { name: string; icon: React.ElementType; color: string; steps: { title: string; text: string; icon: React.ElementType }[] }> = {
  grocery: { name: 'Grocery Store', icon: ShoppingBasket, color: 'text-emerald-600', steps: [
    { title: 'Scan products quickly', text: 'Capture product labels and organize important product details with less manual typing.', icon: ShoppingBasket },
    { title: 'Know what is in stock', text: 'Keep your products and stock movements organized so you can find information when you need it.', icon: Boxes },
    { title: 'Watch expiry dates', text: 'Keep expiry information visible so staff can check products before they become avoidable losses.', icon: Clock3 },
    { title: 'Save time and reduce waste', text: 'Use one place for scanning, inventory and reports instead of relying only on notebooks or scattered records.', icon: BarChart3 },
  ]},
  pharmacy: { name: 'Pharmacy', icon: Pill, color: 'text-rose-600', steps: [
    { title: 'Capture medicine details', text: 'Scan clear medicine packaging to help record product information such as name, price, MFD and expiry.', icon: Pill },
    { title: 'Keep stock organized', text: 'Make frequently used inventory information easier for staff to find and update.', icon: Boxes },
    { title: 'Pay attention to expiry', text: 'Keep expiry information visible so staff can identify products that need checking before they become losses.', icon: Clock3 },
    { title: 'Protect time and money', text: 'Reduce avoidable inventory waste and make stock information easier to review. Always follow professional and regulatory medicine-handling requirements.', icon: BarChart3 },
  ]},
  medical: { name: 'Medical Store', icon: Pill, color: 'text-rose-600', steps: [
    { title: 'Scan and record', text: 'Capture product information from clear packaging and reduce repetitive manual entry.', icon: Pill },
    { title: 'Organize your inventory', text: 'Keep product and stock information together for easier day-to-day checking.', icon: Boxes },
    { title: 'Monitor expiry information', text: 'Make expiry dates easier to review so staff can check products before they become avoidable losses.', icon: Clock3 },
    { title: 'Reduce inventory waste', text: 'Save staff time and improve visibility while continuing to follow all professional and regulatory requirements.', icon: BarChart3 },
  ]},
  hotel: { name: 'Hotel', icon: Hotel, color: 'text-sky-600', steps: [
    { title: 'Record supplies', text: 'Use scanning and inventory tools to organize packaged supplies and products used by your hotel.', icon: Hotel },
    { title: 'Know your stock', text: 'Keep stock information easier to review across daily hotel operations.', icon: Boxes },
    { title: 'Check dates', text: 'Keep expiry information visible for products where expiry monitoring matters.', icon: Clock3 },
    { title: 'Reduce waste', text: 'Improve stock visibility and make purchasing and usage reviews easier with reports.', icon: BarChart3 },
  ]},
  restaurant: { name: 'Restaurant', icon: UtensilsCrossed, color: 'text-orange-600', steps: [
    { title: 'Record products and supplies', text: 'Capture useful product information and keep packaged inventory easier to organize.', icon: UtensilsCrossed },
    { title: 'Keep stock visible', text: 'Organize stock information so staff can check what is available before ordering more.', icon: Boxes },
    { title: 'Monitor expiry', text: 'Keep expiry information visible for ingredients and packaged products where applicable.', icon: Clock3 },
    { title: 'Cut avoidable waste', text: 'Use inventory and reports to improve visibility and reduce unnecessary stock loss.', icon: BarChart3 },
  ]},
  other: { name: 'Other Store', icon: Store, color: 'text-[#1473EA]', steps: [
    { title: 'Scan and organize', text: 'Use AI-assisted scanning to help capture product information and reduce manual entry.', icon: Store },
    { title: 'Manage your stock', text: 'Keep products and stock movements organized in one simple workspace.', icon: Boxes },
    { title: 'Track important dates', text: 'Keep expiry information visible for products where expiry monitoring is important.', icon: Clock3 },
    { title: 'Get more visibility', text: 'Use reports to understand your inventory and reduce avoidable time and money loss.', icon: BarChart3 },
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
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 1.8, repeat: Infinity }} className="mx-auto w-20 h-20 rounded-[26px] bg-[#1473EA]/10 flex items-center justify-center">
                <StepIcon className={`w-10 h-10 ${data.color}`} />
              </motion.div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[.16em] text-[#1473EA]">Step {step + 1} of {data.steps.length}</p>
              <h2 className="mt-2 text-2xl font-black text-[#092B4C]">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{item.text}</p>
              <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-left flex gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-600 font-medium">Use the feature when it is useful for your business — you can skip this guide anytime.</span>
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
