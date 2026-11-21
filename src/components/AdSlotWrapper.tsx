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
    // Generous vertical separation from header & search input to prevent invalid clicks
    outerClass: 'w-full mb-6 sm:mb-8 py-2',
    innerClass:
      'w-full max-w-[970px] mx-auto min-h-[60px] sm:min-h-[90px] p-3 sm:p-4 flex items-center justify-center',
    ariaLabel: 'Top banner advertisement container',
  },
  sidebar: {
    // Sticky 300px sidebar container buffered cleanly from results & tables
    outerClass: 'w-full xl:w-[300px] py-2',
    innerClass:
      'w-full min-h-[250px] xl:min-h-[600px] p-3 sm:p-4 flex items-center justify-center',
    ariaLabel: 'Sidebar advertisement container',
  },
  bottom: {
    // Generous top/bottom margin isolating from footer links & scroll-to-top button
    outerClass: 'w-full mt-8 sm:mt-10 mb-2 py-2',
    innerClass:
      'w-full max-w-[970px] mx-auto min-h-[90px] sm:min-h-[100px] p-3 sm:p-4 flex items-center justify-center',
    ariaLabel: 'Bottom banner advertisement container',
  },
};

/**
 * AdSense layout wrapper.
 * Collapses with zero visual footprint until VITE_ADSENSE_CLIENT_ID is configured,
 * then automatically mounts responsive, CLS-safe containers with invalid-click buffer spacing.
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
