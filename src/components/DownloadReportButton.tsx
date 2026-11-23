import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { triggerReportDownload, type ReportFormat } from '../lib/report';
import type { DnsLookupResponse, PropagationResponse } from '../types/dns';

interface DownloadReportButtonProps {
  propagationData: PropagationResponse;
  zoneData?: DnsLookupResponse | null;
  expectedValue: string;
}

export default function DownloadReportButton({
  propagationData,
  zoneData,
  expectedValue,
}: DownloadReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadedFormat, setDownloadedFormat] = useState<ReportFormat | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleDownload = (format: ReportFormat) => {
    triggerReportDownload(propagationData, expectedValue, format, zoneData);
    setIsOpen(false);
    setDownloadedFormat(format);
    window.setTimeout(() => {
      setDownloadedFormat((prev) => (prev === format ? null : prev));
    }, 2200);
  };

  return (
    <div ref={containerRef} className="relative inline-block shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="h-9 px-3.5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-xs font-semibold shadow-xs shadow-emerald-700/20 dark:shadow-emerald-400/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
      >
        {downloadedFormat ? (
          <>
            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{downloadedFormat.toUpperCase()} Downloaded</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Download Report</span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Choose DNS propagation report format"
          className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1.5 z-30"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Export <span className="font-mono text-slate-800 dark:text-slate-200">{propagationData.domain}</span> ({propagationData.recordType})
            </p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleDownload('json')}
            className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-start gap-2.5 transition-colors cursor-pointer"
          >
            <FileJson className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Download JSON Report
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Structured summary, latency stats &amp; 18 regions
              </div>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleDownload('csv')}
            className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-start gap-2.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Download CSV Report
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Spreadsheet-ready regional checkpoint table
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
