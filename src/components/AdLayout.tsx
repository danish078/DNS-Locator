import type { ReactNode } from 'react';

/**
 * AdSense-ready layout slots.
 *
 * Each slot is an empty, fixed-footprint container that reserves space for a
 * Google AdSense unit. Paste the `<ins class="adsbygoogle" …>` tag inside the
 * marked `div` when your ad units are approved.
 *
 * Built to follow AdSense's invalid-click guidance:
 * - every slot is labelled "Advertisement", so ads can't be mistaken for site content
 * - generous outer margins keep ads away from buttons, inputs and navigation
 *   (prevents accidental clicks)
 * - reserved min-heights stop layout shift, so content never jumps under the
 *   cursor or finger while an ad loads
 * - `isolate` + `overflow-hidden` keep ad iframes from overlapping nearby controls
 * - the sidebar is not sticky and is hidden on small screens
 */

export type AdSlotPosition = 'top' | 'bottom' | 'sidebar';

const SLOT_SIZES: Record<AdSlotPosition, string> = {
  // Mobile banner (320x100) → desktop leaderboard (728x90 / 970x90)
  top: 'w-full min-h-[100px] sm:min-h-[90px]',
  // Mobile rectangle (300x250) → desktop leaderboard / large banner
  bottom: 'w-full min-h-[250px] md:min-h-[90px]',
  // Half page (300x600) / wide skyscraper (160x600)
  sidebar: 'w-[300px] min-h-[600px]',
};

const SLOT_SPACING: Record<AdSlotPosition, string> = {
  top: 'mb-10 sm:mb-12',
  bottom: 'mt-12 sm:mt-16',
  sidebar: '',
};

interface AdSlotProps {
  position: AdSlotPosition;
  className?: string;
}

export function AdSlot({ position, className = '' }: AdSlotProps) {
  return (
    <aside
      aria-label="Advertisement"
      className={`isolate ${SLOT_SPACING[position]} ${className}`}
    >
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
        Advertisement
      </p>
      <div
        data-ad-position={position}
        className={`${SLOT_SIZES[position]} overflow-hidden rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-2 sm:p-3 flex items-center justify-center`}
      >
        {/* Google AdSense <ins class="adsbygoogle"> tag goes here */}
      </div>
    </aside>
  );
}

interface AdLayoutProps {
  children: ReactNode;
  /** Turn off on pages AdSense doesn't allow ads on (404, error and thank-you pages). */
  showAds?: boolean;
}

/**
 * Wraps the main content area: top slot above, bottom slot below, and a
 * 300px sidebar slot beside the content on extra-large screens.
 */
export default function AdLayout({ children, showAds = true }: AdLayoutProps) {
  if (!showAds) return <>{children}</>;

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-12">
      <div className="min-w-0">
        <AdSlot position="top" />
        {children}
        <AdSlot position="bottom" />
      </div>
      <div className="hidden xl:block pt-1">
        <AdSlot position="sidebar" />
      </div>
    </div>
  );
}
