import { useEffect, useState } from 'react';
import { AlertCircle, Download, Monitor, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'inline';
}

function formatDownloadedDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function PWAInstallButton({ variant = 'header' }: PWAInstallButtonProps) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isPrompting,
    hasDownloadedBefore,
    downloadedAt,
    markAsDownloaded,
    install,
  } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [showRedownloadConfirm, setShowRedownloadConfirm] = useState(false);

  useEffect(() => {
    if (!showRedownloadConfirm && !showGuide) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRedownloadConfirm(false);
        setShowGuide(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRedownloadConfirm, showGuide]);

  if (isInstalled) {
    return null;
  }

  const startInstallFlow = async () => {
    if (isPrompting) return;
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        markAsDownloaded();
        setShowGuide(false);
      } else {
        setShowGuide(true);
      }
      return;
    }
    markAsDownloaded();
    setShowGuide(true);
  };

  const handleClick = async () => {
    // Prevent redundant prompts if a dialog or native install prompt is already active
    if (isPrompting || showRedownloadConfirm || showGuide) {
      return;
    }

    if (hasDownloadedBefore) {
      setShowGuide(false);
      setShowRedownloadConfirm(true);
      return;
    }

    await startInstallFlow();
  };

  const handleConfirmRedownload = async () => {
    setShowRedownloadConfirm(false);
    await startInstallFlow();
  };

  const formattedDate = formatDownloadedDate(downloadedAt);

  const buttonClasses =
    variant === 'header'
      ? 'h-9 px-3.5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-xs font-semibold shadow-xs shadow-emerald-700/20 dark:shadow-emerald-400/15 inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
      : 'h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPrompting}
        aria-busy={isPrompting}
        aria-label={
          hasDownloadedBefore
            ? 'DNS Locator already downloaded — click to confirm re-install'
            : 'Install DNS Locator app'
        }
        className={buttonClasses}
      >
        <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Install App</span>
      </button>

      {showRedownloadConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-redownload-title"
          aria-describedby="pwa-redownload-desc"
          onClick={() => setShowRedownloadConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="pwa-redownload-title"
                    className="text-base font-bold text-slate-900 dark:text-slate-100"
                  >
                    App Already Downloaded
                  </h2>
                  <p
                    id="pwa-redownload-desc"
                    className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed"
                  >
                    You have already downloaded or installed DNS Locator on this device
                    {formattedDate ? ` (${formattedDate})` : ''}. Do you want to re-install or download it again?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRedownloadConfirm(false)}
                aria-label="Close confirmation dialog"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowRedownloadConfirm(false)}
                className="h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRedownload}
                className="h-9 px-4 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-xs font-semibold shadow-xs shadow-emerald-700/20 dark:shadow-emerald-400/15 transition-all cursor-pointer"
              >
                Yes, Download Again
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/favicon.svg"
                  alt=""
                  width={36}
                  height={36}
                  className="w-9 h-9 shrink-0"
                />
                <div>
                  <h2
                    id="pwa-install-title"
                    className="text-base font-bold text-slate-900 dark:text-slate-100"
                  >
                    Install DNS Locator
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use as a standalone app on mobile and desktop
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close installation guide"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  <span>iPhone &amp; iPad (Safari)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
                  <li>Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> to launch DNS Locator full-screen.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    <Monitor className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                    <span>Desktop (Windows, macOS, Linux)</span>
                  </div>
                  <p className="leading-relaxed">
                    In <strong>Chrome</strong> or <strong>Edge</strong>, click the install icon in the right side of the address bar (or open the browser menu and select <strong>Install DNS Locator</strong>). In <strong>Safari on macOS</strong>, choose <strong>File → Add to Dock</strong>.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                    <span>Mobile (Android &amp; iOS)</span>
                  </div>
                  <p className="leading-relaxed">
                    On <strong>Android Chrome</strong>, open the browser menu and tap <strong>Install app</strong>. On <strong>iPhone / iPad Safari</strong>, tap <strong>Share → Add to Home Screen</strong>.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                markAsDownloaded();
                setShowGuide(false);
              }}
              className="w-full h-10 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
