import { useEffect, useId, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Globe } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { hasWebGLSupport } from '../lib/threeUtils';
import type { RegionalCheckpointResult } from '../types/dns';
import GlobeHeatmap3D from './GlobeHeatmap3D';

interface WorldPropagationMapProps {
  regions: RegionalCheckpointResult[];
  expectedValue?: string;
  selectedRegionId: string | null;
  onSelectRegion: (id: string | null) => void;
  isLoading: boolean;
}

type MapOverlayMode = 'globe3d' | 'heatmap' | 'status';
type LatencyTier = 'fast' | 'moderate' | 'slow';

const SVG_WIDTH = 800;
const SVG_HEIGHT = 400;

function projectPoint(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * SVG_WIDTH;
  const y = ((90 - lat) / 180) * SVG_HEIGHT;
  return { x, y };
}

function isRegionPropagated(
  region: RegionalCheckpointResult,
  expectedValue?: string
): boolean {
  if (region.status !== 'resolved' || region.answers.length === 0) {
    return false;
  }
  const expectedTrimmed = expectedValue?.trim().toLowerCase();
  if (expectedTrimmed) {
    return region.answers.some((a) => a.value.toLowerCase().includes(expectedTrimmed));
  }
  return true;
}

function classifyLatencyTier(latencyMs: number): LatencyTier {
  if (latencyMs < 50) return 'fast';
  if (latencyMs <= 150) return 'moderate';
  return 'slow';
}

function getHaloRadius(latencyMs: number, tier: LatencyTier, isSelected: boolean): number {
  const baseByTier =
    tier === 'fast'
      ? 24 + Math.min(4, (latencyMs / 50) * 4)
      : tier === 'moderate'
        ? 30 + Math.min(6, ((latencyMs - 50) / 100) * 6)
        : 38 + Math.min(10, ((latencyMs - 150) / 250) * 10);
  return isSelected ? baseByTier + 7 : baseByTier;
}

function useDarkModeObserver(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export default function WorldPropagationMap({
  regions,
  expectedValue,
  selectedRegionId,
  onSelectRegion,
  isLoading,
}: WorldPropagationMapProps) {
  const { t } = useI18n();
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');
  const isDark = useDarkModeObserver();

  const [mapMode, setMapMode] = useState<MapOverlayMode>(() =>
    hasWebGLSupport() ? 'globe3d' : 'heatmap'
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const tierPalette = useMemo(
    () => ({
      fast: {
        label: 'Fast (<50ms)',
        shortLabel: '< 50 ms',
        pin: isDark ? '#22C55E' : '#16A34A',
        halo: isDark ? '#4ADE80' : '#22C55E',
        ring: isDark ? '#14532D' : '#DCFCE7',
        text: isDark ? '#4ADE80' : '#15803D',
      },
      moderate: {
        label: 'Moderate (50-150ms)',
        shortLabel: '50-150 ms',
        pin: isDark ? '#FACC15' : '#CA8A04',
        halo: isDark ? '#FDE047' : '#FACC15',
        ring: isDark ? '#713F12' : '#FEF9C3',
        text: isDark ? '#FDE047' : '#A16207',
      },
      slow: {
        label: 'High (>150ms)',
        shortLabel: '> 150 ms',
        pin: isDark ? '#F87171' : '#DC2626',
        halo: isDark ? '#EF4444' : '#EF4444',
        ring: isDark ? '#7F1D1D' : '#FEE2E2',
        text: isDark ? '#FCA5A5' : '#B91C1C',
      },
    }),
    [isDark]
  );

  const projected = useMemo(() => {
    return regions.map((r) => {
      const propagated = isRegionPropagated(r, expectedValue);
      const tier = classifyLatencyTier(r.latencyMs);
      const latencyStyle = tierPalette[tier];
      const statusStyle = propagated
        ? {
            fill: isDark ? '#22C55E' : '#16A34A',
            ring: isDark ? '#14532D' : '#DCFCE7',
            text: isDark ? '#4ADE80' : '#15803D',
            label: t('statusPropagated'),
          }
        : {
            fill: isDark ? '#F87171' : '#DC2626',
            ring: isDark ? '#7F1D1D' : '#FEE2E2',
            text: isDark ? '#FCA5A5' : '#B91C1C',
            label: t('statusNonPropagated'),
          };

      return {
        region: r,
        ...projectPoint(r.lat, r.lng),
        propagated,
        tier,
        latencyStyle,
        statusStyle,
      };
    });
  }, [regions, expectedValue, tierPalette, isDark, t]);

  // Draw faster/lower-latency halos first and slower/higher-latency halos above so hotspots remain visible
  const haloSorted = useMemo(
    () => [...projected].sort((a, b) => a.region.latencyMs - b.region.latencyMs),
    [projected]
  );

  const tierCounts = useMemo(() => {
    let fast = 0;
    let moderate = 0;
    let slow = 0;
    for (const item of projected) {
      if (item.tier === 'fast') fast++;
      else if (item.tier === 'moderate') moderate++;
      else slow++;
    }
    return { fast, moderate, slow };
  }, [projected]);

  const activePin = useMemo(() => {
    const targetId = hoveredId ?? selectedRegionId;
    if (!targetId) return null;
    return projected.find((p) => p.region.id === targetId) ?? null;
  }, [hoveredId, selectedRegionId, projected]);

  return (
    <div
      dir="ltr"
      className="relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden"
    >
      {/* Header Bar with Mode Switcher & Synchronized Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('globalResolverDist')}
          </span>

          <div
            role="tablist"
            aria-label="Map visualization mode"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 gap-1 overflow-x-auto max-w-full"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mapMode === 'globe3d'}
              onClick={() => setMapMode('globe3d')}
              className={`px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                mapMode === 'globe3d'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>3D Heat Globe</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mapMode === 'heatmap'}
              onClick={() => setMapMode('heatmap')}
              className={`px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                mapMode === 'heatmap'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>2D Heatmap</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mapMode === 'status'}
              onClick={() => setMapMode('status')}
              className={`px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                mapMode === 'status'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>Status Map</span>
            </button>
          </div>
        </div>

        {mapMode === 'heatmap' || mapMode === 'globe3d' ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tierPalette.fast.pin }}
                aria-hidden="true"
              />
              <span>
                &lt;50ms{regions.length > 0 ? ` (${tierCounts.fast})` : ''}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tierPalette.moderate.pin }}
                aria-hidden="true"
              />
              <span>
                50–150ms{regions.length > 0 ? ` (${tierCounts.moderate})` : ''}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tierPalette.slow.pin }}
                aria-hidden="true"
              />
              <span>
                &gt;150ms{regions.length > 0 ? ` (${tierCounts.slow})` : ''}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
              <span>{t('statusPropagated')}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" aria-hidden="true" />
              <span>{t('statusNonPropagated')}</span>
            </span>
          </div>
        )}
      </div>

      {mapMode === 'globe3d' ? (
        <GlobeHeatmap3D
          regions={regions}
          expectedValue={expectedValue}
          selectedRegionId={selectedRegionId}
          onSelectRegion={onSelectRegion}
          isLoading={isLoading}
          isDark={isDark}
          onWebglUnavailable={() => setMapMode('heatmap')}
        />
      ) : (
      <div className="relative w-full aspect-[2/1] max-h-[340px] min-h-[220px] select-none">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full block"
          role="img"
          aria-label={
            mapMode === 'heatmap'
              ? 'World map displaying a color-coded latency heatmap across 18 global DNS regions'
              : 'World map showing global DNS propagation checkpoints'
          }
        >
          <defs>
            <radialGradient id={`${uid}-heat-fast`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={tierPalette.fast.halo} stopOpacity={isDark ? 0.56 : 0.48} />
              <stop offset="45%" stopColor={tierPalette.fast.halo} stopOpacity={isDark ? 0.24 : 0.2} />
              <stop offset="100%" stopColor={tierPalette.fast.halo} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${uid}-heat-moderate`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={tierPalette.moderate.halo} stopOpacity={isDark ? 0.62 : 0.54} />
              <stop offset="48%" stopColor={tierPalette.moderate.halo} stopOpacity={isDark ? 0.26 : 0.22} />
              <stop offset="100%" stopColor={tierPalette.moderate.halo} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${uid}-heat-slow`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={tierPalette.slow.halo} stopOpacity={isDark ? 0.68 : 0.58} />
              <stop offset="50%" stopColor={tierPalette.slow.halo} stopOpacity={isDark ? 0.28 : 0.24} />
              <stop offset="100%" stopColor={tierPalette.slow.halo} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Subtle latitude / longitude graticule */}
          <g className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.6" strokeDasharray="2 3">
            <line x1="0" y1="100" x2="800" y2="100" />
            <line x1="0" y1="200" x2="800" y2="200" />
            <line x1="0" y1="300" x2="800" y2="300" />
            <line x1="200" y1="0" x2="200" y2="400" />
            <line x1="400" y1="0" x2="400" y2="400" />
            <line x1="600" y1="0" x2="600" y2="400" />
          </g>

          {/* Simplified Equirectangular Continental Landmasses */}
          <g
            className="fill-slate-200 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            {/* North America */}
            <path d="M 31 55 L 78 44 L 118 42 L 176 44 L 245 40 L 270 54 L 266 78 L 246 105 L 222 145 L 204 140 L 184 142 L 194 156 L 207 154 L 216 172 L 227 182 L 218 186 L 198 172 L 167 156 L 147 132 L 138 140 L 124 111 L 116 86 L 100 71 L 66 66 L 34 68 Z" />
            {/* Greenland */}
            <path d="M 278 18 L 336 16 L 348 34 L 314 58 L 288 48 Z" />
            {/* South America */}
            <path d="M 227 180 L 248 174 L 268 182 L 302 198 L 323 213 L 314 236 L 300 251 L 284 268 L 271 279 L 258 308 L 249 324 L 238 312 L 236 286 L 242 252 L 226 225 L 220 208 L 225 190 Z" />
            {/* Europe */}
            <path d="M 380 118 L 378 104 L 392 94 L 408 86 L 416 74 L 411 62 L 432 46 L 456 42 L 495 44 L 533 49 L 528 76 L 496 92 L 464 109 L 451 118 L 442 108 L 434 118 L 424 104 L 408 108 L 396 118 Z" />
            {/* UK & Ireland */}
            <path d="M 386 89 L 389 72 L 399 71 L 402 85 L 393 90 Z" />
            <path d="M 378 86 L 383 80 L 385 88 L 379 90 Z" />
            {/* Africa */}
            <path d="M 380 122 L 422 118 L 454 126 L 472 132 L 495 162 L 514 173 L 498 202 L 489 222 L 478 256 L 456 274 L 440 276 L 427 234 L 421 192 L 396 189 L 368 182 L 362 167 L 374 142 Z" />
            {/* Madagascar */}
            <path d="M 498 256 L 504 228 L 512 232 L 505 258 Z" />
            {/* Asia */}
            <path d="M 476 120 L 502 104 L 533 49 L 584 42 L 642 32 L 718 38 L 784 52 L 762 72 L 756 88 L 742 74 L 722 92 L 702 108 L 687 122 L 672 134 L 660 156 L 644 174 L 631 198 L 620 188 L 613 164 L 594 156 L 572 184 L 558 158 L 548 144 L 524 142 L 531 152 L 504 172 L 490 154 L 478 134 Z" />
            {/* Japan & Taiwan */}
            <path d="M 696 128 L 708 118 L 718 104 L 724 110 L 710 126 Z" />
            <path d="M 667 148 L 671 142 L 673 149 L 668 153 Z" />
            {/* Indonesia / Philippines */}
            <path d="M 616 204 L 638 210 L 656 212 L 652 218 L 626 214 Z" />
            <path d="M 642 192 L 658 188 L 664 198 L 646 202 Z" />
            {/* Australia */}
            <path d="M 653 249 L 676 232 L 692 226 L 716 224 L 732 248 L 736 276 L 720 286 L 694 274 L 668 276 L 656 271 Z" />
            {/* New Zealand */}
            <path d="M 762 296 L 774 282 L 778 292 L 766 306 Z" />
          </g>

          {/* Radial Latency Heat Halos (Heatmap Mode) */}
          {!isLoading && mapMode === 'heatmap' && (
            <g className="pointer-events-none">
              {haloSorted.map(({ region, x, y, tier }) => {
                const isSelected = selectedRegionId === region.id || hoveredId === region.id;
                const haloR = getHaloRadius(region.latencyMs, tier, isSelected);
                return (
                  <circle
                    key={`halo-${region.id}`}
                    cx={x}
                    cy={y}
                    r={haloR}
                    fill={`url(#${uid}-heat-${tier})`}
                    opacity={selectedRegionId && !isSelected ? 0.55 : 1}
                  />
                );
              })}
            </g>
          )}

          {/* Regional Checkpoints */}
          {!isLoading &&
            projected.map(({ region, x, y, propagated, latencyStyle, statusStyle }) => {
              const isSelected = selectedRegionId === region.id || hoveredId === region.id;
              const pinFill = mapMode === 'heatmap' ? latencyStyle.pin : statusStyle.fill;
              const ringFill = mapMode === 'heatmap' ? latencyStyle.ring : statusStyle.ring;

              return (
                <g
                  key={region.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredId(region.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() =>
                    onSelectRegion(selectedRegionId === region.id ? null : region.id)
                  }
                  role="button"
                  tabIndex={0}
                  aria-label={`${region.city}, ${region.country}: ${latencyStyle.label}, ${region.latencyMs} ms, ${statusStyle.label}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRegion(selectedRegionId === region.id ? null : region.id);
                    }
                  }}
                >
                  <circle
                    r={isSelected ? 11.5 : 8.5}
                    fill={ringFill}
                    opacity={isSelected ? 0.92 : 0.65}
                  />
                  {/* Explicit dashed warning ring if a node is Non-Propagated while viewing Heatmap */}
                  {mapMode === 'heatmap' && !propagated && (
                    <circle
                      r={isSelected ? 10.5 : 8}
                      fill="none"
                      stroke={isDark ? '#F87171' : '#DC2626'}
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  )}
                  <circle
                    r={isSelected ? 5.6 : 4.4}
                    fill={pinFill}
                    stroke={isDark ? '#0F172A' : '#FFFFFF'}
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
        </svg>

        {isLoading && (
          <div className="absolute inset-0 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md shadow-xs">
              {t('queryingCheckpoints')}
            </span>
          </div>
        )}

        {activePin && !isLoading && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-md text-xs max-w-[270px]"
            style={{
              left: `${Math.min(70, Math.max(4, (activePin.x / SVG_WIDTH) * 100))}%`,
              top: `${Math.min(66, Math.max(6, (activePin.y / SVG_HEIGHT) * 100))}%`,
            }}
          >
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {activePin.region.city} · {activePin.region.countryCode}
            </div>
            <div className="text-slate-500 dark:text-slate-400 mt-0.5">
              {activePin.region.provider}
            </div>
            <div className="mt-1.5 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
              {activePin.region.primaryValue ?? activePin.statusStyle.label}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              <span style={{ color: activePin.statusStyle.text }} className="font-medium">
                {activePin.statusStyle.label}
              </span>
              <span aria-hidden="true">·</span>
              <span style={{ color: activePin.latencyStyle.text }} className="font-mono font-semibold">
                {activePin.region.latencyMs} ms ({activePin.latencyStyle.shortLabel})
              </span>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
