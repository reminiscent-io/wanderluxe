import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Check, Camera, Calendar, AlertCircle, ChevronRight, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
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

  const { session, subscriptionTier, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connected people state
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Subscription details state
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    canceledAt: number | null;
    created: number;
  } | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);

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

  useEffect(() => {
    if (subscriptionTier === 'pro') {
      fetchSubscriptionDetails();
    }
  }, [subscriptionTier]);

  const fetchSubscriptionDetails = async () => {
    try {
      setLoadingSubscription(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const resp = await fetch('/api/stripe/subscription', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.ok) {
        const data = await resp.json();
        setSubscriptionDetails(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription details:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancellingSubscription(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("Please sign in");
        return;
      }

      const resp = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.ok) {
        toast.success("Subscription cancelled. You'll have access until the end of your billing period.");
        await fetchSubscriptionDetails();
      } else {
        const data = await resp.json();
        toast.error(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error("Failed to cancel subscription");
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setCancellingSubscription(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("Please sign in");
        return;
      }

      const resp = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.ok) {
        toast.success("Subscription reactivated!");
        await fetchSubscriptionDetails();
      } else {
        const data = await resp.json();
        toast.error(data.error || "Failed to reactivate subscription");
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast.error("Failed to reactivate subscription");
    } finally {
      setCancellingSubscription(false);
    }
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'Not available';
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) return 'Not available';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatIsoDate = (isoString: string | null | undefined) => {
    if (!isoString) return 'Not available';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Not available';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatRelativeTime = (isoString: string | null | undefined) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return formatIsoDate(isoString);
  };

  // Add cache-busting to avatar URLs to ensure fresh images are loaded
  const addCacheBusting = (url: string | null): string | null => {
    if (!url) return null;
    // If URL already has a query parameter, don't add another
    if (url.includes('?')) return url;
    return `${url}?t=${Date.now()}`;
  };

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
        setHomeLocation(data.home_location || '');
        setAvatarUrl(addCacheBusting(data.avatar_url));
        setLastLoginAt(data.last_login_at);
        setCreatedAt(data.created_at);
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const uploadAvatar = async (file: File) => {
    if (!session?.user) return;

    try {
      setUploadingAvatar(true);

      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/avatar.${fileExt}`;

      // Delete existing avatar first
      await supabase.storage.from('avatars').remove([filePath]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting timestamp
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting parameter to force browsers to fetch new image
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setAvatarUrl(cacheBustedUrl);
      // Refresh the auth context so nav/sidebar update immediately
      await refreshProfile();
      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('File must be an image');
        return;
      }
      uploadAvatar(file);
    }
  };

  const handleSave = async () => {
    if (!session?.user) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          home_location: homeLocation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) throw error;

      // Refresh the auth context so nav/sidebar update immediately
      await refreshProfile();
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

  const userInitials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user.email?.substring(0, 2).toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-sand-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Identity Header Card */}
          <div className="bg-background p-6 rounded-lg shadow">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-3 md:w-auto w-full">
                <div className="relative group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {!avatarUrl ? (
                    <button
                      onClick={handleAvatarClick}
                      disabled={uploadingAvatar}
                      className="h-30 w-30 sm:h-35 sm:w-35 rounded-full border-2 border-dashed border-earth-300 hover:border-earth-500 transition-all flex flex-col items-center justify-center gap-2 bg-sand-50 hover:bg-sand-100 cursor-pointer disabled:opacity-50"
                      style={{ width: '120px', height: '120px' }}
                    >
                      {uploadingAvatar ? (
                        <div className="text-sm text-muted-foreground">Uploading...</div>
                      ) : (
                        <>
                          <Camera className="h-8 w-8 text-earth-400" />
                          <span className="text-xs text-earth-600">Upload Photo</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <Avatar
                      className="cursor-pointer transition-all group-hover:opacity-90"
                      style={{ width: '120px', height: '120px' }}
                      onClick={handleAvatarClick}
                    >
                      <AvatarImage src={avatarUrl} alt="Profile" />
                      <AvatarFallback className="text-3xl bg-sand-50 text-earth-500">
                        {uploadingAvatar ? '...' : userInitials}
                      </AvatarFallback>
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    </Avatar>
                  )}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  {session.user.email}
                </div>
                <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Member since {formatIsoDate(createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Last login: {formatRelativeTime(lastLoginAt)}</span>
                  </div>
                </div>
              </div>

              {/* Profile Information Fields */}
              <div className="flex-1 w-full space-y-4">
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
                  <Label htmlFor="homeLocation">Home Location</Label>
                  <Input
                    id="homeLocation"
                    value={homeLocation}
                    onChange={(e) => setHomeLocation(e.target.value)}
                    placeholder="Enter your home location"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-earth-600 hover:bg-earth-700 text-white"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          <div className="bg-background rounded-lg shadow">
            <div className="p-6">
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
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          Unlimited AI assistant messages
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          Priority support
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          Advanced trip features
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          Export trips to PDF
                        </li>
                      </ul>
                      <Button
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={async () => {
                          try {
                            const { data: sessionData } = await supabase.auth.getSession();
                            const token = sessionData?.session?.access_token;
                            if (!token) {
                              toast.error("Please sign in to upgrade");
                              return;
                            }
                            const resp = await fetch('/api/stripe/create-checkout', {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            if (!resp.ok) {
                              let errorMessage = `Checkout failed (${resp.status})`;
                              try {
                                const errorData = await resp.json();
                                errorMessage = errorData.error || errorMessage;
                              } catch {
                                // Response wasn't JSON
                              }
                              console.error('Checkout API error:', resp.status, errorMessage);
                              toast.error(errorMessage);
                              return;
                            }
                            let data;
                            try {
                              data = await resp.json();
                            } catch {
                              console.error('Failed to parse checkout response');
                              toast.error("Invalid response from server");
                              return;
                            }
                            if (data.url) {
                              window.location.href = data.url;
                            } else {
                              toast.error(data.error || "Failed to start checkout");
                            }
                          } catch (e: any) {
                            console.error('Checkout error:', e?.message || e);
                            if (e instanceof TypeError && (e.message.includes('Load failed') || e.message.includes('Failed to fetch'))) {
                              toast.error("Connection error - please check your internet and try again");
                            } else {
                              toast.error(e?.message || "Network error - please try again");
                            }
                          }
                        }}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Pro - $3.99/month
                      </Button>
                    </div>
                </>
              )}

              {subscriptionTier === 'pro' && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Thank you for being a Pro member! You have access to all premium features.
                      </p>

                      {loadingSubscription ? (
                        <p className="text-sm text-muted-foreground">Loading subscription details...</p>
                      ) : subscriptionDetails ? (
                        <div className="space-y-3">
                          {/* Subscription dates */}
                          <div className="bg-sand-50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Member since:</span>
                              <span className="font-medium">{formatDate(subscriptionDetails.created)}</span>
                            </div>
                            {subscriptionDetails.cancelAtPeriodEnd ? (
                              <div className="flex items-center gap-2 text-sm">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <span className="text-amber-600">Access ends:</span>
                                <span className="font-medium text-amber-600">{formatDate(subscriptionDetails.currentPeriodEnd)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Renews:</span>
                                <span className="font-medium">{formatDate(subscriptionDetails.currentPeriodEnd)}</span>
                              </div>
                            )}
                          </div>

                          {/* Cancellation pending notice */}
                          {subscriptionDetails.cancelAtPeriodEnd && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <p className="text-sm text-amber-800">
                                Your subscription is set to cancel. You'll continue to have Pro access until {formatDate(subscriptionDetails.currentPeriodEnd)}.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                                onClick={handleReactivateSubscription}
                                disabled={cancellingSubscription}
                              >
                                {cancellingSubscription ? 'Processing...' : 'Keep my subscription'}
                              </Button>
                            </div>
                          )}

                          {/* Cancel button */}
                          {!subscriptionDetails.cancelAtPeriodEnd && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  Cancel subscription
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel your Pro subscription?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    You'll continue to have access to all Pro features until {formatDate(subscriptionDetails.currentPeriodEnd)}. After that, you'll be switched to the free plan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleCancelSubscription}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={cancellingSubscription}
                                  >
                                    {cancellingSubscription ? 'Cancelling...' : 'Yes, cancel'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Connected People Table */}
          <div className="bg-background rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium">Connected People</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Anyone you've shared a trip with, and anyone who has shared a trip with you.
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {loadingContacts ? "..." : contacts.length}
                </Badge>
              </div>

              <Separator className="mb-4" />

              {loadingContacts ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No connections yet.</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share a trip to start connecting with other travelers.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      {contacts.map((c) => {
                        const name = pickBestName(c);
                        const hint = c.email ? c.email : c.directions.includes("incoming") ? "Shared with you" : "Shared by you";
                        const statusText = c.directions.includes("incoming") && c.directions.includes("outgoing") ? "Connected" : c.directions.includes("outgoing") ? "Outgoing Request" : "Incoming Request";
                        const statusVariant = c.directions.includes("incoming") && c.directions.includes("outgoing") ? "default" : "secondary";

                        return (
                          <TableRow
                            key={c.key}
                            className="cursor-pointer hover:bg-sand-50 transition-colors"
                            onClick={() => openEditDialog(c)}
                          >
                            <TableCell className="w-12 py-4">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-earth-100 text-earth-700">
                                  {initialsFor(c)}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-sm">{name}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-xs">{hint}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-right">
                              <Badge
                                variant={statusVariant}
                                className={
                                  statusVariant === "default"
                                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                                    : "bg-sand-100 text-sand-700 hover:bg-sand-100"
                                }
                              >
                                {statusText}
                              </Badge>
                            </TableCell>
                            <TableCell className="w-12 py-4 text-right">
                              <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Sign Out Link */}
          <div className="mt-8 text-center">
            <button
              onClick={handleSignOut}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              Sign out
            </button>
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
