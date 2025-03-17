
import { supabase } from '@/integrations/supabase/client';

export interface Logo {
  name: string;
  url: string;
}

/**
 * Fetches all logos from the Supabase 'logos' bucket
 * @returns Promise with an array of logo objects containing name and URL
 */
export const fetchLogosFromSupabase = async (retries = 2): Promise<Logo[]> => {
  try {
    const { data, error } = await supabase.storage
      .from('logos')
      .list();

    if (error) {
      console.error('Error fetching logos:', error);
      if (retries > 0 && (error.status === 544 || error.name === 'StorageUnknownError')) {
        console.log(`Retrying fetch logos (${retries} attempts left)...`);
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(fetchLogosFromSupabase(retries - 1));
          }, 1000);
        });
      }
      return []; // Return empty array instead of throwing
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Create public URLs for each logo
    const logos = await Promise.all(
      data.map(async (file) => {
        try {
          const { data: urlData } = await supabase.storage
            .from('logos')
            .getPublicUrl(file.name);

          return {
            name: file.name,
            url: urlData.publicUrl
          };
        } catch (err) {
          console.error('Error getting public URL:', err);
          return null;
        }
      })
    );

    return logos.filter(Boolean) as Logo[];
  } catch (error) {
    console.error('Error in fetchLogosFromSupabase:', error);
    if (retries > 0) {
      console.log(`Retrying fetch logos after error (${retries} attempts left)...`);
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(fetchLogosFromSupabase(retries - 1));
        }, 1000);
      });
    }
    return []; // Return empty array as fallback
  }
};
