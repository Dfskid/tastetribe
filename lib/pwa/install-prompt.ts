export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
let installListeners: Array<(canInstall: boolean) => void> = [];

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    console.log('[PWA] Install prompt available');
    notifyListeners(true);
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    notifyListeners(false);
  });
}

function notifyListeners(canInstall: boolean) {
  installListeners.forEach(listener => listener(canInstall));
}

export function onInstallStateChange(callback: (canInstall: boolean) => void): () => void {
  installListeners.push(callback);

  if (deferredPrompt) {
    callback(true);
  }

  return () => {
    installListeners = installListeners.filter(l => l !== callback);
  };
}

export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`[PWA] User ${outcome} the install prompt`);

    if (outcome === 'accepted') {
      deferredPrompt = null;
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PWA] Error showing install prompt:', error);
    return false;
  }
}

export function canShowInstallPrompt(): boolean {
  return deferredPrompt !== null;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function getPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';

  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }

  if (/android/.test(userAgent)) {
    return 'android';
  }

  return 'desktop';
}

interface InstallStats {
  promptShownCount: number;
  lastPromptDate: string | null;
  userDismissedCount: number;
  ratingCount: number;
}

const STATS_KEY = 'pwa-install-stats';

export function getInstallStats(): InstallStats {
  if (typeof window === 'undefined') {
    return {
      promptShownCount: 0,
      lastPromptDate: null,
      userDismissedCount: 0,
      ratingCount: 0,
    };
  }

  const stored = localStorage.getItem(STATS_KEY);
  if (!stored) {
    return {
      promptShownCount: 0,
      lastPromptDate: null,
      userDismissedCount: 0,
      ratingCount: 0,
    };
  }

  return JSON.parse(stored);
}

export function updateInstallStats(updates: Partial<InstallStats>): void {
  if (typeof window === 'undefined') return;

  const stats = getInstallStats();
  const newStats = { ...stats, ...updates };
  localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
}

export function incrementRatingCount(): void {
  const stats = getInstallStats();
  updateInstallStats({ ratingCount: stats.ratingCount + 1 });
}

export function shouldShowIntelligentPrompt(): boolean {
  if (isStandalone()) return false;
  if (!canShowInstallPrompt()) return false;

  const stats = getInstallStats();

  if (stats.userDismissedCount >= 3) {
    return false;
  }

  if (stats.ratingCount >= 3 && stats.promptShownCount === 0) {
    return true;
  }

  if (stats.lastPromptDate) {
    const daysSinceLastPrompt = Math.floor(
      (Date.now() - new Date(stats.lastPromptDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastPrompt < 7) {
      return false;
    }
  }

  if (stats.ratingCount >= 5 && stats.promptShownCount < 2) {
    return true;
  }

  return false;
}

export async function showIntelligentInstallPrompt(): Promise<boolean> {
  if (!shouldShowIntelligentPrompt()) {
    return false;
  }

  const stats = getInstallStats();
  updateInstallStats({
    promptShownCount: stats.promptShownCount + 1,
    lastPromptDate: new Date().toISOString(),
  });

  const accepted = await showInstallPrompt();

  if (!accepted) {
    updateInstallStats({
      userDismissedCount: stats.userDismissedCount + 1,
    });
  }

  return accepted;
}
