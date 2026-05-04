import React, { useState } from 'react';
import { Sparkles, Download, Edit3, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExtractedItemCard from './ExtractedItemCard';
import type { ExtractedItem } from '@/types/ai-assistant';

interface ExtractionResultMessageProps {
  items: ExtractedItem[];
  fileName?: string;
  onImportAll: (items: ExtractedItem[]) => Promise<void>;
  onReviewEdit: (items: ExtractedItem[]) => void;
  isImporting?: boolean;
}

const ITEM_TYPE_PLURALS: { key: string; singular: string; plural: string }[] = [
  { key: 'transportation', singular: 'transport', plural: 'transports' },
  { key: 'accommodation', singular: 'accommodation', plural: 'accommodations' },
  { key: 'activity', singular: 'activity', plural: 'activities' },
  { key: 'reservation', singular: 'reservation', plural: 'reservations' }
];

function buildSummaryParts(itemCounts: Record<string, number>): string[] {
  return ITEM_TYPE_PLURALS
    .filter(({ key }) => itemCounts[key])
    .map(({ key, singular, plural }) =>
      `${itemCounts[key]} ${itemCounts[key] > 1 ? plural : singular}`
    );
}

function pluralize(count: number, singular: string): string {
  if (count === 1) {
    return `1 ${singular}`;
  }
  return `${count} ${singular}s`;
}

function EmptyState(): React.ReactElement {
  return (
    <div className="rounded-2xl bg-sand-50 border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm text-foreground">
            I couldn't find any bookable items in this document.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a clearer image, or a confirmation with visible booking details.
          </p>
        </div>
      </div>
    </div>
  );
}

type ImportStatus = 'idle' | 'importing' | 'success' | 'error';

function ImportButtonContent({ importStatus, isImporting, pendingCount }: Readonly<{
  importStatus: ImportStatus;
  isImporting: boolean;
  pendingCount: number;
}>): React.ReactElement {
  if (importStatus === 'importing' || isImporting) {
    return (
      <>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Importing...
      </>
    );
  }
  if (importStatus === 'success') {
    return (
      <>
        <Check className="w-4 h-4 mr-2" />
        Imported
      </>
    );
  }
  return (
    <>
      <Download className="w-4 h-4 mr-2" />
      Import {pendingCount > 1 ? 'All' : ''}
    </>
  );
}

const ExtractionResultMessage: React.FC<ExtractionResultMessageProps> = ({
  items,
  fileName,
  onImportAll,
  onReviewEdit,
  isImporting = false
}) => {
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');

  const pendingItems = items.filter(item => item.status === 'pending');
  const createdItems = items.filter(item => item.status === 'created');
  const allProcessed = pendingItems.length === 0 && items.length > 0;

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

  if (items.length === 0) {
    return <EmptyState />;
  }

  const summaryParts = buildSummaryParts(itemCounts);
  const headerText = allProcessed
    ? `Added ${pluralize(createdItems.length, 'item')} to your trip`
    : `Found ${pluralize(items.length, 'item')} in your document`;

  return (
    <div className="rounded-2xl bg-sand-50 border border-border rounded-tl-sm overflow-hidden max-w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-earth-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-background" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate tabular-nums">
              {headerText}
            </p>
            <p className="text-xs leading-snug text-muted-foreground truncate">
              {fileName && `From ${fileName} · `}{summaryParts.join(', ')}
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
        <div className="px-4 py-3 border-t border-border bg-background flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={handleImportAll}
            disabled={importStatus === 'importing' || isImporting}
            className="flex-1 sm:flex-none"
          >
            <ImportButtonContent
              importStatus={importStatus}
              isImporting={isImporting}
              pendingCount={pendingItems.length}
            />
          </Button>

          <Button
            variant="outline"
            onClick={() => onReviewEdit(pendingItems)}
            disabled={importStatus === 'importing' || isImporting}
            className="flex-1 sm:flex-none"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Review & edit
          </Button>
        </div>
      )}

      {/* Success state */}
      {allProcessed && (
        <div className="px-4 py-3 border-t border-border bg-green-50">
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
