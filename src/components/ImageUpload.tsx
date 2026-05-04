import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

interface ImageUploadProps {
  value: string;                                // signed url OR external url
  onChange: (url: string) => void;              // push selected/ uploaded image url up
  onRemove?: () => void;
  objectPosition?: string;                      // e.g. "center 50%"
  onPositionChange?: (position: string) => void;
  hideUploader?: boolean;                       // when true, show preview+position but hide the dropzone/file input (used on Unsplash tab)
}

const MAX_FILE_MB = 15;

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onRemove,
  objectPosition = "center 50%",
  onPositionChange,
  hideUploader = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<number>(50); // 0..100
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // reflect external value in preview
  useEffect(() => {
    setPreview(value || '');
  }, [value]);

  // initialize position from objectPosition prop (e.g. "center 42%")
  useEffect(() => {
    const match = objectPosition.match(/center\s+(\d+(?:\.\d+)?)%/);
    if (match?.[1]) {
      const num = Math.max(0, Math.min(100, parseFloat(match[1])));
      setPosition(num);
    }
  }, [objectPosition]);

  // global paste handler
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image')) {
          const file = item.getAsFile();
          if (file) {
            await uploadImage(file);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // Listener is registered once; uploadImage is referenced via closure and
    // remains valid since it only depends on stable props/refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- upload helpers ---
  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      if (!file.type.startsWith('image/')) {
        toast.error('Please choose an image file');
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`File size must be less than ${MAX_FILE_MB}MB`);
        return;
      }

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('trip-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { signedUrl }, error: signError } = await supabase.storage
        .from('trip-images')
        .createSignedUrl(filePath, 31536000); // 1 year

      if (signError) throw signError;

      setPreview(signedUrl);
      onChange(signedUrl);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadImage(file);
  };

  const handleRemove = () => {
    setPreview('');
    // If onRemove is provided, let parent handle the removal logic
    // Otherwise fall back to calling onChange with empty string
    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
  };

  // --- position helpers ---
  const emitPosition = useCallback((pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    setPosition(clamped);
    onPositionChange?.(`center ${clamped}%`);
  }, [onPositionChange]);

  const handleSlider = (vals: number[]) => emitPosition(vals[0]);

  const nudge = (dir: 'up' | 'down') => {
    const delta = dir === 'up' ? -10 : 10;
    emitPosition(position + delta);
  };

  // pointer drag to reposition (mouse or touch)
  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!containerRef.current) return;
    setIsDraggingImage(true);
    containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!isDraggingImage || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = (y / rect.height) * 100;
    emitPosition(pct);
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!containerRef.current) return;
    setIsDraggingImage(false);
    containerRef.current.releasePointerCapture(e.pointerId);
  };

  // drag & drop
  const onDragOver: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragLeave: React.DragEventHandler<HTMLLabelElement> = () => setIsDragOver(false);
  const onDrop: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadImage(file);
  };

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="space-y-2">
          <div
            className="relative w-full h-48 rounded-lg overflow-hidden bg-muted select-none"
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            aria-label="Drag to reposition cover image vertically"
            role="img"
          >
            <img
              src={preview}
              alt="Trip cover"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: `center ${position}%` }}
              loading="eager"
              decoding="async"
            />

            {/* top-right actions */}
            <div className="absolute top-2 right-2 flex gap-2">
              {!hideUploader && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="bg-black/40 text-white hover:bg-black/60"
                  onClick={() => inputRef.current?.click()}
                  title="Replace image"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="bg-black/40 hover:bg-black/60"
                onClick={handleRemove}
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* drag hint */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/35 text-white text-xs">
              Drag up/down to reposition
            </div>
          </div>

          {onPositionChange && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-earth-600">Vertical position</span>
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => nudge('up')}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => nudge('down')}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Slider
                value={[position]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleSlider}
              />
            </div>
          )}

          {/* hidden file input used by Replace button */}
          {!hideUploader && (
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          )}
        </div>
      ) : (
        !hideUploader && (
          <div className="relative">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <label
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={[
                "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer",
                isDragOver ? "border-earth-500 bg-earth-50/60" : "border-[hsl(var(--border))] bg-secondary hover:bg-muted"
              ].join(" ")}
            >
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
                  <p className="mt-2 text-sm text-earth-600">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center px-3">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-earth-700">
                    Drag & drop, click, or paste an image
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to {MAX_FILE_MB}MB</p>
                </div>
              )}
            </label>
          </div>
        )
      )}
    </div>
  );
};

export default ImageUpload;
