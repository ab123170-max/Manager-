/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import {
  Download,
  Smartphone,
  Users,
  UserCheck,
  ScanBarcode,
  PackageCheck,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { fetchPublicStats, PublicStats } from '../../services/analyticsService';
import { useLanguage } from '../../context/LanguageContext';

function AnimatedNumber({ value, inView }: { value: number; inView: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    let start = 0;
    const duration = 1200; // 1.2s animation
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      const current = Math.floor(easeProgress * value);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [value, inView]);

  return <span>{displayValue.toLocaleString()}</span>;
}

export const LandingStatsSection: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-40px' });

  const loadStats = async () => {
    try {
      const data = await fetchPublicStats();
      if (data) {
        setStats(data);
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      loadStats();
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const statItems = [
    {
      id: 'downloads',
      icon: Download,
      label: t('landing.totalDownloads') || 'Total Downloads',
      sublabel: 'Official APK',
      value: stats?.downloads ?? null,
      color: 'from-blue-500/10 to-indigo-500/10 text-[#1473EA] border-blue-100',
    },
    {
      id: 'installs',
      icon: Smartphone,
      label: t('landing.activeInstalls') || 'Active Installs',
      sublabel: 'Confirmed Devices',
      value: stats?.installs ?? null,
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-100',
    },
    {
      id: 'active_users',
      icon: Users,
      label: t('landing.activeUsers') || 'Active Users',
      sublabel: t('landing.activeUsersSub') || 'Active in last 30 days',
      value: stats?.activeUsers ?? null,
      color: 'from-purple-500/10 to-pink-500/10 text-purple-600 border-purple-100',
    },
    {
      id: 'registered_users',
      icon: UserCheck,
      label: t('landing.registeredUsers') || 'Registered Users',
      sublabel: 'Store Accounts',
      value: stats?.registeredUsers ?? null,
      color: 'from-cyan-500/10 to-blue-500/10 text-cyan-600 border-cyan-100',
    },
    {
      id: 'products_scanned',
      icon: ScanBarcode,
      label: t('landing.productsScanned') || 'Products Scanned',
      sublabel: 'AI & Barcode Scans',
      value: stats?.productsScanned ?? null,
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-100',
    },
    {
      id: 'products_added',
      icon: PackageCheck,
      label: t('landing.productsAdded') || 'Products Managed',
      sublabel: 'Inventory Items',
      value: stats?.productsAdded ?? null,
      color: 'from-rose-500/10 to-pink-500/10 text-rose-600 border-rose-100',
    },
  ];

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="mt-7 w-full"
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-[#1473EA]" />
          <h2 className="text-sm font-black text-slate-900">
            {t('landing.statsTitle') || 'ScanMe AI is growing 🚀'}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Metrics
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`bg-white border rounded-2xl p-3.5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                item.color.split(' ')[3] || 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold text-slate-600 line-clamp-1">
                  {item.label}
                </span>
                <div
                  className={`w-7 h-7 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 ml-1 ${item.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-2.5">
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isLoading ? (
                    <span className="text-xs font-semibold text-slate-400">Loading...</span>
                  ) : hasError || item.value === null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <AnimatedNumber value={item.value} inView={inView} />
                  )}
                </div>
                <div className="text-[9px] font-medium text-slate-400 mt-0.5 truncate">
                  {item.sublabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
};
