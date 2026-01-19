import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, Clock, Loader2 } from 'lucide-react';
import type { AIUsageInfo } from '@/types/ai-assistant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usage?: AIUsageInfo;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ open, onOpenChange, usage }) => {
  const [isLoading, setIsLoading] = useState(false);

  const getResetTime = () => {
    if (!usage?.resetAt) return '';
    try {
      const reset = new Date(usage.resetAt);
      const now = new Date();
      const hoursUntilReset = Math.ceil((reset.getTime() - now.getTime()) / (1000 * 60 * 60));

      if (hoursUntilReset <= 1) return 'less than an hour';
      return `${hoursUntilReset} hours`;
    } catch {
      return '';
    }
  };

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("Please sign in to upgrade");
        return;
      }

      const resp = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        let errorMessage = `Checkout failed (${resp.status})`;
        try {
          const errorData = await resp.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response wasn't JSON, use status-based message
        }
        console.error('Checkout API error:', resp.status, errorMessage);
        toast.error(errorMessage);
        return;
      }

      let data;
      try {
        data = await resp.json();
      } catch {
        console.error('Failed to parse checkout response');
        toast.error("Invalid response from server");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch (e: any) {
      console.error('Checkout error:', e);
      // Handle network errors specifically
      if (e instanceof TypeError && (e.message.includes('Load failed') || e.message.includes('Failed to fetch'))) {
        toast.error("Connection error - please check your internet and try again");
      } else {
        toast.error(e?.message || "Failed to start checkout");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-amber-600" />
          </div>
          <DialogTitle className="text-xl">You've reached today's limit</DialogTitle>
          <DialogDescription className="text-sand-600">
            Free accounts include 10 Trip Assistant messages per day.
            Upgrade to Pro for unlimited access across all your trips.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Pro plan card */}
          <div className="rounded-xl border-2 border-earth-500 bg-gradient-to-br from-earth-50 to-sand-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-earth-700">WanderLuxe Pro</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-earth-700">$3.99</span>
                <span className="text-sm text-sand-500">/month</span>
              </div>
            </div>

            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-earth-600">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Unlimited Trip Assistant messages</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-earth-600">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Priority AI responses</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-earth-600">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Early access to new features</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-earth-600">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Cancel anytime</span>
              </li>
            </ul>
          </div>

          {/* Reset timer */}
          {getResetTime() && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-sand-500">
              <Clock className="w-4 h-4" />
              <span>Free messages reset in {getResetTime()}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full bg-earth-500 hover:bg-earth-600 text-white"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Upgrade to Pro
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-sand-600 hover:text-earth-600"
          >
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
