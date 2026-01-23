import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useConsent } from '@/contexts/ConsentContext';

export default function CookieConsentBanner() {
  const { shouldShowBanner, acceptAll, acceptEssentialOnly, acceptCustom } = useConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  if (!shouldShowBanner) return null;

  const handleSavePreferences = () => {
    acceptCustom({
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <Card className="mx-auto max-w-2xl bg-white/95 backdrop-blur-sm border-sand-200 shadow-lg">
        <div className="p-4 md:p-5">
          {/* Main banner content */}
          <div className="flex items-start gap-3">
            <Cookie className="w-5 h-5 text-earth-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-sand-700">
                We use cookies to enhance your experience. Essential cookies are required for the site to function.
                You can choose to enable optional cookies for analytics and personalization.{' '}
                <Link to="/privacy" className="text-earth-600 hover:text-earth-700 underline">
                  Learn more
                </Link>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={acceptAll}
              className="bg-earth-500 hover:bg-earth-600 text-white"
              size="sm"
            >
              Accept All
            </Button>
            <Button
              onClick={acceptEssentialOnly}
              variant="outline"
              size="sm"
              className="border-sand-300 text-sand-700 hover:bg-sand-50"
            >
              Essential Only
            </Button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="ml-auto flex items-center gap-1 text-xs text-sand-500 hover:text-sand-700 transition-colors"
            >
              Customize
              {showDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Expandable details */}
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-sand-200 space-y-4">
              {/* Essential cookies - always on */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-sand-800">Essential Cookies</Label>
                  <p className="text-xs text-sand-500">Required for the website to function properly</p>
                </div>
                <Switch checked disabled className="data-[state=checked]:bg-earth-500" />
              </div>

              {/* Analytics cookies */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics-switch" className="text-sm font-medium text-sand-800">
                    Analytics Cookies
                  </Label>
                  <p className="text-xs text-sand-500">Help us understand how you use our site</p>
                </div>
                <Switch
                  id="analytics-switch"
                  checked={analyticsEnabled}
                  onCheckedChange={setAnalyticsEnabled}
                  className="data-[state=checked]:bg-earth-500"
                />
              </div>

              {/* Marketing cookies */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-switch" className="text-sm font-medium text-sand-800">
                    Marketing Cookies
                  </Label>
                  <p className="text-xs text-sand-500">Used for personalized content and ads</p>
                </div>
                <Switch
                  id="marketing-switch"
                  checked={marketingEnabled}
                  onCheckedChange={setMarketingEnabled}
                  className="data-[state=checked]:bg-earth-500"
                />
              </div>

              <Button
                onClick={handleSavePreferences}
                size="sm"
                className="w-full bg-earth-500 hover:bg-earth-600 text-white"
              >
                Save Preferences
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
