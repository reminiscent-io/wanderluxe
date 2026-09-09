import React from 'react';
import { Sparkles } from 'lucide-react';

interface AssistantDockProps {
  open: boolean;
  mode: 'docked' | 'overlay';
  onOpen: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Desktop-only (lg+) positioning shell for the Trip Assistant.
 * Children stay mounted across collapse/expand and mode switches so
 * panel-local state (streaming, extracted items) survives — visibility
 * is CSS-only, never a conditional unmount.
 */
const AssistantDock: React.FC<AssistantDockProps> = ({ open, mode, onOpen, action, children }) => {
  let wrapperClass = 'hidden';
  if (open) {
    wrapperClass =
      mode === 'docked'
        ? 'hidden lg:block lg:w-[42%] lg:pr-6 lg:pt-6'
        : 'hidden lg:block fixed bottom-6 right-6 z-40 w-[400px] max-w-[calc(100vw-3rem)]';
  }

  return (
    <>
      <div className={wrapperClass} data-testid="assistant-dock">
        {mode === 'docked' ? (
          <div
            className="sticky flex flex-col"
            style={{
              top: 'calc(var(--app-nav-h, 56px) + 0.5rem)',
              height: 'calc(100dvh - var(--app-nav-h, 56px) - 1rem)',
            }}
          >
            {open && action && <div className="flex shrink-0 justify-end pb-2">{action}</div>}
            <div className="min-h-0 flex-1">{children}</div>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            {open && action}
            <div className="h-[min(70vh,640px)] w-full rounded-card shadow-warm-xl">
              {children}
            </div>
          </div>
        )}
      </div>

      {!open && (
        <div className="hidden lg:flex fixed bottom-6 right-6 z-40 flex-col items-end gap-2">
          {action}
          <button
            type="button"
            onClick={onOpen}
            aria-label="Open Trip Assistant"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-earth-500 text-background shadow-warm-lg transition-transform hover:scale-105"
          >
            <Sparkles className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
};

export default AssistantDock;
