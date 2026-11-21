import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const APP_DOWNLOADED_KEY = 'dnslocator_app_downloaded_v1';
const PWA_SYNC_EVENT = 'dnslocator:pwa-downloaded';

function readDownloadedAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(APP_DOWNLOADED_KEY);
  } catch {
    return null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [downloadedAt, setDownloadedAt] = useState<string | null>(() => readDownloadedAt());

  const hasDownloadedBefore = Boolean(downloadedAt);

  const markAsDownloaded = useCallback(() => {
    const timestamp = new Date().toISOString();
    setDownloadedAt(timestamp);
    try {
      window.localStorage.setItem(APP_DOWNLOADED_KEY, timestamp);
    } catch {
      // Ignore storage write errors
    }
    try {
      window.dispatchEvent(new CustomEvent(PWA_SYNC_EVENT, { detail: timestamp }));
    } catch {
      // Ignore event dispatch errors
    }
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);
    if (isStandalone) {
      markAsDownloaded();
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (ua.includes('mac') && 'ontouchend' in document);
    setIsIOS(isIOSDevice);

    const navWithRelated = window.navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<Array<{ platform?: string; url?: string; id?: string }>>;
    };
    if (typeof navWithRelated.getInstalledRelatedApps === 'function') {
      navWithRelated
        .getInstalledRelatedApps()
        .then((apps) => {
          if (Array.isArray(apps) && apps.length > 0) {
            markAsDownloaded();
          }
        })
        .catch(() => {
          // Ignore unsupported browser errors
        });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      markAsDownloaded();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === APP_DOWNLOADED_KEY) {
        setDownloadedAt(e.newValue);
      }
    };

    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setDownloadedAt(detail);
      } else {
        setDownloadedAt(readDownloadedAt());
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('storage', handleStorage);
    window.addEventListener(PWA_SYNC_EVENT, handleSync);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(PWA_SYNC_EVENT, handleSync);
    };
  }, [markAsDownloaded]);

  const install = useCallback(async () => {
    if (!deferredPrompt || isPrompting) return false;
    setIsPrompting(true);
    const promptEvent = deferredPrompt;
    // Clear immediately because BeforeInstallPromptEvent.prompt() can only be invoked once
    setDeferredPrompt(null);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        markAsDownloaded();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsPrompting(false);
    }
  }, [deferredPrompt, isPrompting, markAsDownloaded]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isPrompting,
    hasDownloadedBefore,
    downloadedAt,
    markAsDownloaded,
    install,
  };
}
