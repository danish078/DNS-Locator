import { useMemo, useState } from 'react';
import type { RegionalCheckpointResult } from '../types/dns';

interface WorldPropagationMapProps {
  regions: RegionalCheckpointResult[];
  expectedValue?: string;
  selectedRegionId: string | null;
  onSelectRegion: (id: string | null) => void;
  isLoading: boolean;
}

const SVG_WIDTH = 800;
const SVG_HEIGHT = 400;

function projectPoint(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * SVG_WIDTH;
  const y = ((90 - lat) / 180) * SVG_HEIGHT;
  return { x, y };
}

function getMarkerColors(
  region: RegionalCheckpointResult,
  expectedValue?: string
): { fill: string; ring: string; label: string } {
  if (region.status === 'resolved') {
    const expectedTrimmed = expectedValue?.trim().toLowerCase();
    const isMatch = expectedTrimmed
      ? region.answers.some((a) => a.value.toLowerCase().includes(expectedTrimmed))
      : region.matchesConsensus;

    if (isMatch) {
      return { fill: '#16A34A', ring: '#DCFCE7', label: 'Propagated' };
    }
    return { fill: '#D97706', ring: '#FEF3C7', label: 'Different Value' };
  }
  return { fill: '#DC2626', ring: '#FEE2E2', label: region.statusLabel };
}

export default function WorldPropagationMap({
  regions,
  expectedValue,
  selectedRegionId,
  onSelectRegion,
  isLoading,
}: WorldPropagationMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const projected = useMemo(() => {
    return regions.map((r) => ({
      region: r,
      ...projectPoint(r.lat, r.lng),
      colors: getMarkerColors(r, expectedValue),
    }));
  }, [regions, expectedValue]);

  const activePin = useMemo(() => {
    const targetId = hoveredId ?? selectedRegionId;
    if (!targetId) return null;
    return projected.find((p) => p.region.id === targetId) ?? null;
  }, [hoveredId, selectedRegionId, projected]);

  return (
    <div className="relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Global Resolver Distribution
        </span>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
            <span>Matched Consensus</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" aria-hidden="true" />
            <span>Regional Variance</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" aria-hidden="true" />
            <span>Unresolved / Timeout</span>
          </span>
        </div>
      </div>

      <div className="relative w-full aspect-[2/1] max-h-[340px] min-h-[220px] select-none">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full block"
          role="img"
          aria-label="World map showing global DNS propagation checkpoints"
        >
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

          {/* Regional Checkpoints */}
          {!isLoading &&
            projected.map(({ region, x, y, colors }) => {
              const isSelected = selectedRegionId === region.id || hoveredId === region.id;
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
                  aria-label={`${region.city}, ${region.country}: ${region.statusLabel}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRegion(selectedRegionId === region.id ? null : region.id);
                    }
                  }}
                >
                  <circle
                    r={isSelected ? 12 : 9}
                    fill={colors.ring}
                    opacity={isSelected ? 0.9 : 0.65}
                  />
                  <circle
                    r={isSelected ? 5.5 : 4.2}
                    fill={colors.fill}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
        </svg>

        {isLoading && (
          <div className="absolute inset-0 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md shadow-xs">
              Querying 18 regional DNS checkpoints…
            </span>
          </div>
        )}

        {activePin && !isLoading && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-md text-xs max-w-[260px]"
            style={{
              left: `${Math.min(72, Math.max(4, (activePin.x / SVG_WIDTH) * 100))}%`,
              top: `${Math.min(68, Math.max(6, (activePin.y / SVG_HEIGHT) * 100))}%`,
            }}
          >
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {activePin.region.city} · {activePin.region.countryCode}
            </div>
            <div className="text-slate-500 dark:text-slate-400 mt-0.5">
              {activePin.region.provider}
            </div>
            <div className="mt-1.5 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
              {activePin.region.primaryValue ?? activePin.region.statusLabel}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              <span style={{ color: activePin.colors.fill }} className="font-medium">
                {activePin.colors.label}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activePin.region.latencyMs} ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
