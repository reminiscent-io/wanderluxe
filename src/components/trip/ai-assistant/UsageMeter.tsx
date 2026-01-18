import React from 'react';
import { cn } from '@/lib/utils';
import { Zap, Crown } from 'lucide-react';
import type { AIUsageInfo } from '@/types/ai-assistant';

interface UsageMeterProps {
  usage: AIUsageInfo | null;
  onUpgradeClick?: () => void;
}

const UsageMeter: React.FC<UsageMeterProps> = ({ usage, onUpgradeClick }) => {
  if (!usage) return null;

  const isPro = usage.tier === 'pro';
  const isUnlimited = usage.limit === -1 || isPro;
  const percentage = isUnlimited ? 0 : Math.min((usage.used / usage.limit) * 100, 100);
  const isLow = !isUnlimited && usage.used >= usage.limit * 0.8;
  const isExhausted = !isUnlimited && usage.used >= usage.limit;

  // Format reset time
  const formatResetTime = () => {
    if (!usage.resetAt) return '';
    try {
      const reset = new Date(usage.resetAt);
      const now = new Date();
      const hoursUntilReset = Math.ceil((reset.getTime() - now.getTime()) / (1000 * 60 * 60));

      if (hoursUntilReset <= 1) return 'Resets soon';
      if (hoursUntilReset < 24) return `Resets in ${hoursUntilReset}h`;
      return 'Resets at midnight';
    } catch {
      return '';
    }
  };

  if (isPro || isUnlimited) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-t border-amber-100">
        <Crown className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-700">Pro - Unlimited messages</span>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 bg-sand-50 border-t border-sand-100">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Zap className={cn('w-3.5 h-3.5', isLow ? 'text-amber-500' : 'text-sand-400')} />
          <span className={cn(
            'text-xs font-medium',
            isExhausted ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-earth-600'
          )}>
            {usage.used}/{usage.limit} messages today
          </span>
        </div>
        {formatResetTime() && (
          <span className="text-xs text-sand-400">{formatResetTime()}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-sand-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isExhausted ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-earth-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Upgrade CTA for low/exhausted users */}
      {isLow && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className={cn(
            'mt-2 text-xs font-medium underline underline-offset-2',
            isExhausted ? 'text-red-600 hover:text-red-700' : 'text-amber-600 hover:text-amber-700'
          )}
        >
          {isExhausted ? 'Upgrade to continue chatting' : 'Upgrade for unlimited messages'}
        </button>
      )}
    </div>
  );
};

export default UsageMeter;
