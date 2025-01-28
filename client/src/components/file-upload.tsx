import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  tripId: number;
  onSuccess: () => void;
}

export function FileUpload({ tripId, onSuccess }: FileUploadProps) {
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/trips/${tripId}/files`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleUpload(file);
          }
        }}
      />
      <Button
        variant="outline"
        className="w-full"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload Document
      </Button>
      {progress > 0 && <Progress value={progress} />}
    </div>
  );
}
