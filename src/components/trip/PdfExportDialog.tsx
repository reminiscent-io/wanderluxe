import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { FileDown, Loader2, Image, DollarSign, FileText, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { analytics } from '@/services/analyticsService';

interface PdfExportDialogProps {
  tripId: string;
  className?: string;
  onExport: (options: PdfExportOptions) => Promise<void>;
}

export interface PdfExportOptions {
  showImages: boolean;
  showCosts: boolean;
  detailLevel: 'full' | 'summary' | 'minimal';
  layout: 'timeline' | 'daily' | 'list';
  sections: {
    transportation: boolean;
    accommodation: boolean;
    activities: boolean;
    dining: boolean;
  };
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
    detailLevel: 'full',
    layout: 'timeline',
    sections: {
      transportation: true,
      accommodation: true,
      activities: true,
      dining: true,
    },
  });

  const handleExport = async () => {
    setIsLoading(true);
    try {
      // Track PDF export attempt
      analytics.trackMedia('pdf_export_start', 'pdf', {
        trip_id: tripId,
        options: {
          layout: options.layout,
          detail_level: options.detailLevel,
          show_images: options.showImages,
          show_costs: options.showCosts,
          sections_count: Object.values(options.sections).filter(Boolean).length
        }
      });

      await onExport(options);
      
      // Track successful export
      analytics.trackMedia('pdf_export_success', 'pdf', {
        trip_id: tripId,
        export_type: options.showImages ? 'visual' : 'plain',
        layout: options.layout
      });
      
      setIsOpen(false);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      
      // Track export failure
      analytics.trackError('pdf_export_failed', error instanceof Error ? error.message : 'Unknown error', 'pdf_export');
      analytics.trackMedia('pdf_export_error', 'pdf', {
        trip_id: tripId,
        error_type: error instanceof Error ? error.name : 'Unknown'
      });
      
      toast.error('Failed to export PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSection = (section: keyof PdfExportOptions['sections'], value: boolean) => {
    setOptions(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: value,
      },
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={className ?? 'bg-earth-500 hover:bg-earth-600 text-white'}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Customize PDF Export
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          {/* Visual Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Visual Elements</Label>
            </div>
            
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-images" className="text-sm">
                  Include images and photos
                </Label>
                <Switch
                  id="show-images"
                  checked={options.showImages}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, showImages: checked }))
                  }
                  className="data-[state=checked]:bg-sand-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show-costs" className="text-sm">
                  Show costs and pricing
                </Label>
                <Switch
                  id="show-costs"
                  checked={options.showCosts}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, showCosts: checked }))
                  }
                  className="data-[state=checked]:bg-sand-500"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Detail Level */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Detail Level</Label>
            </div>
            
            <RadioGroup
              value={options.detailLevel}
              onValueChange={(value) =>
                setOptions(prev => ({ ...prev, detailLevel: value as PdfExportOptions['detailLevel'] }))
              }
              className="pl-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="detail-full" />
                <Label htmlFor="detail-full" className="text-sm">
                  Full Details - Complete descriptions and information
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="summary" id="detail-summary" />
                <Label htmlFor="detail-summary" className="text-sm">
                  Summary - Key details only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minimal" id="detail-minimal" />
                <Label htmlFor="detail-minimal" className="text-sm">
                  Minimal - Essential information only
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Layout Style */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Layout Style</Label>
            </div>
            
            <RadioGroup
              value={options.layout}
              onValueChange={(value) =>
                setOptions(prev => ({ ...prev, layout: value as PdfExportOptions['layout'] }))
              }
              className="pl-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="timeline" id="layout-timeline" />
                <Label htmlFor="layout-timeline" className="text-sm">
                  Timeline - Visual timeline with time markers
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="layout-daily" />
                <Label htmlFor="layout-daily" className="text-sm">
                  Daily Summary - Compact day-by-day cards
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="list" id="layout-list" />
                <Label htmlFor="layout-list" className="text-sm">
                  Simple List - Clean chronological list
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Sections to Include */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Sections to Include</Label>
            
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="section-accommodation" className="text-sm">
                  Hotels & Accommodation
                </Label>
                <Switch
                  id="section-accommodation"
                  checked={options.sections.accommodation}
                  onCheckedChange={(checked) => updateSection('accommodation', checked)}
                  className="data-[state=checked]:bg-sand-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="section-transportation" className="text-sm">
                  Transportation & Flights
                </Label>
                <Switch
                  id="section-transportation"
                  checked={options.sections.transportation}
                  onCheckedChange={(checked) => updateSection('transportation', checked)}
                  className="data-[state=checked]:bg-sand-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="section-activities" className="text-sm">
                  Activities & Events
                </Label>
                <Switch
                  id="section-activities"
                  checked={options.sections.activities}
                  onCheckedChange={(checked) => updateSection('activities', checked)}
                  className="data-[state=checked]:bg-sand-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="section-dining" className="text-sm">
                  Dining & Restaurants
                </Label>
                <Switch
                  id="section-dining"
                  checked={options.sections.dining}
                  onCheckedChange={(checked) => updateSection('dining', checked)}
                  className="data-[state=checked]:bg-sand-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t">
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
            className="bg-earth-500 hover:bg-earth-600 text-white w-full sm:w-auto"
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfExportDialog;