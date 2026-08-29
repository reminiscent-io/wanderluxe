import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Check, Camera, Calendar, AlertCircle, ChevronRight, Clock, Download, Trash2, ShieldAlert } from "lucide-react";
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

const SAFE_EMAIL_MAX_LEN = 254;
const SAFE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(s: string): boolean {
  return !!s && s.length <= SAFE_EMAIL_MAX_LEN && SAFE_EMAIL_RE.test(s);
}

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Not available';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatIsoDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Not available';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Never';

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
}

function addCacheBusting(url: string | null): string | null {
  if (!url) return null;
  if (url.includes('?')) return url;
  return `${url}?t=${Date.now()}`;
}

async function getAuthToken(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData?.session?.access_token ?? null;
}

async function authenticatedPost(
  url: string,
  successMessage: string,
  failureMessage: string,
): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) {
    toast.error("Please sign in");
    return false;
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (resp.ok) {
    toast.success(successMessage);
    return true;
  }

  const data = await resp.json();
  toast.error(data.error || failureMessage);
  return false;
}

async function handleCheckoutUpgrade(): Promise<void> {
  const token = await getAuthToken();
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
    globalThis.location.href = data.url;
  } else {
    toast.error(data.error || "Failed to start checkout");
  }
}

function getContactStatus(c: ContactItem): { text: string; variant: "default" | "secondary" } {
  const hasIncoming = c.directions.includes("incoming");
  const hasOutgoing = c.directions.includes("outgoing");
  if (hasIncoming && hasOutgoing) return { text: "Connected", variant: "default" };
  if (hasOutgoing) return { text: "Outgoing Request", variant: "secondary" };
  return { text: "Incoming Request", variant: "secondary" };
}

type SubscriptionDetails = {
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt: number | null;
  created: number;
};

const UpgradeSection: React.FC<{ onUpgrade: () => Promise<void> }> = ({ onUpgrade }) => (
  <div className="mt-6 space-y-5">
    <h3 className="font-display text-xl text-earth-800">Upgrade to Pro</h3>
    <ul className="grid gap-2.5 text-sm text-earth-700 sm:grid-cols-2">
      <li className="flex items-start gap-2">
        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        Print Studio: keepsake itineraries designed by AI
      </li>
      <li className="flex items-start gap-2">
        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        A custom palette, type, and theme for every trip
      </li>
      <li className="flex items-start gap-2">
        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        Early access to new features
      </li>
      <li className="flex items-start gap-2">
        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        Priority support
      </li>
    </ul>
    <Button
      variant="sunset"
      className="w-full sm:w-auto"
      onClick={async () => {
        try {
          await onUpgrade();
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          console.error('Checkout error:', message);
          if (e instanceof TypeError && (e.message.includes('Load failed') || e.message.includes('Failed to fetch'))) {
            toast.error("Connection error - please check your internet and try again");
          } else {
            toast.error(message || "Network error - please try again");
          }
        }
      }}
    >
      <Crown className="h-4 w-4 mr-2" />
      Upgrade to Pro · $3.99/month
    </Button>
  </div>
);

const ProDetailsSection: React.FC<{
  loadingSubscription: boolean;
  subscriptionDetails: SubscriptionDetails | null;
  cancellingSubscription: boolean;
  onCancel: () => Promise<void>;
  onReactivate: () => Promise<void>;
}> = ({ loadingSubscription, subscriptionDetails, cancellingSubscription, onCancel, onReactivate }) => (
  <div className="mt-6 space-y-5">
    <p className="text-sm text-earth-700 max-w-prose">
      Thank you for being a Pro member. You have access to every premium feature.
    </p>

    {loadingSubscription && (
      <p className="text-sm text-muted-foreground">Loading subscription details...</p>
    )}

    {!loadingSubscription && subscriptionDetails && (
      <div className="space-y-5">
        <dl className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-2">
          <div className="flex items-baseline gap-2">
            <dt className="text-earth-600">Member since</dt>
            <dd className="font-medium tabular-nums text-earth-800">{formatDate(subscriptionDetails.created)}</dd>
          </div>
          {subscriptionDetails.cancelAtPeriodEnd ? (
            <div className="flex items-baseline gap-2">
              <dt className="text-amber-700">Access ends</dt>
              <dd className="font-medium tabular-nums text-amber-800">{formatDate(subscriptionDetails.currentPeriodEnd)}</dd>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <dt className="text-earth-600">Renews</dt>
              <dd className="font-medium tabular-nums text-earth-800">{formatDate(subscriptionDetails.currentPeriodEnd)}</dd>
            </div>
          )}
        </dl>

        {subscriptionDetails.cancelAtPeriodEnd && (
          <div className="bg-amber-50 border border-amber-200 rounded-card p-4">
            <p className="text-sm text-amber-800">
              Your subscription is set to cancel. You'll continue to have Pro access until {formatDate(subscriptionDetails.currentPeriodEnd)}.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-amber-300 bg-transparent text-amber-700 hover:bg-amber-100 hover:text-amber-800"
              onClick={onReactivate}
              disabled={cancellingSubscription}
            >
              {cancellingSubscription ? 'Processing...' : 'Keep my subscription'}
            </Button>
          </div>
        )}

        {!subscriptionDetails.cancelAtPeriodEnd && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 text-earth-600 hover:text-destructive"
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
                  onClick={onCancel}
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
    )}
  </div>
);

const SKELETON_IDS = ['skeleton-a', 'skeleton-b', 'skeleton-c'] as const;

const ContactsLoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    {SKELETON_IDS.map((id) => (
      <div key={id} className="flex items-center gap-4 p-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    ))}
  </div>
);

const ContactsList: React.FC<{
  loading: boolean;
  contacts: ContactItem[];
  onContactClick: (c: ContactItem) => void;
}> = ({ loading, contacts, onContactClick }) => {
  if (loading) return <ContactsLoadingSkeleton />;
  if (contacts.length === 0) return <ContactsEmptyState />;
  return (
    <Table>
      <TableBody>
        {contacts.map((c) => (
          <ContactRow key={c.key} contact={c} onClick={onContactClick} />
        ))}
      </TableBody>
    </Table>
  );
};

const ContactsEmptyState: React.FC = () => (
  <div className="text-center py-12">
    <p className="text-sm text-muted-foreground">No connections yet.</p>
    <p className="text-xs text-muted-foreground mt-2">
      Share a trip to start connecting with other travelers.
    </p>
  </div>
);

const ContactRow: React.FC<{ contact: ContactItem; onClick: (c: ContactItem) => void }> = ({ contact, onClick }) => {
  const name = pickBestName(contact);
  let hint: string;
  if (contact.email) {
    hint = contact.email;
  } else if (contact.directions.includes("incoming")) {
    hint = "Shared with you";
  } else {
    hint = "Shared by you";
  }
  const status = getContactStatus(contact);

  return (
    <TableRow
      className="cursor-pointer hover:bg-sand-50 transition-colors"
      onClick={() => onClick(contact)}
    >
      <TableCell className="w-12 py-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-earth-100 text-earth-700">
            {initialsFor(contact)}
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
          variant={status.variant}
          className={
            status.variant === "default"
              ? "bg-green-100 text-green-700 hover:bg-green-100"
              : "bg-sand-100 text-sand-700 hover:bg-sand-100"
          }
        >
          {status.text}
        </Badge>
      </TableCell>
      <TableCell className="w-12 py-4 text-right">
        <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
      </TableCell>
    </TableRow>
  );
};

const DataPrivacySection: React.FC = () => {
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleExportData = async () => {
    try {
      setExportingData(true);
      const token = await getAuthToken();
      if (!token) { toast.error('Please sign in'); return; }

      const resp = await fetch('/api/account/export', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        const data = await resp.json();
        toast.error(data.error || 'Failed to export data');
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wanderluxe-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const token = await getAuthToken();
      if (!token) { toast.error('Please sign in'); return; }

      const resp = await fetch('/api/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        const data = await resp.json();
        toast.error(data.error || 'Failed to delete account');
        return;
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      toast.success('Your account has been permanently deleted');
      window.location.href = '/';
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <section className="bg-card rounded-card border border-border shadow-warm-sm">
      <div className="p-6 md:p-8">
        <header className="flex items-baseline gap-3">
          <ShieldAlert className="h-5 w-5 text-earth-600 self-center" />
          <h2 className="font-display text-2xl md:text-3xl text-earth-800">Data & privacy</h2>
        </header>
        <p className="mt-2 text-sm text-earth-600 max-w-prose">
          Export everything you've created, or close your account permanently.
        </p>

        <div className="mt-6 divide-y divide-border">
          {/* Download My Data */}
          <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
            <div>
              <p className="text-sm font-medium">Download my data</p>
              <p className="text-xs text-muted-foreground">
                Get a copy of all your personal data in JSON format
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              disabled={exportingData}
              className="shrink-0"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportingData ? 'Exporting...' : 'Export'}
            </Button>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
            <div>
              <p className="text-sm font-medium text-destructive">Delete account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <AlertDialog open={showDeleteWarning} onOpenChange={(open) => {
              setShowDeleteWarning(open);
              if (!open) { setShowFinalConfirm(false); setConfirmText(''); }
            }}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-destructive hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Delete your account?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        This action is <strong>permanent and cannot be undone</strong>. The following will be deleted:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Your profile and account information</li>
                        <li>All trips you created (including itineraries, bookings, and expenses)</li>
                        <li>All AI chat conversations</li>
                        <li>Your subscription (if applicable)</li>
                        <li>All shared trip connections</li>
                      </ul>
                      <p className="text-sm font-medium">
                        We recommend downloading your data first before proceeding.
                      </p>

                      {!showFinalConfirm ? (
                        <Button
                          variant="destructive"
                          className="w-full mt-2"
                          onClick={() => setShowFinalConfirm(true)}
                        >
                          I understand, continue
                        </Button>
                      ) : (
                        <div className="space-y-3 mt-2 p-3 bg-red-50 rounded-card border border-red-200">
                          <p className="text-sm font-medium text-destructive">
                            Type <strong>DELETE</strong> to confirm:
                          </p>
                          <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="border-red-200"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  {showFinalConfirm && (
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={confirmText !== 'DELETE' || deletingAccount}
                    >
                      {deletingAccount ? 'Deleting...' : 'Permanently delete my account'}
                    </Button>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </section>
  );
};

const Profile = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error) {
      console.error("Sign out error:", error);
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

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchContacts();
    }
    // fetchProfile/fetchContacts are stable closures; only re-fetch when session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (subscriptionTier === 'pro') {
      fetchSubscriptionDetails();
    }
  }, [subscriptionTier]);

  const fetchSubscriptionDetails = async () => {
    try {
      setLoadingSubscription(true);
      const token = await getAuthToken();
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
      const success = await authenticatedPost(
        '/api/stripe/cancel-subscription',
        "Subscription cancelled. You'll have access until the end of your billing period.",
        "Failed to cancel subscription",
      );
      if (success) await fetchSubscriptionDetails();
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
      const success = await authenticatedPost(
        '/api/stripe/reactivate-subscription',
        "Subscription reactivated!",
        "Failed to reactivate subscription",
      );
      if (success) await fetchSubscriptionDetails();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast.error("Failed to reactivate subscription");
    } finally {
      setCancellingSubscription(false);
    }
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

      await supabase.storage.from('avatars').remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setAvatarUrl(cacheBustedUrl);
      await refreshProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image');
      return;
    }
    uploadAvatar(file);
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

      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (c: ContactItem) => {
    const name = (pickBestName(c) || "").trim();
    const [first = "", ...rest] = name.split(/\s+/);
    const last = rest.join(" ");
    const preFirst = (c.share_first_name?.trim() || first).trim();
    const preLast = (c.share_last_name?.trim() || last).trim();
    const preEmail = (c.email || "").trim();

    setEditFirst(preFirst);
    setEditLast(preLast);
    setEditEmail(preEmail);
    setOriginalEmail(preEmail || null);
    setEditOpen(true);
  };

  const saveContactEdits = async () => {
    try {
      setSavingContact(true);

      if (!originalEmail && !editEmail) {
        toast.error("Please provide an email to save this contact.");
        setSavingContact(false);
        return;
      }

      if (originalEmail) {
        const { error: updErr } = await supabase
          .from("trip_shares")
          .update({
            first_name: editFirst || null,
            last_name: editLast || null,
            shared_with_email: editEmail || null,
          })
          .eq("shared_with_email", originalEmail);

        if (updErr) throw updErr;
      }

      setEditOpen(false);
      await fetchContacts();
    } catch (e: unknown) {
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

  const isPro = subscriptionTier === 'pro';

  return (
    <div className="flex flex-col min-h-screen bg-sand-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-20 md:pt-28 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Page header — editorial anchor */}
          <header className="mb-10 md:mb-14">
            <h1 className="font-display text-4xl md:text-5xl text-earth-800 leading-[1.05] tracking-tight">
              Your account
            </h1>
            <p className="mt-3 text-base text-earth-600 max-w-prose">
              Profile, subscription, connections, and data, all in one place.
            </p>
          </header>

          <div className="space-y-8 md:space-y-10">
            {/* Identity Card */}
            <section className="bg-card rounded-card border border-border shadow-warm-sm">
              <div className="p-6 md:p-10">
                <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-10">
                  {/* Avatar */}
                  <div className="flex flex-col items-center md:items-start gap-4 md:w-auto w-full shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {avatarUrl ? (
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        disabled={uploadingAvatar}
                        aria-label="Change profile photo"
                        className="group relative rounded-full ring-1 ring-border transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-earth-600 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-50"
                        style={{ width: '128px', height: '128px' }}
                      >
                        <Avatar style={{ width: '128px', height: '128px' }}>
                          <AvatarImage src={avatarUrl} alt="" />
                          <AvatarFallback className="text-3xl font-display bg-sand-50 text-earth-700">
                            {uploadingAvatar ? '...' : userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Camera className="h-8 w-8 text-white" />
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        disabled={uploadingAvatar}
                        aria-label="Upload profile photo"
                        className="rounded-full border-2 border-dashed border-earth-300 hover:border-earth-500 transition-colors flex flex-col items-center justify-center gap-2 bg-sand-50 hover:bg-sand-100 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-earth-600 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        style={{ width: '128px', height: '128px' }}
                      >
                        {uploadingAvatar ? (
                          <div className="text-sm text-muted-foreground">Uploading...</div>
                        ) : (
                          <>
                            <Camera className="h-8 w-8 text-earth-500" />
                            <span className="text-xs text-earth-600">Upload photo</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Right column — heading, meta strip, form */}
                  <div className="flex-1 w-full min-w-0">
                    <header className="flex items-baseline gap-3">
                      <h2 className="font-display text-2xl md:text-3xl text-earth-800">Profile</h2>
                    </header>

                    <dl className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-earth-600">
                      <div className="flex min-w-0 items-center gap-1.5 max-w-full">
                        <dt className="sr-only">Email</dt>
                        <dd className="font-medium text-earth-800 truncate">{session.user.email}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        <dt className="sr-only">Member since</dt>
                        <dd>Member since {formatIsoDate(createdAt)}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <dt className="sr-only">Last login</dt>
                        <dd>Last login {formatRelativeTime(lastLoginAt)}</dd>
                      </div>
                    </dl>

                    <div className="mt-8 grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full name</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="homeLocation">Home location</Label>
                        <Input
                          id="homeLocation"
                          value={homeLocation}
                          onChange={(e) => setHomeLocation(e.target.value)}
                          placeholder="Where you start from"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="bg-earth-600 hover:bg-earth-700 text-white"
                      >
                        {isLoading ? 'Saving...' : 'Save changes'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Subscription Card */}
            <section className="bg-card rounded-card border border-border shadow-warm-sm">
              <div className="p-6 md:p-8">
                <header className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-3">
                    <Crown
                      className={`h-5 w-5 self-center ${isPro ? 'text-amber-600' : 'text-earth-500'}`}
                      aria-hidden="true"
                    />
                    <h2 className="font-display text-2xl md:text-3xl text-earth-800">Subscription</h2>
                  </div>
                  <Badge
                    className={isPro ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-sand-100 text-earth-700 hover:bg-sand-100'}
                  >
                    {isPro ? 'Pro' : 'Free'}
                  </Badge>
                </header>
                <p className="mt-2 text-sm text-earth-600 max-w-prose">
                  {isPro ? 'Every premium feature is yours.' : 'Upgrade to unlock the full experience.'}
                </p>

                {!isPro && (
                  <UpgradeSection onUpgrade={handleCheckoutUpgrade} />
                )}

                {isPro && (
                  <ProDetailsSection
                    loadingSubscription={loadingSubscription}
                    subscriptionDetails={subscriptionDetails}
                    cancellingSubscription={cancellingSubscription}
                    onCancel={handleCancelSubscription}
                    onReactivate={handleReactivateSubscription}
                  />
                )}
              </div>
            </section>

            {/* Connected People — header padded, table flush to edges */}
            <section className="bg-card rounded-card border border-border shadow-warm-sm overflow-hidden">
              <header className="p-6 md:p-8 pb-0 md:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl md:text-3xl text-earth-800">Connected people</h2>
                  <Badge variant="secondary" className="text-sm tabular-nums">
                    {loadingContacts ? "…" : contacts.length}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-earth-600 max-w-prose">
                  Anyone you've shared a trip with, and anyone who has shared a trip with you.
                </p>
              </header>

              <div className="mt-6 border-t border-border">
                <ContactsList
                  loading={loadingContacts}
                  contacts={contacts}
                  onContactClick={openEditDialog}
                />
              </div>
            </section>

            {/* Data & Privacy Card */}
            <DataPrivacySection />
          </div>

          {/* Sign-out — generous separation, proper treatment */}
          <div className="mt-12 md:mt-16 pt-8 border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-earth-800">Signed in as</p>
                <p className="text-sm text-earth-600 mt-0.5 truncate max-w-[20rem]">{session.user.email}</p>
              </div>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-earth-700 hover:text-destructive hover:bg-sand-100"
              >
                Sign out
              </Button>
            </div>
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
