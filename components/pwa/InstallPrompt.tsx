'use client';

import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  canShowInstallPrompt,
  showInstallPrompt,
  isStandalone,
  getPlatform,
  onInstallStateChange,
  getInstallStats,
  updateInstallStats,
} from '@/lib/pwa/install-prompt';

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const platform = getPlatform();

  useEffect(() => {
    if (isStandalone()) {
      return;
    }

    const unsubscribe = onInstallStateChange(setCanInstall);

    const stats = getInstallStats();
    if (canShowInstallPrompt() && stats.ratingCount >= 3 && stats.promptShownCount === 0) {
      setTimeout(() => setShowPrompt(true), 2000);
    }

    return unsubscribe;
  }, []);

  const handleInstall = async () => {
    const accepted = await showInstallPrompt();

    if (accepted) {
      setShowPrompt(false);
    } else {
      const stats = getInstallStats();
      updateInstallStats({
        userDismissedCount: stats.userDismissedCount + 1,
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    const stats = getInstallStats();
    updateInstallStats({
      userDismissedCount: stats.userDismissedCount + 1,
      lastPromptDate: new Date().toISOString(),
    });
  };

  if (!canInstall || !showPrompt || isStandalone()) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40"
      >
        <div className="bg-gradient-to-br from-tomato-500 to-orange-500 rounded-2xl shadow-2xl p-6 text-white">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">
                Install TasteTribe
              </h3>
              <p className="text-white/90 text-sm leading-relaxed">
                Install our app for a faster, more convenient experience. Access TasteTribe instantly from your home screen!
              </p>
            </div>
          </div>

          {platform === 'ios' ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
              <p className="text-sm mb-2 font-medium">To install on iOS:</p>
              <ol className="text-sm space-y-1 list-decimal list-inside text-white/90">
                <li>Tap the Share button in Safari</li>
                <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</li>
                <li>Tap &ldquo;Add&rdquo; to confirm</li>
              </ol>
            </div>
          ) : (
            <button
              onClick={handleInstall}
              className="w-full bg-white text-tomato-600 font-semibold py-3 px-6 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Download className="h-5 w-5" />
              Install App
            </button>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-white/70">
            <span>Free • No account required</span>
            <span>2MB download</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
