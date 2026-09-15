/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Store,
  Phone,
  MapPin,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AppSettings } from '../../types';
import { getAppSettings, saveAppSettings } from '../../utils/unifiedDataStore';

export const MarketplaceSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSettings(getAppSettings());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveAppSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div id="marketplace-settings-container" className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Marketplace & Stock Engine Settings</h2>
          <p className="text-xs text-slate-500">
            Configure social channels, inventory reservation rules, negative stock prevention, and store metadata
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {savedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">Settings updated and saved successfully!</span>
          </div>
        )}

        {/* 1. Inventory & Stock Engine Rules */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Stock Transaction Engine Rules</h3>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="font-bold text-xs text-slate-900">Prevent Negative Stock</div>
              <p className="text-xs text-slate-500 mt-0.5">
                When enabled, the system prevents sales and stock-out events from reducing inventory below zero without explicit override.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={!settings.allowNegativeStock}
                onChange={(e) =>
                  setSettings({ ...settings, allowNegativeStock: !e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="font-bold text-xs text-slate-900">Auto-Reserve Stock On Order Creation</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically increment <code className="text-indigo-600">reservedStock</code> when an order is created in Pending/Draft status to prevent overselling on other channels.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.autoReserveStockOnOrder}
                onChange={(e) =>
                  setSettings({ ...settings, autoReserveStockOnOrder: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* 2. Store & Social Contact Information */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Store className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Store Profile & Social Selling Info</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store / Business Name</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Contact Phone</label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Pickup Location</label>
            <input
              type="text"
              value={settings.pickupLocation}
              onChange={(e) => setSettings({ ...settings, pickupLocation: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default Delivery & Pickup Terms</label>
            <input
              type="text"
              value={settings.defaultDeliveryTerms}
              onChange={(e) => setSettings({ ...settings, defaultDeliveryTerms: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Code / Symbol</label>
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Low Stock Alert</label>
              <input
                type="number"
                min="1"
                value={settings.lowStockThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value, 10) || 5 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors"
          >
            Save App & Marketplace Settings
          </button>
        </div>
      </form>
    </div>
  );
};
