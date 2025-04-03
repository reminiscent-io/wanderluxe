
import { supabase } from '@/integrations/supabase/client';

export const createMissingProfiles = async () => {
  // Get all users from auth.users
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  // Check if user has a profile
  const { data: profile } = await supabase
    .from('profiles')
    .select()
    .eq('id', user.id)
    .single();

  // If no profile exists, create one
  if (!profile) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          created_at: new Date().toISOString(),
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null
        }
      ]);

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }
  }
};
