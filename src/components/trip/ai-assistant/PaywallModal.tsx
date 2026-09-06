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
import { Sparkles, Check, Clock, Loader2, UserPlus } from 'lucide-react';
import type { AIUsageInfo } from '@/types/ai-assistant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usage?: AIUsageInfo;
  isAnonymous?: boolean;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ open, onOpenChange, usage, isAnonymous }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
        toast.error("Sign in to upgrade");
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
    } catch (e: unknown) {
      console.error('Checkout error:', e);
      // Handle network errors specifically
      if (e instanceof TypeError && (e.message.includes('Load failed') || e.message.includes('Failed to fetch'))) {
        toast.error("Connection failed. Check your network and try again.");
      } else {
        toast.error(e instanceof Error ? e.message : "Failed to start checkout");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    onOpenChange(false);
    navigate('/auth');
  };

  // Anonymous sign-up variant
  if (isAnonymous) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-earth-100 flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6 text-earth-600" />
            </div>
            <DialogTitle className="font-display text-xl leading-tight tracking-tight">Sign up free to keep chatting</DialogTitle>
            <DialogDescription className="text-sand-600">
              You've used your {usage?.limit || 5} trial messages.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-card border border-border bg-sand-50/60 p-4">
              <span className="font-semibold text-foreground mb-3 block">Free account includes:</span>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-earth-600">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Unlimited AI chat</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-earth-600">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Save your conversations</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-earth-600">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Plan your own trips</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-earth-600">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Add items directly to itineraries</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="sunset"
              onClick={handleSignUp}
              className="w-full"
            >
              Sign up free
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Not now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Authenticated paywall variant (existing)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-amber-600" />
          </div>
          <DialogTitle className="font-display text-xl leading-tight tracking-tight">You've reached today's limit</DialogTitle>
          <DialogDescription className="text-sand-600">
            Your messages will reset soon — or go Pro for the full WanderLuxe.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Pro plan card */}
          <div className="rounded-card border-2 border-earth-500 bg-sand-50/60 p-4">
            <div className="flex items-end justify-between mb-3 gap-2">
              <span className="font-display text-lg leading-tight tracking-tight text-foreground">WanderLuxe Pro</span>
              <div className="text-right leading-none">
                <span className="font-display text-2xl tracking-tight tabular-nums text-foreground">$3.99</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </div>
            </div>

            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-earth-600">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Print Studio: keepsake itineraries designed by AI</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-earth-600">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>A custom palette, type, and theme for every trip</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-earth-600">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Early access to new features</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-earth-600">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Cancel anytime</span>
              </li>
            </ul>
          </div>

          {/* Reset timer */}
          {getResetTime() && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Free messages reset in {getResetTime()}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="sunset"
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Upgrade to Pro
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
