import React from 'react';
import { cn } from '@/lib/utils';
import { Zap, Crown, UserPlus } from 'lucide-react';
import type { AIUsageInfo } from '@/types/ai-assistant';

interface UsageMeterProps {
  usage: AIUsageInfo | null;
  onUpgradeClick?: () => void;
}

const UsageMeter: React.FC<UsageMeterProps> = ({ usage, onUpgradeClick }) => {
  if (!usage) return null;

  const isAnon = usage.tier === 'anon';
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

  // Chat is unlimited for every signed-in account, so a meter row is noise
  // for free users. Pro members keep their crown.
  if (isPro) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-t border-amber-100">
        <Crown className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-700">Pro · unlimited messages</span>
      </div>
    );
  }
  if (isUnlimited && !isAnon) return null;

  // Anonymous trial meter - compact single row with inline progress
  if (isAnon) {
    return (
      <div className="px-3 py-1.5 bg-sand-50/60 border-t border-border flex items-center gap-2">
        <Zap className={cn('w-3 h-3 flex-shrink-0', isLow ? 'text-amber-500' : 'text-muted-foreground')} />
        <div className="h-1 bg-sand-200 rounded-full overflow-hidden flex-1 max-w-[100px]">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              isExhausted ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-earth-500'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={cn(
          'text-[11px] tabular-nums',
          isExhausted ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-muted-foreground'
        )}>
          {usage.used}/{usage.limit} trial
        </span>
        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className={cn(
              'ml-auto text-[11px] font-medium flex items-center gap-1',
              isExhausted ? 'text-red-600 hover:text-red-700' : 'text-earth-600 hover:text-foreground'
            )}
          >
            <UserPlus className="w-3 h-3" />
            <span className="underline underline-offset-2">Sign up free</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 py-1.5 bg-sand-50/60 border-t border-border flex items-center gap-2">
      <Zap className={cn('w-3 h-3 flex-shrink-0', isLow ? 'text-amber-500' : 'text-muted-foreground')} />
      <div className="h-1 bg-sand-200 rounded-full overflow-hidden flex-1 max-w-[100px]">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isExhausted ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-earth-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn(
        'text-[11px] tabular-nums',
        isExhausted ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-muted-foreground'
      )}>
        {usage.used}/{usage.limit} today
      </span>
      {formatResetTime() && (
        <span className="text-[11px] tabular-nums text-muted-foreground/70">{formatResetTime()}</span>
      )}
      {isLow && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className={cn(
            'ml-auto text-[11px] font-medium underline underline-offset-2',
            isExhausted ? 'text-red-600 hover:text-red-700' : 'text-amber-600 hover:text-amber-700'
          )}
        >
          Upgrade
        </button>
      )}
    </div>
  );
};

export default UsageMeter;
