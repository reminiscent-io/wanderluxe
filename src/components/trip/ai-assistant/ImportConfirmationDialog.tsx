import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Download } from 'lucide-react';
import ExtractedItemCard from './ExtractedItemCard';
import type { ExtractedItem } from '@/types/ai-assistant';

interface ImportConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ExtractedItem[];
  onConfirm: () => void;
  isImporting: boolean;
}

const ImportConfirmationDialog: React.FC<ImportConfirmationDialogProps> = ({
  open,
  onOpenChange,
  items,
  onConfirm,
  isImporting
}) => {
  // Count items by type
  const itemCounts = items.reduce((acc, item) => {
    acc[item.itemType] = (acc[item.itemType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Generate summary text
  const summaryParts: string[] = [];
  if (itemCounts.transportation) {
    summaryParts.push(`${itemCounts.transportation} transportation${itemCounts.transportation > 1 ? 's' : ''}`);
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Import {items.length} item{items.length !== 1 ? 's' : ''}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will add {summaryParts.join(', ')} to your trip.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Preview items */}
        <div className="my-4 max-h-[300px] overflow-y-auto space-y-2">
          {items.map((item) => (
            <ExtractedItemCard key={item.id} item={item} compact />
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isImporting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Import All
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ImportConfirmationDialog;
