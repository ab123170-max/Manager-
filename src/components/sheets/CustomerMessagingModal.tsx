import React, { useMemo, useState } from 'react';
import { Mail, MessageCircle, MessageSquareText, Send, X } from 'lucide-react';
import {
  getGoogleAccessToken,
  getSpreadsheetIdFromUrl,
  getSpreadsheetMetadata,
  readSpreadsheetValues,
} from '../../services/googleSheetsService';

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  fields: Record<string, string>;
};

type Channel = 'email' | 'whatsapp' | 'sms';

interface CustomerMessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const normalizePhone = (value: string) => value.replace(/[^0-9+]/g, '');

const personalize = (template: string, customer: Customer) =>
  template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const normalized = key.trim().toLowerCase();
    if (normalized === 'name') return customer.name;
    if (normalized === 'email') return customer.email;
    if (normalized === 'phone') return customer.phone;
    return customer.fields[normalized] ?? '';
  });

export const CustomerMessagingModal: React.FC<CustomerMessagingModalProps> = ({ isOpen, onClose }) => {
  const [sheetInput, setSheetInput] = useState('');
  const [tab, setTab] = useState('');
  const [tabs, setTabs] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [template, setTemplate] = useState('Hello {{name}}, thank you for visiting us!');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selected.has(c.id)),
    [customers, selected]
  );

  if (!isOpen) return null;

  const loadCustomers = async () => {
    setLoading(true);
    setStatus('');
    try {
      if (!getGoogleAccessToken()) throw new Error('Connect Google first in Google Sheets.');
      const id = getSpreadsheetIdFromUrl(sheetInput);
      const metadata = await getSpreadsheetMetadata(id);
      const chosenTab = tab && metadata.sheetNames.includes(tab) ? tab : metadata.sheetNames[0];
      if (!chosenTab) throw new Error('No Sheet tab found.');

      const rows = await readSpreadsheetValues(id, `'${chosenTab.replace(/'/g, "''")}'!A1:Z500`);
      if (rows.length < 2) throw new Error('No customer rows found.');

      const headers = rows[0].map((h) => String(h || '').trim());
      const lower = headers.map((h) => h.toLowerCase());
      const find = (words: string[]) => lower.findIndex((h) => words.some((w) => h === w || h.includes(w)));

      const nameIdx = find(['name', 'customer', 'client']);
      const emailIdx = find(['email', 'e-mail']);
      const phoneIdx = find(['phone', 'mobile', 'whatsapp', 'contact']);
      const parsed = rows.slice(1).map((row, index) => {
        const fields: Record<string, string> = {};
        headers.forEach((h, i) => { if (h) fields[h.toLowerCase()] = String(row[i] || ''); });
        return {
          id: `${index}-${String(row[nameIdx >= 0 ? nameIdx : 0] || '')}-${String(row[emailIdx >= 0 ? emailIdx : 0] || '')}`,
          name: String(row[nameIdx >= 0 ? nameIdx : 0] || 'Customer').trim(),
          email: String(row[emailIdx >= 0 ? emailIdx : -1] || '').trim(),
          phone: String(row[phoneIdx >= 0 ? phoneIdx : -1] || '').trim(),
          fields,
        };
      }).filter((c) => c.email || c.phone);

      setCustomers(parsed);
      setSelected(new Set(parsed.map((c) => c.id)));
      setTabs(metadata.sheetNames);
      setTab(chosenTab);
      setStatus(`Loaded ${parsed.length} customers from "${metadata.title}".`);
    } catch (err: any) {
      setStatus(err.message || 'Could not load customer data.');
    } finally {
      setLoading(false);
    }
  };

  const openForCustomer = (customer: Customer) => {
    const body = personalize(template, customer);
    if (channel === 'email') {
      if (!customer.email) return;
      window.location.href = `mailto:${encodeURIComponent(customer.email)}?subject=${encodeURIComponent('Message from our store')}&body=${encodeURIComponent(body)}`;
    } else if (channel === 'sms') {
      if (!customer.phone) return;
      window.location.href = `sms:${normalizePhone(customer.phone)}?body=${encodeURIComponent(body)}`;
    } else {
      if (!customer.phone) return;
      const phone = normalizePhone(customer.phone).replace(/^\+/, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
    }
  };

  const openSelected = () => {
    if (!selectedCustomers.length) {
      setStatus('Select at least one customer.');
      return;
    }
    // Browsers may block multiple new tabs. We still open the first selected contact,
    // then the user can continue through the list without sending anything silently.
    openForCustomer(selectedCustomers[0]);
    if (selectedCustomers.length > 1) {
      setStatus(`Opened the first contact. ${selectedCustomers.length - 1} more selected; browser popup protection may block opening many tabs at once.`);
    }
  };

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Customer Messaging</h2>
            <p className="text-[11px] text-slate-500">Use customer data from your Google Sheet.</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-[11px] text-blue-900">
            ScanMe does not silently send messages. You review the recipient and open the selected Email, WhatsApp, or SMS composer.
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input value={sheetInput} onChange={(e) => setSheetInput(e.target.value)} placeholder="Paste Google Sheet URL or ID" className="rounded-xl border px-3 py-2.5 text-xs" />
            <button onClick={loadCustomers} disabled={loading || !sheetInput.trim()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
              {loading ? 'Loading…' : 'Load Customers'}
            </button>
          </div>

          {tabs.length > 0 && (
            <select value={tab} onChange={(e) => setTab(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-xs">
              {tabs.map((name) => <option key={name}>{name}</option>)}
            </select>
          )}

          <div className="grid grid-cols-3 gap-2">
            {([
              ['whatsapp', <MessageCircle className="h-4 w-4" />, 'WhatsApp'],
              ['sms', <MessageSquareText className="h-4 w-4" />, 'SMS'],
              ['email', <Mail className="h-4 w-4" />, 'Email'],
            ] as const).map(([value, icon, label]) => (
              <button key={value} onClick={() => setChannel(value)} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-bold ${channel === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                {icon}{label}
              </button>
            ))}
          </div>

          <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={4} className="w-full resize-none rounded-2xl border px-3 py-3 text-xs" placeholder="Use {{name}}, {{email}}, {{phone}} or any Sheet column name." />

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">{selected.size} selected / {customers.length}</span>
            <button onClick={() => setSelected(selected.size === customers.length ? new Set() : new Set(customers.map((c) => c.id)))} className="text-[11px] font-bold text-blue-600">
              {selected.size === customers.length ? 'Clear all' : 'Select all'}
            </button>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border p-2">
            {customers.map((customer) => {
              const available = channel === 'email' ? !!customer.email : !!customer.phone;
              return (
                <label key={customer.id} className={`flex items-center gap-3 rounded-xl p-2.5 ${available ? 'hover:bg-slate-50' : 'opacity-40'}`}>
                  <input type="checkbox" checked={selected.has(customer.id)} disabled={!available} onChange={() => toggle(customer.id)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-slate-800">{customer.name}</div>
                    <div className="truncate text-[10px] text-slate-500">{channel === 'email' ? customer.email : customer.phone || 'No contact number'}</div>
                  </div>
                </label>
              );
            })}
            {!customers.length && <div className="p-8 text-center text-xs text-slate-400">Load a customer Sheet to begin.</div>}
          </div>

          <button onClick={openSelected} disabled={!selectedCustomers.length} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white disabled:opacity-40">
            <Send className="h-4 w-4" /> Open selected {channel === 'email' ? 'emails' : channel === 'whatsapp' ? 'WhatsApp messages' : 'SMS messages'}
          </button>

          {status && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-semibold text-slate-600">{status}</div>}
        </div>
      </div>
    </div>
  );
};
