
import { supabase } from '@/integrations/supabase/client';

export interface Logo {
  name: string;
  url: string;
}

/**
 * Fetches all logos from the Supabase 'logos' bucket
 * @returns Promise with an array of logo objects containing name and URL
 */
export const fetchLogosFromSupabase = async (): Promise<Logo[]> => {
  try {
    const { data, error } = await supabase.storage
      .from('logos')
      .list();
    
    if (error) {
      console.error('Error fetching logos:', error);
      throw new Error(error.message);
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Create public URLs for each logo
    const logos = await Promise.all(
      data.map(async (file) => {
        const { data: urlData } = await supabase.storage
          .from('logos')
          .getPublicUrl(file.name);
          
        return {
          name: file.name,
          url: urlData.publicUrl
        };
      })
    );
    
    return logos;
  } catch (error) {
    console.error('Error in fetchLogosFromSupabase:', error);
    throw error;
  }
};
