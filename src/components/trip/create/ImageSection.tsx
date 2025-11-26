import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ImageUpload from "@/components/ImageUpload";
import UnsplashImage from '@/components/UnsplashImage';

interface ImageSectionProps {
  coverImageUrl: string;
  onImageChange: (url: string) => void;
  objectPosition?: string;                       // e.g. "center 50%"
  onPositionChange?: (position: string) => void; // "center X%"
}

// Returned from your supabase fn
interface UnsplashHit {
  id: string;
  url: string;
  description: string;
}

const ImageSection: React.FC<ImageSectionProps> = ({
  coverImageUrl,
  onImageChange,
  objectPosition = "center 50%",
  onPositionChange
}) => {
  const [tab, setTab] = useState<'unsplash' | 'upload'>('unsplash');
  const [keywords, setKeywords] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<UnsplashHit[]>([]);

  const searchUnsplash = async () => {
    if (!keywords.trim()) {
      toast.error("Enter a destination or vibe (e.g., 'Santorini sunset')");
      return;
    }
    setIsSearching(true);
    setResults([]);
    try {
      // re-using your existing function; it returns { images: [...] }
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { keywords }
      });
      if (error) throw error;

      if (data?.images?.length) {
        setResults(data.images);
      } else {
        toast.error('No images found. Try a different search.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectUnsplash = (url: string) => {
    onImageChange(url);
    toast.success('Cover image selected');
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">Cover Image</Label>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="unsplash">Unsplash</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        {/* Unsplash */}
        <TabsContent value="unsplash" className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search free photos (e.g., Amalfi Coast, desert road...)"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUnsplash()}
            />
            <Button type="button" onClick={searchUnsplash} disabled={isSearching}>
              {isSearching ? 'Searching...' : (<><Search className="w-4 h-4 mr-2" />Search</>)}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {results.map((img) => (
                <button
                  key={img.id}
                  className="relative rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-earth-500"
                  onClick={() => selectUnsplash(img.url)}
                  type="button"
                >
                  <UnsplashImage
                    src={img.url}
                    alt={img.description || "Unsplash image"}
                    className="h-36 w-full object-cover"
                    showAttribution={true}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute bottom-2 right-2">
                    <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Use
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* When an Unsplash image is selected, show preview + position only */}
          {coverImageUrl && (
            <div className="pt-1">
              <ImageUpload
                value={coverImageUrl}
                onChange={onImageChange}
                objectPosition={objectPosition}
                onPositionChange={onPositionChange}
                hideUploader={true}
              />
            </div>
          )}
        </TabsContent>

        {/* Upload */}
        <TabsContent value="upload">
          <ImageUpload
            value={coverImageUrl}
            onChange={onImageChange}
            objectPosition={objectPosition}
            onPositionChange={onPositionChange}
            hideUploader={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImageSection;
