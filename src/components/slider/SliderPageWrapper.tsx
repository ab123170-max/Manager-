/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SliderPageWrapperProps {
  activeSlideIndex: number;
  totalSlides: number;
  currentSlideTitle: string;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  children: React.ReactNode;
}

export const SliderPageWrapper: React.FC<SliderPageWrapperProps> = ({
  activeSlideIndex,
  totalSlides,
  currentSlideTitle,
  onPrevSlide,
  onNextSlide,
  children,
}) => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const prevIndexRef = useRef(activeSlideIndex);

  // Track slide direction for animations
  if (activeSlideIndex !== prevIndexRef.current) {
    if (activeSlideIndex > prevIndexRef.current) {
      setSlideDirection('forward');
    } else {
      setSlideDirection('backward');
    }
    prevIndexRef.current = activeSlideIndex;
  }

  // Handle Touch Swipe Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    // Ignore if touch started on an interactive element like inputs, buttons, camera canvas
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('.no-swipe') ||
      target.closest('video') ||
      target.closest('canvas')
    ) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only trigger if horizontal swipe is significantly greater than vertical movement
    if (Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && activeSlideIndex < totalSlides - 1) {
        // Swiped Left -> Go to Next Slide
        onNextSlide();
      } else if (deltaX > 0 && activeSlideIndex > 0) {
        // Swiped Right -> Go to Prev Slide
        onPrevSlide();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full relative transition-all duration-300"
    >
      {/* Animated Slide Content */}
      <div
        key={`slide-${activeSlideIndex}`}
        className={`w-full ${
          slideDirection === 'forward'
            ? 'animate-in fade-in slide-in-from-right-3 duration-250'
            : 'animate-in fade-in slide-in-from-left-3 duration-250'
        }`}
      >
        {children}
      </div>

      {/* Floating Bottom Slider Navigation Pill for Mobile */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 sm:hidden">
        <div className="bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/80 shadow-xl px-3 py-1.5 rounded-full flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onPrevSlide}
            disabled={activeSlideIndex === 0}
            className={`p-1 rounded-full transition-colors ${
              activeSlideIndex === 0
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-200 hover:text-white active:scale-95'
            }`}
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-bold text-[11px] px-1 text-slate-200 whitespace-nowrap">
            {activeSlideIndex + 1}/{totalSlides}: {currentSlideTitle}
          </span>

          <button
            type="button"
            onClick={onNextSlide}
            disabled={activeSlideIndex === totalSlides - 1}
            className={`p-1 rounded-full transition-colors ${
              activeSlideIndex === totalSlides - 1
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-200 hover:text-white active:scale-95'
            }`}
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SliderPageWrapper;
