import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, PlusCircle, X, Mail, Eye, Edit } from "lucide-react";
import { toast } from "sonner";
import {
  shareTrip,
  getTripShares,
  removeTripShare,
  updateTripSharePermission,
  getPreviouslySharedEmails,
} from "@/services/tripSharingService";
import { supabase } from "@/integrations/supabase/client";
import {
  TripShare,
  PermissionLevel,
} from "@/integrations/supabase/trip_shares_types";
import { EmailCombobox } from "@/components/ui/email-combobox";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  getConnectedContacts,
  contactsByEmail,
  pickBestName,
} from "@/services/contactsService";

interface ShareTripDialogProps {
  tripId: string;
  tripDestination: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const ShareTripDialog = ({
  tripId,
  tripDestination,
  open,
  onOpenChange,
}: ShareTripDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dialogOpen = open ?? isOpen;
  const setDialogOpen = onOpenChange ?? setIsOpen;

  const [emails, setEmails] = useState<string[]>([""]);
  const [permissionLevel, setPermissionLevel] =
    useState<PermissionLevel>("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingShares, setExistingShares] = useState<TripShare[]>([]);
  const [currentUser, setCurrentUser] = useState<{
    fullName: string | null;
    email: string | null;
  }>({
    fullName: null,
    email: null,
  });

  // contacts + suggestions
  const [previousEmails, setPreviousEmails] = useState<string[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsMap, setContactsMap] = useState<Record<string, any>>({});
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);

  // Get the signed-in user (trip owner in this dialog’s context):contentReference[oaicite:2]{index=2}
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user || !active) return;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .single();

        if (!active) return;
        setCurrentUser({
          fullName: profileData?.full_name ?? null,
          email: data.user.email ?? null,
        });
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load shares/contacts when dialog opens:contentReference[oaicite:3]{index=3}
  useEffect(() => {
    if (!dialogOpen) return;
    let active = true;

    (async () => {
      try {
        setIsLoading(true);
        const [shares, prevEmails, list] = await Promise.all([
          getTripShares(tripId),
          getPreviouslySharedEmails(tripId),
          getConnectedContacts(),
        ]);
        if (!active) return;
        setExistingShares(shares);
        setPreviousEmails(prevEmails);
        setContacts(list);
        setContactsMap(contactsByEmail(list));
      } catch (e) {
        console.error("Error initializing share data", e);
        toast.error("Could not load share data.");
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [dialogOpen, tripId]);

  // Build suggestions from previous + contacts
  const mergedSuggestions = useMemo(() => {
    const fromContacts = contacts.map((c) => c.email).filter(Boolean) as string[];
    return Array.from(new Set([...previousEmails, ...fromContacts])).sort();
  }, [previousEmails, contacts]);

  useEffect(() => setEmailSuggestions(mergedSuggestions), [mergedSuggestions]);

  // ❗️Filter out owner from the shares list (don’t show yourself):contentReference[oaicite:4]{index=4}
  const filteredShares = useMemo(() => {
    const me = currentUser.email?.toLowerCase() ?? "";
    return existingShares.filter(
      (s) =>
        !!s.shared_with_email &&
        s.shared_with_email.toLowerCase() !== me
    );
  }, [existingShares, currentUser.email]);

  const fetchExistingShares = async () => {
    try {
      const shares = await getTripShares(tripId);
      setExistingShares(shares);
    } catch (err) {
      console.error("Fetch existing shares failed:", err);
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    setEmails((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };
  const addEmailField = () => setEmails((prev) => [...prev, ""]);
  const removeEmailField = (index: number) =>
    setEmails((prev) => (prev.length === 1 ? [""] : prev.filter((_, i) => i !== index)));

  const handlePickContact = (email: string) => {
    if (!email) return;
    setEmails((prev) => {
      if (prev.includes(email)) return prev;
      const next = [...prev];
      const emptyIdx = next.findIndex((e) => !e.trim());
      if (emptyIdx >= 0) next[emptyIdx] = email;
      else next.push(email);
      return next;
    });
  };

  const nonEmptyEmails = useMemo(
    () => emails.map((e) => e.trim()).filter(Boolean),
    [emails]
  );

  const prefillNameForEmail = useCallback(
    async (email: string) => {
      const known = contactsMap[email.toLowerCase()];
      if (!known) return;

      const [first, ...rest] = (known.profile_full_name || "").split(" ");
      const last = rest.join(" ") || null;

      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user?.id) return;
        await supabase
          .from("trip_shares")
          .upsert(
            {
              trip_id: tripId,
              shared_by_user_id: auth.user.id,
              shared_with_email: email.trim(),
              first_name: known.share_first_name ?? first ?? null,
              last_name: known.share_last_name ?? last,
              permission_level: permissionLevel,
            },
            { onConflict: "trip_id,shared_with_email" }
          );
      } catch {
        // soft-fail: prefill is non-blocking
      }
    },
    [contactsMap, permissionLevel, tripId]
  );

  const handleShareSingle = async (email: string) => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      toast.error("Invalid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      await prefillNameForEmail(trimmed);
      const ok = await shareTrip(tripId, trimmed, tripDestination, permissionLevel);
      if (ok) {
        toast.success(`Shared trip with ${trimmed}`);
        await fetchExistingShares();
        setEmails((prev) => prev.map((e) => (e === trimmed ? "" : e)));
      }
    } catch (err) {
      console.error("Share failed:", err);
      toast.error("Failed to share trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAll = async () => {
    if (!nonEmptyEmails.length) {
      toast.error("Please enter at least one email");
      return;
    }
    const invalid = nonEmptyEmails.find((e) => !isValidEmail(e));
    if (invalid) {
      toast.error(`Invalid email: ${invalid}`);
      return;
    }
    setIsSubmitting(true);
    try {
      let count = 0;
      for (const email of nonEmptyEmails) {
        await prefillNameForEmail(email);
        const ok = await shareTrip(tripId, email, tripDestination, permissionLevel);
        if (ok) count++;
      }
      if (count) {
        toast.success(
          `Trip shared with ${count} ${count === 1 ? "person" : "people"}`
        );
        setEmails([""]);
        fetchExistingShares();
      }
    } catch (err) {
      console.error("Share all failed:", err);
      toast.error("Something went wrong while sharing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const ok = await removeTripShare(shareId);
      if (ok) fetchExistingShares();
    } catch (err) {
      console.error("Error removing share:", err);
      toast.error("Failed to remove share");
    }
  };

  const handleSetPermission = async (
    shareId: string,
    target: PermissionLevel
  ) => {
    // optimistic update:contentReference[oaicite:5]{index=5}
    setExistingShares((prev) =>
      prev.map((s) => (s.id === shareId ? { ...s, permission_level: target } : s))
    );
    try {
      const ok = await updateTripSharePermission(shareId, target);
      if (!ok) throw new Error("Permission update failed");
    } catch (err) {
      console.error("Error updating permission:", err);
      toast.error("Failed to update permission");
      fetchExistingShares(); // rollback
    }
  };

  const baseBtn = "h-8 px-3";
  const baseBtnSmall = "h-7 px-2";
  const selected = "bg-earth-600 text-white hover:bg-earth-700";
  const unselected = "border";

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] sm:max-w-[600px] max-h-[90vh] flex flex-col p-4 sm:p-6"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Share Trip</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-none space-y-4">
          {/* Contacts quick picker */}
          {contacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pick from your contacts</p>
              <Select onValueChange={handlePickContact}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {contacts
                    .filter((c) => !!c.email)
                    .map((c) => (
                      <SelectItem key={c.email} value={c.email!}>
                        {pickBestName(c)} — {c.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Email inputs */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Email addresses</p>
            {emails.map((email, index) => {
              const valid = isValidEmail(email);
              return (
                <div key={index} className="flex items-center gap-2">
                  <EmailCombobox
                    value={email}
                    onChange={(value) => handleEmailChange(index, value)}
                    suggestions={emailSuggestions}
                    placeholder="email@example.com"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className={cn("flex-shrink-0", selected)}
                    onClick={() => handleShareSingle(email)}
                    disabled={!valid || isSubmitting}
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Share
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEmailField(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={addEmailField}
            >
              <PlusCircle className="h-4 w-4" />
              Add Another
            </Button>
          </div>

          {/* New invite permission */}
          <div className="space-y-3 border-t pt-4 mt-4">
            <p className="text-sm font-medium">Permission for new invites</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setPermissionLevel("read")}
                className={cn(baseBtn, permissionLevel === "read" ? selected : unselected)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setPermissionLevel("edit")}
                className={cn(baseBtn, permissionLevel === "edit" ? selected : unselected)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </div>

          {/* Existing shares (owner excluded) */}
          {filteredShares.length > 0 && (
            <div className="space-y-2 border-t pt-4 mt-4">
              <p className="text-sm font-medium">Currently shared with</p>
              <div className="space-y-2">
                {filteredShares.map((share) => {
                  const current = (share.permission_level || "edit") as PermissionLevel;
                  return (
                    <div
                      key={share.id}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">
                          {share.shared_with_email}
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSetPermission(share.id, "read")}
                        className={cn(baseBtnSmall, current === "read" ? selected : unselected)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSetPermission(share.id, "edit")}
                        className={cn(baseBtnSmall, current === "edit" ? selected : unselected)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShare(share.id)}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Owner chip (show email, not in list) */}
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Trip owner:</p>
              <div className="flex items-center gap-2 rounded-md border p-2">
                <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                  {currentUser.fullName
                    ? currentUser.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : currentUser.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="text-sm">
                  {currentUser.fullName || currentUser.email || "You"}
                  {currentUser.fullName && currentUser.email ? (
                    <span className="text-muted-foreground"> ({currentUser.email})</span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Share all */}
        <DialogFooter className="flex sm:justify-between flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={isSubmitting || isLoading || !nonEmptyEmails.length}
            className="bg-earth-600 hover:bg-earth-700 text-white"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTripDialog;
