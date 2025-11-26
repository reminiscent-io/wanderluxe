import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-6 md:right-6 md:max-w-sm md:ml-auto md:mr-0">
      <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-lg">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">Install WanderLuxe</h3>
              <p className="text-sm text-amber-800 mb-3">
                Add WanderLuxe to your home screen for quick access and offline viewing of your itineraries.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="ml-2 text-amber-700 hover:text-amber-900 flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              size="sm"
            >
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="flex-1 border-amber-300 text-amber-900 hover:bg-amber-100"
              size="sm"
            >
              Not Now
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
