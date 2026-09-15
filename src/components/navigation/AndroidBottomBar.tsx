/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, Boxes, CircleDollarSign, Menu, Sparkles, Store } from 'lucide-react';
import { MenuSection, AppSubView } from '../../types';

interface AndroidBottomBarProps {
  activeSection: MenuSection;
  activeSubView: string;
  onNavigate: (section: MenuSection, subView: any) => void;
  onOpenDrawer: () => void;
}

export const AndroidBottomBar: React.FC<AndroidBottomBarProps> = ({
  activeSection,
  activeSubView,
  onNavigate,
  onOpenDrawer,
}) => {
  const tabs = [
    {
      id: 'scanner' as MenuSection,
      defaultSubView: 'scan_product',
      label: 'Scanner',
      icon: Camera,
    },
    {
      id: 'inventory' as MenuSection,
      defaultSubView: 'inventory',
      label: 'Inventory',
      icon: Boxes,
    },
    {
      id: 'marketplace' as MenuSection,
      defaultSubView: 'marketplace_dashboard',
      label: 'Marketplace',
      icon: Store,
    },
    {
      id: 'account' as MenuSection,
      defaultSubView: 'summary',
      label: 'Account',
      icon: CircleDollarSign,
    },
  ];

  return (
    <nav aria-label="Bottom Navigation" className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 flex items-center justify-around shadow-lg md:hidden">
      {tabs.map((tab) => {
        const isActive = activeSection === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.id, tab.defaultSubView)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isActive
                ? 'text-indigo-600 font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-600' : ''
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}

      {/* Menu / Drawer button */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-600 hover:text-slate-900 font-medium transition-colors"
      >
        <div className="p-1 rounded-xl text-slate-700">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[11px] mt-0.5 tracking-tight font-medium">Menu</span>
      </button>
    </nav>
  );
};
