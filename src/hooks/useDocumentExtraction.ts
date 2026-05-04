import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  ExtractedItem,
  MultiItemExtractionResponse,
  ChatFileAttachment
} from '@/types/ai-assistant';

const PARSE_ENDPOINT =
  import.meta.env.VITE_PARSE_TRAVEL_DOC_URL ||
  'https://arnengxblsfnezrqcsxw.functions.supabase.co/parse-travel-doc';

export interface UseDocumentExtractionReturn {
  isExtracting: boolean;
  extractedItems: ExtractedItem[];
  extractionMeta: MultiItemExtractionResponse['meta'] | null;
  error: string | null;
  extractDocument: (attachment: ChatFileAttachment) => Promise<ExtractedItem[] | null>;
  clearExtraction: () => void;
  updateItemStatus: (itemId: string, status: 'created' | 'skipped') => void;
}

export function useDocumentExtraction(): UseDocumentExtractionReturn {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [extractionMeta, setExtractionMeta] = useState<MultiItemExtractionResponse['meta'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extractDocument = useCallback(async (attachment: ChatFileAttachment): Promise<ExtractedItem[] | null> => {
    setIsExtracting(true);
    setError(null);
    setExtractedItems([]);
    setExtractionMeta(null);

    try {
      // Get auth token
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        throw new Error('Please sign in to extract documents');
      }

      // Use converted file for PDFs, original for images
      const fileToSend = attachment.convertedFile || attachment.file;

      // Create form data with no itemType (triggers multi-item mode)
      const fd = new FormData();
      fd.append('file', fileToSend);
      // Don't append itemType - this triggers auto-detect multi-item mode

      const response = await fetch(PARSE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: fd
      });

      const responseText = await response.text();
      let parsed: Record<string, unknown> | unknown[] | null = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        throw new Error(responseText || `Extraction failed (${response.status})`);
      }

      if (!response.ok || parsed?.error) {
        throw new Error(parsed?.error || `Extraction failed (${response.status})`);
      }

      // Check if it's a multi-item response
      if (Array.isArray(parsed.items)) {
        const items = parsed.items as ExtractedItem[];
        setExtractedItems(items);
        setExtractionMeta(parsed.meta);
        return items;
      }

      // Single-item response (backwards compatibility) - convert to array format
      if (parsed.itemType && parsed.fields) {
        const singleItem: ExtractedItem = {
          id: `item-0-${Date.now()}`,
          itemType: parsed.itemType,
          fields: parsed.fields,
          missingRequired: parsed.missingRequired || [],
          confidence: 0.9,
          status: 'pending'
        };
        setExtractedItems([singleItem]);
        setExtractionMeta({
          model: parsed.meta?.model,
          pagesUsed: parsed.meta?.pagesUsed || 1,
          totalItemsDetected: 1,
          originalFileName: attachment.file.name
        });
        return [singleItem];
      }

      throw new Error('Invalid extraction response');
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to extract document';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const clearExtraction = useCallback(() => {
    setExtractedItems([]);
    setExtractionMeta(null);
    setError(null);
  }, []);

  const updateItemStatus = useCallback((itemId: string, status: 'created' | 'skipped') => {
    setExtractedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, status } : item
      )
    );
  }, []);

  return {
    isExtracting,
    extractedItems,
    extractionMeta,
    error,
    extractDocument,
    clearExtraction,
    updateItemStatus
  };
}
