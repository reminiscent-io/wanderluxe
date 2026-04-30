import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileDown, Loader2, Image, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface PdfExportDialogProps {
  tripId: string;
  className?: string;
  onExport: (options: PdfExportOptions) => Promise<void>;
}

export interface PdfExportOptions {
  showImages: boolean;
  showCosts: boolean;
}

const PdfExportDialog: React.FC<PdfExportDialogProps> = ({
  tripId,
  className,
  onExport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<PdfExportOptions>({
    showImages: true,
    showCosts: true,
  });

  const handleExport = async () => {
    console.log('[PdfExportDialog] Starting export with options:', options);
    setIsLoading(true);
    try {
      console.log('[PdfExportDialog] Calling onExport...');
      await onExport(options);
      console.log('[PdfExportDialog] Export completed successfully');
      setIsOpen(false);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('[PdfExportDialog] Export failed:', error);
      toast.error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('[PdfExportDialog] Resetting loading state');
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <FileDown className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Export PDF</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Itinerary
          </DialogTitle>
        </DialogHeader>

        <div className="divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <Image className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Include Pictures</Label>
                <p className="text-xs text-muted-foreground">Add photos to your itinerary</p>
              </div>
            </div>
            <Switch
              checked={options.showImages}
              onCheckedChange={(checked) =>
                setOptions(prev => ({ ...prev, showImages: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Include Prices</Label>
                <p className="text-xs text-muted-foreground">Show costs and expenses</p>
              </div>
            </div>
            <Switch
              checked={options.showCosts}
              onCheckedChange={(checked) =>
                setOptions(prev => ({ ...prev, showCosts: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PdfExportDialog;
