
import React, { useEffect, useState } from 'react';
import { fetchLogosFromSupabase, Logo } from '@/utils/storageUtils';
import { Card, CardContent } from "@/components/ui/card";
import { Loader } from "lucide-react";

export const LogoDisplay = () => {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getLogos = async () => {
      try {
        setLoading(true);
        const logoData = await fetchLogosFromSupabase();
        setLogos(logoData);
        setError(null);
      } catch (err) {
        setError('Failed to load logos. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getLogos();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader className="animate-spin" />
        <span className="ml-2">Loading logos...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (logos.length === 0) {
    return <div className="p-4">No logos found in the storage bucket.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {logos.map((logo) => (
        <Card key={logo.name} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <img 
                src={logo.url} 
                alt={`Logo - ${logo.name}`} 
                className="max-h-48 object-contain mb-2" 
              />
              <p className="text-sm text-gray-600">{logo.name}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LogoDisplay;
