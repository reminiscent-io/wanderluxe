import React, { useState } from 'react';
import { Sparkles, Download, Edit3, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ExtractedItemCard from './ExtractedItemCard';
import type { ExtractedItem } from '@/types/ai-assistant';

interface ExtractionResultMessageProps {
  items: ExtractedItem[];
  fileName?: string;
  onImportAll: (items: ExtractedItem[]) => Promise<void>;
  onReviewEdit: (items: ExtractedItem[]) => void;
  isImporting?: boolean;
}

const ExtractionResultMessage: React.FC<ExtractionResultMessageProps> = ({
  items,
  fileName,
  onImportAll,
  onReviewEdit,
  isImporting = false
}) => {
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');

  // Filter pending items (not yet created or skipped)
  const pendingItems = items.filter(item => item.status === 'pending');
  const createdItems = items.filter(item => item.status === 'created');
  const allProcessed = pendingItems.length === 0 && items.length > 0;

  // Count items by type
  const itemCounts = items.reduce((acc, item) => {
    acc[item.itemType] = (acc[item.itemType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleImportAll = async () => {
    if (pendingItems.length === 0) return;
    setImportStatus('importing');
    try {
      await onImportAll(pendingItems);
      setImportStatus('success');
    } catch (e) {
      console.error('Import failed:', e);
      setImportStatus('error');
    }
  };

  // No items found
  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-sand-50 border border-sand-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-sand-500" />
          </div>
          <div>
            <p className="text-sm text-earth-700">
              I couldn't find any bookable items in this document.
            </p>
            <p className="text-xs text-sand-500 mt-1">
              Try uploading a clearer image or a booking confirmation with visible details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Generate summary text
  const summaryParts: string[] = [];
  if (itemCounts.transportation) {
    summaryParts.push(`${itemCounts.transportation} transport${itemCounts.transportation > 1 ? 's' : ''}`);
  }
  if (itemCounts.accommodation) {
    summaryParts.push(`${itemCounts.accommodation} accommodation${itemCounts.accommodation > 1 ? 's' : ''}`);
  }
  if (itemCounts.activity) {
    summaryParts.push(`${itemCounts.activity} activit${itemCounts.activity > 1 ? 'ies' : 'y'}`);
  }
  if (itemCounts.reservation) {
    summaryParts.push(`${itemCounts.reservation} reservation${itemCounts.reservation > 1 ? 's' : ''}`);
  }

  return (
    <div className="rounded-2xl bg-sand-50 border border-sand-200 rounded-tl-sm overflow-hidden max-w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-sand-200 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-earth-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-earth-700 truncate">
              {allProcessed
                ? `Added ${createdItems.length} item${createdItems.length !== 1 ? 's' : ''} to your trip`
                : `Found ${items.length} item${items.length !== 1 ? 's' : ''} in your document`}
            </p>
            <p className="text-xs text-sand-500 truncate">
              {fileName && `From ${fileName} • `}{summaryParts.join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Item cards */}
      <div className="p-3 space-y-2">
        {items.map((item) => (
          <ExtractedItemCard
            key={item.id}
            item={item}
            compact={items.length > 3}
          />
        ))}
      </div>

      {/* Action buttons - only show if there are pending items */}
      {pendingItems.length > 0 && (
        <div className="px-4 py-3 border-t border-sand-200 bg-white flex flex-wrap gap-2">
          <Button
            onClick={handleImportAll}
            disabled={importStatus === 'importing' || isImporting}
            className={cn(
              'flex-1 sm:flex-none',
              'bg-earth-500 hover:bg-earth-600 text-white'
            )}
          >
            {importStatus === 'importing' || isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : importStatus === 'success' ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Imported
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Import {pendingItems.length > 1 ? 'All' : ''}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => onReviewEdit(pendingItems)}
            disabled={importStatus === 'importing' || isImporting}
            className="flex-1 sm:flex-none"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Review & Edit
          </Button>
        </div>
      )}

      {/* Success state */}
      {allProcessed && (
        <div className="px-4 py-3 border-t border-sand-200 bg-green-50">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="w-4 h-4" />
            <span>All items have been processed</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtractionResultMessage;
