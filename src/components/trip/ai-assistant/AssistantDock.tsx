import React from 'react';
import { Sparkles } from 'lucide-react';

interface AssistantDockProps {
  open: boolean;
  mode: 'docked' | 'overlay';
  onOpen: () => void;
  children: React.ReactNode;
}

/**
 * Desktop-only (lg+) positioning shell for the Trip Assistant.
 * Children stay mounted across collapse/expand and mode switches so
 * panel-local state (streaming, extracted items) survives — visibility
 * is CSS-only, never a conditional unmount.
 */
const AssistantDock: React.FC<AssistantDockProps> = ({ open, mode, onOpen, children }) => {
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
            className="sticky"
            style={{
              top: 'calc(var(--app-nav-h, 56px) + 0.5rem)',
              height: 'calc(100dvh - var(--app-nav-h, 56px) - 1rem)',
            }}
          >
            {children}
          </div>
        ) : (
          <div className="h-[min(70vh,640px)] rounded-card shadow-warm-xl">
            {children}
          </div>
        )}
      </div>

      {!open && (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open Trip Assistant"
          className="hidden lg:flex fixed bottom-6 right-6 z-40 h-14 w-14 items-center justify-center rounded-full bg-earth-500 text-background shadow-warm-lg transition-transform hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default AssistantDock;
