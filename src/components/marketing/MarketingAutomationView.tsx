import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Facebook, Instagram, MessageCircle, Pause, Play, Plus, Send, Sparkles, Trash2, Video, Wand2 } from 'lucide-react';

type Platform = 'Facebook' | 'Instagram' | 'WhatsApp' | 'TikTok';

type Campaign = {
  id: string;
  name: string;
  caption: string;
  platforms: Platform[];
  startAt: string;
  intervalHours: number;
  active: boolean;
  createdAt: string;
  nextRun: string;
};

const STORAGE_KEY = 'manager-marketing-campaigns-v1';

const platformMeta: Record<Platform, { icon: React.ReactNode; hint: string }> = {
  Facebook: { icon: <Facebook className="w-4 h-4" />, hint: 'Facebook Page API' },
  Instagram: { icon: <Instagram className="w-4 h-4" />, hint: 'Instagram Graph API' },
  WhatsApp: { icon: <MessageCircle className="w-4 h-4" />, hint: 'WhatsApp Business API' },
  TikTok: { icon: <Video className="w-4 h-4" />, hint: 'TikTok Content Posting API' },
};

function loadCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function nextRunFrom(startAt: string, intervalHours: number) {
  const start = new Date(startAt).getTime();
  if (!Number.isFinite(start)) return startAt;
  const interval = Math.max(1, intervalHours) * 60 * 60 * 1000;
  let next = start;
  while (next <= Date.now()) next += interval;
  return new Date(next).toISOString();
}

export function MarketingAutomationView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns);
  const [name, setName] = useState('Promote Manager');
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>(['Facebook', 'Instagram', 'WhatsApp', 'TikTok']);
  const [startAt, setStartAt] = useState(() => new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16));
  const [intervalHours, setIntervalHours] = useState(24);
  const [message, setMessage] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  const connectedCount = useMemo(() => platforms.length, [platforms]);

  const generatePost = () => {
    setCaption(
      '📦 Meet Manager — smart inventory management for modern stores.\n\nScan products, track stock and expiry dates, and keep your store organized from your phone. Try it free today.\n\n#InventoryManagement #StoreManagement #ScanMeManager #SmallBusiness'
    );
    setMessage('AI-style promotional draft generated. Review it before publishing.');
  };

  const createCampaign = () => {
    const cleanCaption = caption.trim();
    if (!cleanCaption) {
      setMessage('Generate or write a post before creating the campaign.');
      return;
    }
    if (!platforms.length) {
      setMessage('Select at least one platform.');
      return;
    }
    const now = new Date().toISOString();
    const campaign: Campaign = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Marketing campaign',
      caption: cleanCaption,
      platforms,
      startAt: new Date(startAt).toISOString(),
      intervalHours: Math.max(1, Number(intervalHours) || 24),
      active: true,
      createdAt: now,
      nextRun: nextRunFrom(startAt, Math.max(1, Number(intervalHours) || 24)),
    };
    setCampaigns((current) => [campaign, ...current]);
    setMessage('Campaign saved. Publishing requires the connected platform APIs.');
  };

  const toggleCampaign = (id: string) => {
    setCampaigns((current) =>
      current.map((c) =>
        c.id === id
          ? { ...c, active: !c.active, nextRun: nextRunFrom(c.startAt, c.intervalHours) }
          : c
      )
    );
  };

  const deleteCampaign = (id: string) => setCampaigns((current) => current.filter((c) => c.id !== id));

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 p-5 sm:p-7 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Marketing Automation
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black">Create once. Schedule everywhere.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              Create promotional campaigns for Manager and schedule them for multiple social platforms from one page.
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Send className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.25fr_.75fr] gap-5">
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900">Create Campaign</h3>
              <p className="text-xs text-slate-500 mt-1">Promote your app or any store offer.</p>
            </div>
            <button onClick={generatePost} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-blue-700">
              <Wand2 className="w-4 h-4" /> Generate Post
            </button>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">Campaign name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">Post content</span>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={7} placeholder="Write your promotion or tap Generate Post..." className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500" />
          </label>

          <div>
            <span className="text-xs font-bold text-slate-700">Publish to</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(Object.keys(platformMeta) as Platform[]).map((platform) => {
                const selected = platforms.includes(platform);
                return (
                  <button key={platform} onClick={() => setPlatforms((p) => selected ? p.filter((x) => x !== platform) : [...p, platform])} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                    {platformMeta[platform].icon}
                    <span>{platform}</span>
                    {selected && <CheckCircle2 className="ml-auto w-4 h-4" />}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{connectedCount} platform(s) selected. Official account connection is required before live publishing.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label>
              <span className="text-xs font-bold text-slate-700">First post</span>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label>
              <span className="text-xs font-bold text-slate-700">Repeat interval</span>
              <select value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                <option value={1}>Every 1 hour</option>
                <option value={3}>Every 3 hours</option>
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Every 24 hours</option>
                <option value={48}>Every 48 hours</option>
                <option value={168}>Every 7 days</option>
              </select>
            </label>
          </div>

          <button onClick={createCampaign} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">
            <Play className="w-4 h-4" /> Start Auto Campaign
          </button>

          {message && <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs font-semibold text-blue-800">{message}</div>}
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
          <h3 className="font-black text-slate-900">Platform connections</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Connect accounts through official APIs before live publishing.</p>
          <div className="space-y-2.5">
            {(Object.keys(platformMeta) as Platform[]).map((platform) => (
              <div key={platform} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-slate-700">{platformMeta[platform].icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-800">{platform}</div>
                  <div className="text-[11px] text-slate-400">{platformMeta[platform].hint}</div>
                </div>
                <button onClick={() => setMessage(`${platform} connection will be enabled after its official API credentials/OAuth setup.`)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600">Connect</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-black text-slate-900">Campaigns</h3>
            <p className="text-xs text-slate-500">Your scheduled multi-platform campaigns.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{campaigns.length} total</span>
        </div>
        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            <CalendarClock className="mx-auto mb-2 w-7 h-7" /> No campaigns yet.
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${campaign.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {campaign.active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-sm text-slate-900">{campaign.name}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${campaign.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{campaign.active ? 'ACTIVE' : 'PAUSED'}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 whitespace-pre-line line-clamp-3">{campaign.caption}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {campaign.platforms.map((p) => <span key={p} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{platformMeta[p].icon}{p}</span>)}
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500"><Clock3 className="w-3 h-3" /> Every {campaign.intervalHours}h</span>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">Next run: {new Date(campaign.nextRun).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleCampaign(campaign.id)} className="rounded-lg border border-slate-200 p-2 text-slate-600" title={campaign.active ? 'Pause' : 'Resume'}>{campaign.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
                    <button onClick={() => deleteCampaign(campaign.id)} className="rounded-lg border border-slate-200 p-2 text-rose-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <strong>Live publishing note:</strong> this page now stores and schedules campaign settings in the app UI. Actual automatic posting to each network requires that network's approved OAuth/API credentials and a server-side scheduler; no social-media password is stored.
      </div>
    </div>
  );
}
