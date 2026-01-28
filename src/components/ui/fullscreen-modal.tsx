import { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { cn } from '@/lib/utils';

interface FullScreenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  /** Whether clicking the overlay should close the modal */
  closeOnOverlayClick?: boolean;
}

/**
 * A simple full-screen modal that uses React Portal to render at document.body level.
 * Designed specifically for mobile chat interfaces that need to handle keyboard correctly.
 *
 * Unlike Vaul's drawer, this component:
 * - Uses Visual Viewport API to size correctly when keyboard opens
 * - Doesn't fight with our positioning styles
 * - Has no swipe gestures (use close button/overlay click instead)
 */
export function FullScreenModal({
  open,
  onOpenChange,
  children,
  className,
  closeOnOverlayClick = true,
}: FullScreenModalProps) {
  const viewport = useVisualViewport();

  // Body scroll lock effect
  useEffect(() => {
    if (open) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onOpenChange(false);
    }
  };

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[99] bg-black/80 animate-in fade-in-0 duration-200"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      {/* Content */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed z-[100] bg-white flex flex-col animate-in slide-in-from-bottom-4 fade-in-0 duration-200',
          className
        )}
        style={{
          top: viewport.offsetTop,
          left: 0,
          right: 0,
          height: viewport.height,
          overscrollBehavior: 'contain',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

export default FullScreenModal;
