import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getConnectedContacts, pickBestName, initialsFor } from "@/services/contactsService";

const Profile = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const { session } = useAuth();
  const [fullName, setFullName] = useState('');
  const [initials, setInitials] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Connected people state
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchContacts();
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

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const list = await getConnectedContacts();
      setContacts(list);
    } catch (e) {
      console.error("Error fetching contacts", e);
    } finally {
      setLoadingContacts(false);
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
            <Avatar className="h-24 w-24 border-2 border-earth-500 hover:border-white">
              <AvatarFallback className="text-3xl bg-sand-50 text-earth-500 hover:bg-earth-400 hover:text-white">
                {initials || session.user.email?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-thin">{session.user.email}</h1>
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

            <div className="space-y-4">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="w-full bg-earth-400 text-white hover:bg-earth-600"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>

              <Button 
                onClick={handleSignOut}
                variant="outline" 
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Connected People */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium">Connected people</h2>
              <Badge variant="secondary">
                {loadingContacts ? "Loading..." : `${contacts.length} ${contacts.length === 1 ? "person" : "people"}`}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Anyone you’ve shared a trip with, and anyone who has shared a trip with you.
            </p>
            <Separator className="mb-4" />
            {contacts.length === 0 && !loadingContacts ? (
              <p className="text-sm text-muted-foreground">No connections yet.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contacts.map((c) => {
                  const name = pickBestName(c);
                  const hint =
                    c.email ? c.email :
                    c.directions.includes("incoming") ? "Shared with you" :
                    "Shared by you";
                  const dir =
                    c.directions.includes("incoming") && c.directions.includes("outgoing")
                      ? "Both ways"
                      : c.directions.includes("outgoing")
                      ? "You → Them"
                      : "Them → You";
                  return (
                    <li key={c.key} className="flex items-center gap-3 rounded-md border p-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initialsFor(c)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{name}</span>
                          <Badge variant="outline" className="text-[10px]">{dir}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{hint}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
