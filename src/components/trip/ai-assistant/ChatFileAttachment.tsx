import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ChatFileAttachment as ChatFileAttachmentType } from '@/types/ai-assistant';

// pdfjs-dist for PDF preview
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

interface ChatFileAttachmentProps {
  attachment: ChatFileAttachmentType | null;
  onAttach: (attachment: ChatFileAttachmentType) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_FILE_MB = 15;

const ChatFileAttachmentComponent: React.FC<ChatFileAttachmentProps> = ({
  attachment,
  onAttach,
  onRemove,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isConverting, setIsConverting] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPG, PNG, or PDF files are allowed.';
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return `File size must be under ${MAX_FILE_MB}MB.`;
    }
    return null;
  }, []);

  // Convert PDF first page to PNG for preview and extraction
  const pdfFirstPageToPng = async (pdfFile: File): Promise<File> => {
    const ab = await pdfFile.arrayBuffer();

    // @ts-expect-error - pdfjs-dist types may not be fully compatible with dynamic import
    const pdfjs = (await import('pdfjs-dist/build/pdf')) as {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (params: { data: ArrayBuffer }) => { promise: Promise<{ getPage: (n: number) => Promise<{ getViewport: (opts: { scale: number }) => { width: number; height: number }; render: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> }> };
    };
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

    const pdf = await pdfjs.getDocument({ data: ab }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );

    return new File([blob], pdfFile.name.replace(/\.pdf$/i, '.png'), {
      type: 'image/png',
      lastModified: Date.now(),
    });
  };

  const processFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    // Clear any existing attachment
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }

    if (file.type === 'application/pdf') {
      setIsConverting(true);
      try {
        const converted = await pdfFirstPageToPng(file);
        const previewUrl = URL.createObjectURL(converted);
        onAttach({
          file,
          previewUrl,
          isConverted: true,
          convertedFile: converted
        });
      } catch (e) {
        console.error('PDF conversion failed:', e);
        toast.error('Failed to preview PDF. Please try again.');
      } finally {
        setIsConverting(false);
      }
    } else {
      const previewUrl = URL.createObjectURL(file);
      onAttach({
        file,
        previewUrl,
        isConverted: false
      });
    }
  }, [attachment, onAttach, validateFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      processFile(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files?.length) {
      processFile(files[0]);
    }
  }, [disabled, processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      if (!navigator.clipboard || !('read' in navigator.clipboard)) {
        toast.info('Paste not supported. Use the attach button instead.');
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/') || type === 'application/pdf') {
            const blob = await item.getType(type);
            const ext = type.split('/')[1] || 'png';
            const pasted = new File([blob], `pasted.${ext}`, { type });
            processFile(pasted);
            return;
          }
        }
      }
      toast.info('No image or PDF found in clipboard.');
    } catch (e: unknown) {
      console.error('Clipboard read failed:', e);
    }
  }, [processFile]);

  // Listen for paste events
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/') || item.type === 'application/pdf') {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
            return;
          }
        }
      }
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [disabled, processFile]);

  const handleRemove = useCallback(() => {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    onRemove();
  }, [attachment, onRemove]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex-shrink-0"
    >
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {/* Converting indicator */}
      {isConverting ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled
          className="h-10 w-10 rounded-xl"
        >
          <Loader2 className="w-4 h-4 animate-spin text-sand-400" />
        </Button>
      ) : !attachment ? (
        /* Attach button - only show if no attachment */
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className={cn(
            'h-10 w-10 rounded-xl transition-all',
            'text-sand-400 hover:text-earth-600 hover:bg-sand-100',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          title="Attach image or PDF (booking confirmation, screenshot, etc.)"
          aria-label="Attach a booking confirmation image or PDF"
        >
          <Plus className="w-5 h-5" />
        </Button>
      ) : null}
    </div>
  );
};

export default ChatFileAttachmentComponent;
