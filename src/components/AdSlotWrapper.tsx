interface AdSlotWrapperProps {
  placement: 'top' | 'bottom' | 'sidebar';
  className?: string;
}

const SLOT_CONFIG: Record<
  AdSlotWrapperProps['placement'],
  {
    outerClass: string;
    innerClass: string;
    ariaLabel: string;
  }
> = {
  top: {
    // Generous vertical separation from header & search input to prevent invalid clicks
    outerClass: 'w-full mb-6 sm:mb-8 py-2',
    innerClass:
      'w-full max-w-[970px] mx-auto min-h-[60px] sm:min-h-[90px] p-3 sm:p-4 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/25 flex items-center justify-center',
    ariaLabel: 'Top banner advertisement container',
  },
  sidebar: {
    // Sticky 300px sidebar container buffered cleanly from results & tables
    outerClass: 'w-full xl:w-[300px] py-2',
    innerClass:
      'w-full min-h-[250px] xl:min-h-[600px] p-3 sm:p-4 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/25 flex items-center justify-center',
    ariaLabel: 'Sidebar advertisement container',
  },
  bottom: {
    // Generous top/bottom margin isolating from footer links & scroll-to-top button
    outerClass: 'w-full mt-8 sm:mt-10 mb-2 py-2',
    innerClass:
      'w-full max-w-[970px] mx-auto min-h-[90px] sm:min-h-[100px] p-3 sm:p-4 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/25 flex items-center justify-center',
    ariaLabel: 'Bottom banner advertisement container',
  },
};

/**
 * Dedicated, empty, responsive AdSense layout wrapper.
 * Configured with fixed min-heights (CLS prevention) and safe buffer padding
 * in compliance with Google AdSense invalid-click policies.
 * Once AdSense is approved, mount <ins className="adsbygoogle" ... /> inside innerClass.
 */
export default function AdSlotWrapper({ placement, className = '' }: AdSlotWrapperProps) {
  const cfg = SLOT_CONFIG[placement];
  const adsenseClient = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;

  return (
    <aside
      aria-label={cfg.ariaLabel}
      data-ad-placement={placement}
      data-ad-client={adsenseClient || undefined}
      className={`${cfg.outerClass} ${className}`.trim()}
    >
      <div
        className={`${cfg.innerClass} ${
          adsenseClient ? '' : 'pointer-events-none select-none'
        }`.trim()}
      />
    </aside>
  );
}
