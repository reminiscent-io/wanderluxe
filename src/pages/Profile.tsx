
import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Profile = () => {
  const { session } = useAuth();
  const [fullName, setFullName] = useState('');
  const [initials, setInitials] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || '');
        setInitials(data.initials || '');
        setHomeLocation(data.home_location || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleInitialsChange = (value: string) => {
    // Limit to 2 characters and convert to uppercase
    setInitials(value.slice(0, 2).toUpperCase());
  };

  const handleSave = async () => {
    if (!session?.user) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          initials: initials,
          home_location: homeLocation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-sand-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center gap-6 mb-8">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl">
                {initials || session.user.email?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold">{session.user.email}</h1>
          </div>

          <div className="space-y-6 bg-white p-6 rounded-lg shadow">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="initials">Initials (2 characters)</Label>
              <Input
                id="initials"
                value={initials}
                onChange={(e) => handleInitialsChange(e.target.value)}
                placeholder="AB"
                maxLength={2}
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeLocation">Home Location</Label>
              <Input
                id="homeLocation"
                value={homeLocation}
                onChange={(e) => setHomeLocation(e.target.value)}
                placeholder="Enter your home location"
              />
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
