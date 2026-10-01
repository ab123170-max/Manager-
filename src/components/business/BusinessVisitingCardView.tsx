import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Share2, Sparkles, Wand2 } from 'lucide-react';
import type { UserProfile } from '../../types';

type CardData = {
  businessName: string;
  ownerName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  website: string;
  facebook: string;
  instagram: string;
  services: string;
};

const STORAGE_KEY = 'manager-business-card-v1';

function makeInitial(profile: UserProfile | null): CardData {
  return {
    businessName: profile?.business_name || '',
    ownerName: profile?.full_name || '',
    tagline: 'Smart business. Better organized.',
    phone: profile?.phone || '',
    whatsapp: profile?.phone || '',
    email: profile?.email || '',
    address: profile?.address || '',
    website: typeof window !== 'undefined' ? window.location.origin : '',
    facebook: '',
    instagram: '',
    services: 'Inventory Management • Stock Tracking • Expiry Alerts • Barcode & QR',
  };
}

function loadData(profile: UserProfile | null): CardData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...makeInitial(profile), ...JSON.parse(saved) };
  } catch {}
  return makeInitial(profile);
}

export function BusinessVisitingCardView({ profile }: { profile: UserProfile | null }) {
  const [data, setData] = useState<CardData>(() => loadData(profile));
  const [message, setMessage] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const update = (key: keyof CardData, value: string) => setData((d) => ({ ...d, [key]: value }));

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const shareText = `${data.businessName || 'Our Business'} — ${data.tagline}\n\n${data.services}\n\n${data.phone ? '📞 ' + data.phone : ''}${data.address ? '\n📍 ' + data.address : ''}\n\n${shareUrl}`;

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setMessage('Visiting card details copied. You can paste them into Facebook, WhatsApp, Instagram or any other app.');
    } catch {
      setMessage('Copy is not available in this browser. Use Share instead.');
    }
  };

  const downloadCard = () => {
    const card = cardRef.current;
    if (!card) return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
      <rect width="1200" height="700" rx="42" fill="#092B4C"/>
      <rect x="45" y="45" width="1110" height="610" rx="34" fill="#F5F7FA"/>
      <rect x="45" y="45" width="18" height="610" rx="9" fill="#1473EA"/>
      <text x="95" y="125" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#1473EA">BUSINESS VISITING CARD</text>
      <text x="95" y="205" font-family="Arial,sans-serif" font-size="58" font-weight="900" fill="#092B4C">${escapeXml(data.businessName || 'Your Business')}</text>
      <text x="95" y="250" font-family="Arial,sans-serif" font-size="25" fill="#475569">${escapeXml(data.tagline)}</text>
      <text x="95" y="320" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#092B4C">Services</text>
      <foreignObject x="95" y="340" width="960" height="100"><div xmlns="http://www.w3.org/1999/xhtml" style="font:24px Arial;color:#475569;line-height:1.35">${escapeXml(data.services)}</div></foreignObject>
      <text x="95" y="500" font-family="Arial,sans-serif" font-size="23" fill="#334155">☎ ${escapeXml(data.phone)}</text>
      <text x="95" y="540" font-family="Arial,sans-serif" font-size="23" fill="#334155">✉ ${escapeXml(data.email)}</text>
      <text x="95" y="580" font-family="Arial,sans-serif" font-size="23" fill="#334155">⌖ ${escapeXml(data.address)}</text>
      <text x="95" y="620" font-family="Arial,sans-serif" font-size="21" fill="#1473EA">${escapeXml(data.website)}</text>
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.businessName || 'business')}-visiting-card.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Visiting card image downloaded. You can upload it directly to social media.');
  };

  const shareCard = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: data.businessName || 'Business Visiting Card', text: shareText, url: shareUrl });
        setMessage('Sharing sheet opened.');
      } else {
        await copyCard();
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') setMessage('Sharing was cancelled or unavailable.');
    }
  };

  const fields: Array<[keyof CardData, string, string]> = [
    ['businessName', 'Business / Shop name', 'e.g. MeethoPasal'],
    ['ownerName', 'Owner / contact person', 'Your name'],
    ['tagline', 'Tagline', 'Short line about your business'],
    ['phone', 'Phone', '+977...'],
    ['whatsapp', 'WhatsApp', '+977...'],
    ['email', 'Email', 'business@example.com'],
    ['address', 'Full business address', 'Street, city, district'],
    ['website', 'Website / app link', 'https://...'],
    ['facebook', 'Facebook page', 'facebook.com/...'],
    ['instagram', 'Instagram', '@username'],
    ['services', 'Services / products', 'Use • between items'],
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-[#092B4C] via-slate-900 to-[#1473EA] p-5 sm:p-7 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center"><ContactRoundIcon /></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-200">Business Marketing</div>
            <h2 className="mt-1 text-2xl font-black">Create your detailed visiting card</h2>
            <p className="mt-1 text-sm text-slate-200">Add your business details once, then download or share the card from your phone.</p>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-5">
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-black text-slate-900">Business details</h3><p className="text-xs text-slate-500 mt-1">Saved on this device.</p></div>
            <button onClick={() => setData(makeInitial(profile))} className="rounded-xl bg-blue-50 text-blue-700 px-3 py-2 text-xs font-bold"><Wand2 className="inline w-3.5 h-3.5 mr-1" />Use profile</button>
          </div>
          <div className="space-y-3">
            {fields.map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="text-xs font-bold text-slate-700">{label}</span>
                <input value={data[key]} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1473EA]" />
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div ref={cardRef} className="overflow-hidden rounded-[28px] bg-[#092B4C] p-3 shadow-xl">
            <div className="rounded-[22px] bg-[#F5F7FA] p-6 sm:p-8 border-l-[8px] border-[#1473EA]">
              <div className="text-[10px] sm:text-xs font-black tracking-[.18em] text-[#1473EA]">BUSINESS VISITING CARD</div>
              <h3 className="mt-5 text-3xl sm:text-4xl font-black text-[#092B4C] break-words">{data.businessName || 'Your Business Name'}</h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">{data.tagline || 'Your business tagline'}</p>
              <div className="mt-6 text-sm text-slate-600"><div className="font-black text-[#092B4C] mb-1">Services</div><div>{data.services || 'Your products and services'}</div></div>
              <div className="mt-6 grid sm:grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex gap-2"><Phone className="w-4 h-4 shrink-0 text-[#1473EA]" />{data.phone || 'Phone'}</div>
                <div className="flex gap-2"><MessageCircle className="w-4 h-4 shrink-0 text-[#1473EA]" />{data.whatsapp || 'WhatsApp'}</div>
                <div className="flex gap-2"><Mail className="w-4 h-4 shrink-0 text-[#1473EA]" />{data.email || 'Email'}</div>
                <div className="flex gap-2"><MapPin className="w-4 h-4 shrink-0 text-[#1473EA]" />{data.address || 'Business address'}</div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-[#1473EA]">
                {data.website && <span>{data.website}</span>}{data.facebook && <span><Facebook className="inline w-3.5 h-3.5 mr-1" />{data.facebook}</span>}{data.instagram && <span><Instagram className="inline w-3.5 h-3.5 mr-1" />{data.instagram}</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={shareCard} className="rounded-2xl bg-[#1473EA] text-white py-3 text-xs font-black flex items-center justify-center gap-1.5"><Share2 className="w-4 h-4" />Share</button>
            <button onClick={copyCard} className="rounded-2xl bg-white border border-slate-200 text-slate-700 py-3 text-xs font-black flex items-center justify-center gap-1.5"><Copy className="w-4 h-4" />Copy</button>
            <button onClick={downloadCard} className="rounded-2xl bg-white border border-slate-200 text-slate-700 py-3 text-xs font-black flex items-center justify-center gap-1.5"><Download className="w-4 h-4" />Image</button>
          </div>
          {message && <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs font-semibold text-blue-800">{message}</div>}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
            <strong className="text-slate-900">Social sharing:</strong> Share opens the phone's native sharing sheet. Choose WhatsApp, Facebook, Instagram or another installed app. The Image button creates a shareable SVG card.
          </div>
        </section>
      </div>
    </div>
  );
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[char] || char));
}

function ContactRoundIcon() {
  return <Share2 className="w-6 h-6" />;
}
