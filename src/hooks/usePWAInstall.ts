import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect if already running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsInstalled(isStandalone);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Native browser install prompt (Chrome/Android)
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback: Show native browser share sheet to access "Add to Home Screen"
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'WanderLuxe',
            text: 'Add WanderLuxe to your home screen for offline access',
            url: window.location.href,
          });
        } catch (err) {
          // User cancelled
        }
      } else {
        // For browsers that don't support share API
        alert('To install WanderLuxe:\n\n1. Tap the Share button\n2. Scroll and tap "Add to Home Screen"');
      }
    }
  };

  return { canInstall: !isInstalled && (!!deferredPrompt || !!(navigator as any).share), handleInstall };
}
