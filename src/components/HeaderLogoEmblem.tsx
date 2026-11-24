import { Suspense, lazy, useEffect, useState } from 'react';

const LazyInteractiveLogo3D = lazy(() => import('./InteractiveLogo3D'));

function StaticLogoBadge() {
  return (
    <div
      aria-hidden="true"
      className="relative w-10 h-10 rounded-xl bg-slate-900/95 dark:bg-slate-800/90 border border-emerald-500/35 shadow-xs inline-flex items-center justify-center shrink-0 select-none"
    >
      <img src="/favicon.svg" alt="" width={28} height={28} className="w-7 h-7" />
    </div>
  );
}

export default function HeaderLogoEmblem() {
  const [load3D, setLoad3D] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const activate = () => {
      if (!cancelled) setLoad3D(true);
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(activate, { timeout: 1400 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timer = globalThis.setTimeout(activate, 1000);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, []);

  if (!load3D) {
    return (
      <div onPointerEnter={() => setLoad3D(true)}>
        <StaticLogoBadge />
      </div>
    );
  }

  return (
    <Suspense fallback={<StaticLogoBadge />}>
      <LazyInteractiveLogo3D />
    </Suspense>
  );
}
