import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { TripShare, PermissionLevel } from "@/integrations/supabase/trip_shares_types";
import { EmailCombobox } from "@/components/ui/email-combobox";
import { cn } from "@/lib/utils";

interface ShareTripDialogProps {
  tripId: string;
  tripDestination: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const ShareTripDialog = ({
  tripId,
  tripDestination,
  open,
  onOpenChange,
}: ShareTripDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  const [emails, setEmails] = useState<string[]>([""]);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingShares, setExistingShares] = useState<TripShare[]>([]);
  const [currentUser, setCurrentUser] = useState<{ fullName: string | null; email: string | null; }>({
    fullName: null,
    email: null,
  });
  const [previousEmails, setPreviousEmails] = useState<string[]>([]);

  useEffect(() => {
    const getUserInfo = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .single();

        setCurrentUser({
          fullName: profileData?.full_name || null,
          email: data.user.email || null,
        });
      }
    };
    getUserInfo();
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      fetchExistingShares();
      fetchPreviousEmails();
    }
  }, [dialogOpen]);

  const fetchPreviousEmails = async () => {
    try {
      const res = await getPreviouslySharedEmails(tripId);
      setPreviousEmails(res);
    } catch (error) {
      console.error("Error fetching previous emails:", error);
    }
  };

  const fetchExistingShares = async () => {
    setIsLoading(true);
    try {
      const shares = await getTripShares(tripId);
      setExistingShares(shares);
    } catch (error) {
      console.error("Error fetching existing shares:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const next = [...emails];
    next[index] = value;
    setEmails(next);
  };

  const addEmailField = () => setEmails((prev) => [...prev, ""]);

  const removeEmailField = (index: number) => {
    if (emails.length === 1) {
      setEmails([""]);
    } else {
      const next = [...emails];
      next.splice(index, 1);
      setEmails(next);
    }
  };

  const nonEmptyEmails = useMemo(
    () => emails.map((e) => e.trim()).filter((e) => e !== ""),
    [emails]
  );

  const handleShareSingle = async (email: string) => {
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    try {
      const ok = await shareTrip(tripId, email, tripDestination, permissionLevel);
      if (ok) {
        fetchExistingShares();
        fetchPreviousEmails();
        setEmails((prev) => prev.map((e) => (e === email ? "" : e)));
      }
    } catch (err) {
      console.error("Error sharing single email:", err);
      toast.error("Failed to share. Please try again.");
    }
  };

  const handleSaveAll = async () => {
    if (nonEmptyEmails.length === 0) {
      toast.error("Please enter at least one email address");
      return;
    }
    for (const e of nonEmptyEmails) {
      if (!isValidEmail(e)) {
        toast.error(`Invalid email format: ${e}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let successCount = 0;
      for (const email of nonEmptyEmails) {
        const ok = await shareTrip(tripId, email, tripDestination, permissionLevel);
        if (ok) successCount++;
      }
      if (successCount > 0) {
        toast.success(
          `Trip shared with ${successCount} ${successCount === 1 ? "person" : "people"}`
        );
        setEmails([""]);
        fetchExistingShares();
        fetchPreviousEmails();
      }
    } catch (err) {
      console.error("Error sharing trip:", err);
      toast.error("Failed to share the trip. Please try again.");
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
    }
  };

  const handleSetPermission = async (shareId: string, target: PermissionLevel) => {
    try {
      // Optimistic
      setExistingShares((prev) =>
        prev.map((s) => (s.id === shareId ? { ...s, permission_level: target } : s))
      );
      const ok = await updateTripSharePermission(shareId, target);
      if (!ok) {
        // Revert (default fallback to 'edit' if missing)
        setExistingShares((prev) =>
          prev.map((s) =>
            s.id === shareId ? { ...s, permission_level: (s.permission_level || "edit") as PermissionLevel } : s
          )
        );
      }
    } catch (err) {
      console.error("Error updating permission:", err);
      setExistingShares((prev) =>
        prev.map((s) =>
          s.id === shareId ? { ...s, permission_level: (s.permission_level || "edit") as PermissionLevel } : s
        )
      );
    }
  };

  // Shared button styles for dark selection
  const baseBtn = "h-8 px-3";
  const baseBtnSmall = "h-7 px-2";
  const selected = "bg-earth-600 text-white hover:bg-earth-700";
  const unselected = "border";

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] sm:max-w-[600px] max-h-[90vh] flex flex-col p-4 sm:p-6"
        style={{ maxHeight: "90vh", height: "auto" } as React.CSSProperties}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Share Trip</DialogTitle>
          
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto scrollbar-none"
          style={{ maxHeight: "calc(90vh - 200px)" }}
        >
          <div className="space-y-4 pr-2">
            {/* Email inputs */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Email addresses</p>

              {emails.map((email, index) => {
                const valid = isValidEmail(email);
                return (
                  <div key={index} className="flex items-center gap-1 sm:gap-2">
                    <div className="relative flex-1 min-w-0">
                      <EmailCombobox
                        value={email}
                        onChange={(value) => handleEmailChange(index, value)}
                        suggestions={previousEmails}
                        placeholder="email@example.com"
                      />
                    </div>

                    {/* Inline Share button */}
                    <Button
                      type="button"
                      size="sm"
                      className={cn("h-8 px-2 sm:px-3 flex-shrink-0", selected)}
                      onClick={() => handleShareSingle(email)}
                      disabled={!valid || isSubmitting}
                    >
                      <Share2 className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Share Trip</span>
                      <span className="sm:hidden">Share</span>
                    </Button>

                    {/* Remove field */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmailField(index)}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

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

            {/* New invite permission — two-button dark selection */}
            <div className="space-y-3 border-t pt-4 mt-4">
              <p className="text-sm font-medium">Permission for new invites</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPermissionLevel("read")}
                  className={cn(baseBtn, permissionLevel === "read" ? selected : unselected)}
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPermissionLevel("edit")}
                  className={cn(baseBtn, permissionLevel === "edit" ? selected : unselected)}
                  variant="outline"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>

            {/* Existing shares — per-row two-button dark selection */}
            {existingShares.length > 0 && (
              <div className="space-y-2 border-t pt-4 mt-6">
                <p className="text-sm font-medium">Currently shared with</p>

                <div className="space-y-2">
                  {existingShares.map((share) => {
                    const current = (share.permission_level || "edit") as PermissionLevel;
                    return (
                      <div
                        key={share.id}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{share.shared_with_email}</span>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSetPermission(share.id, "read")}
                          className={cn(baseBtnSmall, current === "read" ? selected : unselected)}
                          variant="outline"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSetPermission(share.id, "edit")}
                          className={cn(baseBtnSmall, current === "edit" ? selected : unselected)}
                          variant="outline"
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

            {/* Owner chip */}
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
                          .substring(0, 2)
                      : currentUser.email
                      ? currentUser.email[0].toUpperCase()
                      : "U"}
                  </div>
                  <span className="text-sm">
                    {currentUser.fullName || currentUser.email || "You"}
                  </span>
                </div>
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
            disabled={isSubmitting || isLoading || nonEmptyEmails.length === 0}
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
