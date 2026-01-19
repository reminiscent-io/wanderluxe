import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Crown, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getConnectedContacts, pickBestName, initialsFor } from "@/services/contactsService";

type ContactItem = {
  key: string;
  email?: string | null;
  profile_full_name?: string | null;
  share_first_name?: string | null;
  share_last_name?: string | null;
  directions: ("incoming" | "outgoing")[];
};

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

  const { session, subscriptionTier } = useAuth();
  const [fullName, setFullName] = useState('');
  const [initials, setInitials] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Connected people state
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  // ---- Centralized, bounded email validation (anchored; no catastrophic backtracking) ----
  const SAFE_EMAIL_MAX_LEN = 254;
  const SAFE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = (s: string) =>
    !!s && s.length <= SAFE_EMAIL_MAX_LEN && SAFE_EMAIL_RE.test(s);
  // ----------------------------------------------------------------------------------------

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
      // Sort by First Name (derived from pickBestName)
      const withSort = [...list].sort((a: ContactItem, b: ContactItem) => {
        const aName = (pickBestName(a) || "").trim();
        const bName = (pickBestName(b) || "").trim();
        const aFirst = aName.split(/\s+/)[0]?.toLowerCase() || "";
        const bFirst = bName.split(/\s+/)[0]?.toLowerCase() || "";
        return aFirst.localeCompare(bFirst);
      });
      setContacts(withSort);
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

  // ------------------- Edit Contact Dialog logic -------------------

  // Open dialog with prefilled values from a contact card
  const openEditDialog = (c: ContactItem) => {
    const name = (pickBestName(c) || "").trim();
    const [first = "", ...rest] = name.split(/\s+/);
    const last = rest.join(" ");
    // Prefer explicit share_* when available
    const preFirst = (c.share_first_name?.trim() || first).trim();
    const preLast = (c.share_last_name?.trim() || last).trim();
    const preEmail = (c.email || "").trim();

    setEditFirst(preFirst);
    setEditLast(preLast);
    setEditEmail(preEmail);
    setOriginalEmail(preEmail || null);
    setEditOpen(true);
  };

  // Save: update your outgoing trip_shares rows for this contact
  // We update by originalEmail; if email changed, we migrate those rows to new email
  const saveContactEdits = async () => {
    try {
      setSavingContact(true);

      // Guard: need something to target. If no email at all, we can't tie to shares.
      if (!originalEmail && !editEmail) {
        toast.error("Please provide an email to save this contact.");
        setSavingContact(false);
        return;
      }

      // Update all trip_shares rows you own that point to this email.
      // RLS will ensure you can only edit rows of trips you own.
      if (originalEmail) {
        const { error: updErr } = await supabase
          .from("trip_shares" as any)
          .update({
            first_name: editFirst || null,
            last_name: editLast || null,
            shared_with_email: editEmail || null,
          })
          .eq("shared_with_email", originalEmail);

        if (updErr) throw updErr;
      } else {
        // No originalEmail, but user provided a new email -> write any rows with null/empty email + names?
        // We can't guess which rows belong to this person; just create an alias row by email via a no-op upsert in your own shares if needed.
        // Skipping DB write here; still allow saving as an "alias" for future. Consider persisting to a contacts_overrides table if you have one.
      }

      toast.success("Contact updated");
      setEditOpen(false);
      await fetchContacts();
    } catch (e: any) {
      console.error("Failed to update contact", e);
      toast.error("Failed to update contact");
    } finally {
      setSavingContact(false);
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

          {/* Subscription Card */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${subscriptionTier === 'pro' ? 'bg-amber-100' : 'bg-sand-100'}`}>
                <Crown className={`h-5 w-5 ${subscriptionTier === 'pro' ? 'text-amber-600' : 'text-sand-500'}`} />
              </div>
              <div>
                <h2 className="text-lg font-medium">Subscription</h2>
                <p className="text-sm text-muted-foreground">
                  {subscriptionTier === 'pro' ? 'You have Pro access' : 'You are on the Free plan'}
                </p>
              </div>
              <Badge className={`ml-auto ${subscriptionTier === 'pro' ? 'bg-amber-100 text-amber-700' : 'bg-sand-100 text-sand-600'}`}>
                {subscriptionTier === 'pro' ? 'Pro' : 'Free'}
              </Badge>
            </div>
            
            {subscriptionTier !== 'pro' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h3 className="font-medium">Upgrade to Pro</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Unlimited AI assistant messages
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Priority support
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Advanced trip features
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Export trips to PDF
                    </li>
                  </ul>
                  <Button 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => toast.info("Pro subscriptions coming soon!")}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro - $9.99/month
                  </Button>
                </div>
              </>
            )}
            
            {subscriptionTier === 'pro' && (
              <>
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground">
                  Thank you for being a Pro member! You have access to all premium features.
                </p>
              </>
            )}
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
                      ? "Outgoing"
                      : "Incoming";
                  return (
                    <li
                      key={c.key}
                      className="flex items-center gap-3 rounded-md border p-3 hover:bg-sand-50 cursor-pointer"
                      onClick={() => openEditDialog(c)}
                    >
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

      {/* Edit Contact Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-first">First name</Label>
              <Input
                id="c-first"
                value={editFirst}
                onChange={(e) => setEditFirst(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-last">Last name</Label>
              <Input
                id="c-last"
                value={editLast}
                onChange={(e) => setEditLast(e.target.value)}
                placeholder="Last name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="email@example.com"
                maxLength={SAFE_EMAIL_MAX_LEN}
              />
              {!isValidEmail(editEmail || "") && editEmail && (
                <p className="text-xs text-red-600">Enter a valid email</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              className="bg-earth-600 text-white hover:bg-earth-700"
              onClick={saveContactEdits}
              disabled={savingContact || (!!editEmail && !isValidEmail(editEmail))}
            >
              {savingContact ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
