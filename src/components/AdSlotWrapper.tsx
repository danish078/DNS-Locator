import { getAdSenseClientId } from '../lib/tracking';

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
    outerClass: 'w-full mb-6 sm:mb-8 py-2 contain-layout',
    innerClass:
      'w-full max-w-[970px] mx-auto h-[90px] sm:h-[100px] p-3 sm:p-4 flex items-center justify-center rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40',
    ariaLabel: 'Top banner advertisement container',
  },
  sidebar: {
    outerClass: 'w-full xl:w-[300px] py-2 contain-layout',
    innerClass:
      'w-full h-[250px] xl:h-[600px] p-3 sm:p-4 flex items-center justify-center rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40',
    ariaLabel: 'Sidebar advertisement container',
  },
  bottom: {
    outerClass: 'w-full mt-8 sm:mt-10 mb-2 py-2 contain-layout',
    innerClass:
      'w-full max-w-[970px] mx-auto h-[90px] sm:h-[100px] p-3 sm:p-4 flex items-center justify-center rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40',
    ariaLabel: 'Bottom banner advertisement container',
  },
};

/**
 * AdSense layout wrapper.
 * Collapses cleanly when VITE_ADSENSE_CLIENT_ID is unset,
 * and reserves exact fixed heights when AdSense is enabled to prevent Cumulative Layout Shift (CLS).
 */
export default function AdSlotWrapper({ placement, className = '' }: AdSlotWrapperProps) {
  const adsenseClient = getAdSenseClientId();

  if (!adsenseClient) {
    return null;
  }

  const cfg = SLOT_CONFIG[placement];

  return (
    <aside
      aria-label={cfg.ariaLabel}
      data-ad-placement={placement}
      data-ad-client={adsenseClient}
      className={`${cfg.outerClass} ${className}`.trim()}
    >
      <div className={cfg.innerClass} />
    </aside>
  );
}
