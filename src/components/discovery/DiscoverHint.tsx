import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirstRun, type DiscoveryKey } from '@/hooks/useFirstRun';

interface DiscoverHintProps {
  /** Which one-time hint this is. See DiscoveryKey for the full set. */
  hint: DiscoveryKey;
  /** Gate on the trigger condition — the hint only fires once this is true. */
  when?: boolean;
  /** One plain sentence. Say what the user can do, not what the feature is called. */
  children: React.ReactNode;
  /** Optional call to action. Firing it also marks the hint seen. */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * A single dismissible line that appears once, beside the feature it describes.
 *
 * Deliberately not a tour: it renders in place at the moment the capability
 * became relevant, and never returns once acknowledged.
 */
export function DiscoverHint({
  hint,
  when = true,
  children,
  actionLabel,
  onAction,
  className,
}: DiscoverHintProps) {
  const { isUnseen, dismiss } = useFirstRun(hint, when);
  const prefersReducedMotion = useReducedMotion();

  if (!isUnseen) return null;

  const handleAction = () => {
    dismiss();
    onAction?.();
  };

  return (
    <motion.div
      role="status"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex items-start gap-3 rounded-lg border border-sunset-200 bg-sunset-50 px-3 py-2.5',
        className
      )}
    >
      <Lightbulb
        className="mt-0.5 h-4 w-4 shrink-0 text-sunset-600"
        strokeWidth={1.75}
        aria-hidden="true"
      />

      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm leading-snug text-foreground">{children}</span>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={handleAction}
            className="rounded text-sm font-medium text-sunset-600 underline underline-offset-2 transition-colors hover:text-sunset-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-400"
          >
            {actionLabel}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="-my-2.5 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-sunset-600 transition-colors hover:text-sunset-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-400"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export default DiscoverHint;
