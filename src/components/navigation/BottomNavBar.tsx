/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Camera, Boxes, BarChart3, User } from 'lucide-react';

interface BottomNavBarProps {
  activeSlideIndex: number;
  onSelectSlide: (index: number) => void;
  alertCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeSlideIndex,
  onSelectSlide,
  alertCount = 0,
}) => {
  const navItems = [
    { index: 0, label: 'Home', icon: Home },
    { index: 1, label: 'Scan', icon: Camera },
    { index: 2, label: 'Inventory', icon: Boxes },
    { index: 3, label: 'Reports', icon: BarChart3 },
    { index: 4, label: 'More', icon: User, badge: alertCount > 0 ? alertCount : undefined },
  ];

  return (
    <nav
      id="android-bottom-nav-bar"
      aria-label="Bottom Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-1.5 py-1 transition-all"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSlideIndex === item.index;

          return (
            <button
              key={item.index}
              type="button"
              onClick={() => onSelectSlide(item.index)}
              className={`flex-1 min-h-[48px] min-w-[48px] py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer relative ${
                isActive
                  ? 'text-[#1473EA] font-extrabold bg-blue-50/70'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
              }`}
              aria-label={`Go to ${item.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-[#1473EA]' : 'text-slate-500'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] leading-none ${isActive ? 'font-bold text-[#1473EA]' : 'text-slate-600'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#1473EA] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
