import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Activity, BarChart3, CheckCircle2, Clock } from 'lucide-react';
import type { RegionalCheckpointResult } from '../types/dns';

interface GlobalHealthChartProps {
  regions: RegionalCheckpointResult[];
  expectedValue: string;
  selectedRegionId: string | null;
  onSelectRegion: (id: string | null) => void;
}

type ChartMode = 'regions' | 'continents';
type RegionHealthCategory = 'propagated' | 'variance' | 'failed';

interface StatusSlice {
  key: RegionHealthCategory;
  label: string;
  count: number;
  color: string;
}

interface TooltipInfo {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  metric: string;
  statusLabel: string;
  statusColor: string;
}

function classifyRegion(
  region: RegionalCheckpointResult,
  expectedValue: string
): RegionHealthCategory {
  if (region.status !== 'resolved' || region.answers.length === 0) {
    return 'failed';
  }
  const trimmed = expectedValue.trim().toLowerCase();
  if (trimmed) {
    const matchesExpected = region.answers.some((a) =>
      a.value.toLowerCase().includes(trimmed)
    );
    return matchesExpected ? 'propagated' : 'variance';
  }
  return region.matchesConsensus ? 'propagated' : 'variance';
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

export default function GlobalHealthChart({
  regions,
  expectedValue,
  selectedRegionId,
  onSelectRegion,
}: GlobalHealthChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('regions');
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [barContainerWidth, setBarContainerWidth] = useState<number>(640);

  const isDark = useDarkModeObserver();
  const donutSvgRef = useRef<SVGSVGElement | null>(null);
  const barSvgRef = useRef<SVGSVGElement | null>(null);
  const barContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = barContainerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 0) setBarContainerWidth(next);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stats = useMemo(() => {
    const classified = regions.map((r) => ({
      region: r,
      category: classifyRegion(r, expectedValue),
    }));

    const propagatedCount = classified.filter((c) => c.category === 'propagated').length;
    const varianceCount = classified.filter((c) => c.category === 'variance').length;
    const failedCount = classified.filter((c) => c.category === 'failed').length;

    const latencies = regions.map((r) => r.latencyMs).filter((ms) => Number.isFinite(ms));
    const sortedLatencies = [...latencies].sort((a, b) => a - b);

    const avgLatency = Math.round(d3.mean(latencies) ?? 0);
    const p95Latency = Math.round(d3.quantile(sortedLatencies, 0.95) ?? 0);
    const fastestNode = [...regions].sort((a, b) => a.latencyMs - b.latencyMs)[0] ?? null;
    const healthPercent =
      regions.length > 0 ? Math.round((propagatedCount / regions.length) * 100) : 0;

    const slices: StatusSlice[] = [
      {
        key: 'propagated',
        label: expectedValue.trim() ? 'Matches Target' : 'Propagated',
        count: propagatedCount,
        color: isDark ? '#22C55E' : '#16A34A',
      },
      {
        key: 'variance',
        label: expectedValue.trim() ? 'Mismatch' : 'Geo Variance',
        count: varianceCount,
        color: isDark ? '#FBBF24' : '#D97706',
      },
      {
        key: 'failed',
        label: 'Failed / Unresolved',
        count: failedCount,
        color: isDark ? '#F87171' : '#DC2626',
      },
    ];

    const sortedRegions = [...classified].sort((a, b) => a.region.latencyMs - b.region.latencyMs);

    const continentRollup = Array.from(
      d3.rollup(
        classified,
        (items) => {
          const avgMs = Math.round(d3.mean(items, (i) => i.region.latencyMs) ?? 0);
          const okCount = items.filter((i) => i.category === 'propagated').length;
          return {
            avgMs,
            okCount,
            totalCount: items.length,
            healthRatio: items.length > 0 ? okCount / items.length : 0,
          };
        },
        (item) => item.region.continent
      ),
      ([continent, summary]) => ({ continent, ...summary })
    ).sort((a, b) => a.avgMs - b.avgMs);

    return {
      classified,
      slices,
      propagatedCount,
      varianceCount,
      failedCount,
      avgLatency,
      p95Latency,
      fastestNode,
      healthPercent,
      sortedRegions,
      continentRollup,
    };
  }, [regions, expectedValue, isDark]);

  // Render D3 Donut Chart for Propagation Status Distribution
  useEffect(() => {
    const svgEl = donutSvgRef.current;
    if (!svgEl || regions.length === 0) return;

    const size = 184;
    const radius = size / 2;
    const innerRadius = 56;
    const outerRadius = 82;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${size} ${size}`)
      .append('g')
      .attr('transform', `translate(${radius}, ${radius})`);

    const activeSlices = stats.slices.filter((s) => s.count > 0);
    const pie = d3
      .pie<StatusSlice>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(activeSlices.length > 1 ? 0.035 : 0);

    const arc = d3
      .arc<d3.PieArcDatum<StatusSlice>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(4);

    g.selectAll('path.donut-slice')
      .data(pie(activeSlices))
      .join('path')
      .attr('class', 'donut-slice')
      .attr('d', (d) => arc(d) ?? '')
      .attr('fill', (d) => d.data.color)
      .attr('stroke', isDark ? '#0F172A' : '#FFFFFF')
      .attr('stroke-width', 1.5);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('fill', isDark ? '#F8FAFC' : '#0F172A')
      .style('font-size', '24px')
      .style('font-weight', '700')
      .style('font-variant-numeric', 'tabular-nums')
      .text(`${stats.healthPercent}%`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.45em')
      .attr('fill', isDark ? '#94A3B8' : '#64748B')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .text(`${stats.propagatedCount}/${regions.length} healthy`);
  }, [regions.length, stats, isDark]);

  // Render D3 Latency & Health Bar Chart
  useEffect(() => {
    const svgEl = barSvgRef.current;
    if (!svgEl || regions.length === 0) return;

    const height = chartMode === 'regions' ? 248 : 228;
    const width = Math.max(320, barContainerWidth);
    const margin = {
      top: 18,
      right: 16,
      bottom: chartMode === 'regions' ? 58 : 44,
      left: 46,
    };
    const innerWidth = Math.max(120, width - margin.left - margin.right);
    const innerHeight = Math.max(80, height - margin.top - margin.bottom);

    const axisTextColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? '#1E293B' : '#E2E8F0';
    const highlightStroke = isDark ? '#38BDF8' : '#0284C7';

    const categoryColor = (cat: RegionHealthCategory) => {
      if (cat === 'propagated') return isDark ? '#22C55E' : '#16A34A';
      if (cat === 'variance') return isDark ? '#FBBF24' : '#D97706';
      return isDark ? '#F87171' : '#DC2626';
    };

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    if (chartMode === 'regions') {
      const items = stats.sortedRegions;
      const maxMs = Math.max(100, (d3.max(items, (d) => d.region.latencyMs) ?? 100) * 1.12);

      const xScale = d3
        .scaleBand<string>()
        .domain(items.map((d) => d.region.id))
        .range([0, innerWidth])
        .padding(0.24);

      const yScale = d3
        .scaleLinear()
        .domain([0, maxMs])
        .nice()
        .range([innerHeight, 0]);

      // Horizontal gridlines
      g.append('g')
        .call(
          d3
            .axisLeft(yScale)
            .ticks(4)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .call((axisG) => axisG.select('.domain').remove())
        .call((axisG) =>
          axisG
            .selectAll('line')
            .attr('stroke', gridColor)
            .attr('stroke-dasharray', '2 3')
        );

      // Y axis
      g.append('g')
        .call(
          d3
            .axisLeft(yScale)
            .ticks(4)
            .tickFormat((d) => `${d}ms`)
        )
        .call((axisG) => axisG.select('.domain').remove())
        .call((axisG) =>
          axisG
            .selectAll('text')
            .attr('fill', axisTextColor)
            .style('font-size', '10px')
            .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        );

      // X axis with short city labels
      const labelById = new Map(items.map((d) => [d.region.id, d.region.city]));
      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(
          d3.axisBottom(xScale).tickFormat((id) => {
            const city = labelById.get(id) ?? id;
            return city.length > 10 ? `${city.slice(0, 9)}…` : city;
          })
        )
        .call((axisG) => axisG.select('.domain').attr('stroke', gridColor))
        .call((axisG) => axisG.selectAll('.tick line').remove())
        .call((axisG) =>
          axisG
            .selectAll('text')
            .attr('fill', axisTextColor)
            .style('font-size', '10px')
            .attr('text-anchor', 'end')
            .attr('dx', '-0.45em')
            .attr('dy', '0.2em')
            .attr('transform', 'rotate(-34)')
        );

      // Average latency reference line
      if (stats.avgLatency > 0) {
        const avgY = yScale(stats.avgLatency);
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', avgY)
          .attr('y2', avgY)
          .attr('stroke', isDark ? '#38BDF8' : '#0284C7')
          .attr('stroke-width', 1.25)
          .attr('stroke-dasharray', '4 3');

        g.append('text')
          .attr('x', innerWidth - 4)
          .attr('y', Math.max(10, avgY - 5))
          .attr('text-anchor', 'end')
          .attr('fill', isDark ? '#38BDF8' : '#0284C7')
          .style('font-size', '10px')
          .style('font-weight', '600')
          .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
          .text(`Avg ${stats.avgLatency} ms`);
      }

      // Bars for all 18 checkpoints
      g.selectAll('rect.region-bar')
        .data(items)
        .join('rect')
        .attr('class', 'region-bar')
        .attr('x', (d) => xScale(d.region.id) ?? 0)
        .attr('y', (d) => yScale(d.region.latencyMs))
        .attr('width', xScale.bandwidth())
        .attr('height', (d) => Math.max(2, innerHeight - yScale(d.region.latencyMs)))
        .attr('rx', 3)
        .attr('fill', (d) => categoryColor(d.category))
        .attr('opacity', (d) =>
          selectedRegionId && selectedRegionId !== d.region.id ? 0.45 : 0.92
        )
        .attr('stroke', (d) =>
          selectedRegionId === d.region.id ? highlightStroke : 'none'
        )
        .attr('stroke-width', (d) => (selectedRegionId === d.region.id ? 2 : 0))
        .style('cursor', 'pointer')
        .on('mouseenter', function (_event, d) {
          d3.select(this).attr('opacity', 1);
          const barX = (xScale(d.region.id) ?? 0) + xScale.bandwidth() / 2 + margin.left;
          const barY = yScale(d.region.latencyMs) + margin.top;
          const statusLabel =
            d.category === 'propagated'
              ? 'Propagated'
              : d.category === 'variance'
                ? 'Variance / Mismatch'
                : 'Unresolved';
          setTooltip({
            x: barX,
            y: barY,
            title: `${d.region.city}, ${d.region.countryCode}`,
            subtitle: `${d.region.provider} · ${d.region.continent}`,
            metric: `${d.region.latencyMs} ms`,
            statusLabel,
            statusColor: categoryColor(d.category),
          });
        })
        .on('mouseleave', function (_event, d) {
          d3.select(this).attr(
            'opacity',
            selectedRegionId && selectedRegionId !== d.region.id ? 0.45 : 0.92
          );
          setTooltip(null);
        })
        .on('click', (_event, d) => {
          onSelectRegion(selectedRegionId === d.region.id ? null : d.region.id);
        });
    } else {
      const items = stats.continentRollup;
      const maxMs = Math.max(100, (d3.max(items, (d) => d.avgMs) ?? 100) * 1.15);

      const xScale = d3
        .scaleBand<string>()
        .domain(items.map((d) => d.continent))
        .range([0, innerWidth])
        .padding(0.32);

      const yScale = d3
        .scaleLinear()
        .domain([0, maxMs])
        .nice()
        .range([innerHeight, 0]);

      g.append('g')
        .call(
          d3
            .axisLeft(yScale)
            .ticks(4)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .call((axisG) => axisG.select('.domain').remove())
        .call((axisG) =>
          axisG
            .selectAll('line')
            .attr('stroke', gridColor)
            .attr('stroke-dasharray', '2 3')
        );

      g.append('g')
        .call(
          d3
            .axisLeft(yScale)
            .ticks(4)
            .tickFormat((d) => `${d}ms`)
        )
        .call((axisG) => axisG.select('.domain').remove())
        .call((axisG) =>
          axisG
            .selectAll('text')
            .attr('fill', axisTextColor)
            .style('font-size', '10px')
            .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        );

      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(
          d3.axisBottom(xScale).tickFormat((c) => {
            if (c === 'Middle East & Africa') return 'ME & Africa';
            if (c === 'North America') return 'N. America';
            if (c === 'South America') return 'S. America';
            return c;
          })
        )
        .call((axisG) => axisG.select('.domain').attr('stroke', gridColor))
        .call((axisG) => axisG.selectAll('.tick line').remove())
        .call((axisG) =>
          axisG
            .selectAll('text')
            .attr('fill', axisTextColor)
            .style('font-size', '10px')
        );

      const fillForContinent = (ratio: number) => {
        if (ratio === 1) return isDark ? '#22C55E' : '#16A34A';
        if (ratio >= 0.5) return isDark ? '#FBBF24' : '#D97706';
        return isDark ? '#F87171' : '#DC2626';
      };

      g.selectAll('rect.continent-bar')
        .data(items)
        .join('rect')
        .attr('class', 'continent-bar')
        .attr('x', (d) => xScale(d.continent) ?? 0)
        .attr('y', (d) => yScale(d.avgMs))
        .attr('width', xScale.bandwidth())
        .attr('height', (d) => Math.max(2, innerHeight - yScale(d.avgMs)))
        .attr('rx', 4)
        .attr('fill', (d) => fillForContinent(d.healthRatio))
        .attr('opacity', 0.92)
        .on('mouseenter', function (_event, d) {
          d3.select(this).attr('opacity', 1);
          const barX = (xScale(d.continent) ?? 0) + xScale.bandwidth() / 2 + margin.left;
          const barY = yScale(d.avgMs) + margin.top;
          setTooltip({
            x: barX,
            y: barY,
            title: d.continent,
            subtitle: `${d.okCount}/${d.totalCount} checkpoints healthy`,
            metric: `${d.avgMs} ms avg`,
            statusLabel: d.healthRatio === 1 ? '100% Propagated' : `${Math.round(d.healthRatio * 100)}% Healthy`,
            statusColor: fillForContinent(d.healthRatio),
          });
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', 0.92);
          setTooltip(null);
        });

      g.selectAll('text.continent-value')
        .data(items)
        .join('text')
        .attr('class', 'continent-value')
        .attr('x', (d) => (xScale(d.continent) ?? 0) + xScale.bandwidth() / 2)
        .attr('y', (d) => yScale(d.avgMs) - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', axisTextColor)
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text((d) => `${d.okCount}/${d.totalCount} · ${d.avgMs}ms`);
    }
  }, [regions.length, chartMode, barContainerWidth, stats, selectedRegionId, isDark, onSelectRegion]);

  if (regions.length === 0) return null;

  return (
    <section
      aria-labelledby="global-health-chart-heading"
      dir="ltr"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      {/* Header Strip + KPI Metrics */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
          <h3
            id="global-health-chart-heading"
            className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Global Health &amp; Latency Distribution ({regions.length} Regions)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>
              Health: <strong className="text-slate-900 dark:text-slate-100">{stats.healthPercent}%</strong>
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            <span>
              Avg: <strong className="font-mono text-slate-900 dark:text-slate-100">{stats.avgLatency} ms</strong>
            </span>
          </span>
          <span>
            P95: <strong className="font-mono text-slate-900 dark:text-slate-100">{stats.p95Latency} ms</strong>
          </span>
          {stats.fastestNode && (
            <span>
              Fastest:{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                {stats.fastestNode.city} ({stats.fastestNode.latencyMs} ms)
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Two-Column D3 Charts */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: D3 Propagation Status Donut */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center gap-4 lg:border-r lg:border-slate-100 dark:lg:border-slate-800 lg:pr-5">
          <div className="w-[184px] h-[184px] shrink-0">
            <svg
              ref={donutSvgRef}
              className="w-full h-full block"
              role="img"
              aria-label={`Global propagation health is ${stats.healthPercent}% (${stats.propagatedCount} of ${regions.length} regions healthy)`}
            />
          </div>

          <div className="w-full max-w-[240px] space-y-1.5 text-xs">
            {stats.slices.map((slice) => (
              <div
                key={slice.key}
                className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-300"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  <span>{slice.label}</span>
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {slice.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: D3 Latency Distribution Bar Chart */}
        <div className="lg:col-span-8 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <BarChart3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>
                {chartMode === 'regions'
                  ? 'Resolver Query Latency (Click a bar to highlight region)'
                  : 'Average Latency & Health by Continent'}
              </span>
            </div>

            <div
              role="tablist"
              aria-label="Latency chart grouping"
              className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70"
            >
              <button
                type="button"
                role="tab"
                aria-selected={chartMode === 'regions'}
                onClick={() => setChartMode('regions')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  chartMode === 'regions'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                18 Regions
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chartMode === 'continents'}
                onClick={() => setChartMode('continents')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  chartMode === 'continents'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                By Continent
              </button>
            </div>
          </div>

          <div ref={barContainerRef} className="relative w-full">
            <svg
              ref={barSvgRef}
              className="w-full block overflow-visible"
              role="img"
              aria-label="D3 bar chart plotting query latency and propagation status across global DNS regions"
            />

            {tooltip && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full -mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-lg backdrop-blur-xs text-xs whitespace-nowrap"
                style={{
                  left: `${Math.min(Math.max(tooltip.x, 80), Math.max(80, barContainerWidth - 80))}px`,
                  top: `${Math.max(tooltip.y, 44)}px`,
                }}
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {tooltip.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tooltip.subtitle}
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 font-mono text-[11px]">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {tooltip.metric}
                  </span>
                  <span style={{ color: tooltip.statusColor }} className="font-semibold">
                    {tooltip.statusLabel}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
