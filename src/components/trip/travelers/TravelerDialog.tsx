import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { travelerSchema, TravelerForm } from "./schemas";
import { upsertTraveler } from "@/services/travelers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Traveler } from "@/hooks/useTravelers";
import { Eye, Edit, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { shareTrip } from "@/services/tripSharingService";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getConnectedContacts, pickBestName } from "@/services/contactsService";

interface TravelerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  traveler?: Traveler | null;
}

type Perm = "read" | "edit";
const normalizePermission = (p?: string | null): Perm =>
  (p && p.toLowerCase() === "edit") ? "edit" : "read";

const emailIsValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());

export default function TravelerDialog({
  open,
  onOpenChange,
  tripId,
  traveler,
}: TravelerDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!traveler;
  const isOwner = !!(traveler as any)?.is_owner;

  const form = useForm<TravelerForm>({
    resolver: zodResolver(travelerSchema),
    defaultValues: {
      first_name: traveler?.first_name || "",
      last_name: traveler?.last_name || "",
      shared_with_email: (traveler?.shared_with_email || "").trim(),
      permission_level: isOwner ? "edit" : normalizePermission(traveler?.permission_level),
    },
  });

  const perm = (form.watch("permission_level") as Perm) || "read";
  const watchedEmail = form.watch("shared_with_email");
  const hasEmail = !!watchedEmail?.trim();

  // Remember the row created by Share so subsequent Save is an UPDATE, not a duplicate INSERT
  const [createdShareId, setCreatedShareId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    form.reset({
      first_name: traveler?.first_name || "",
      last_name: traveler?.last_name || "",
      shared_with_email: (traveler?.shared_with_email || "").trim(),
      permission_level: isOwner ? "edit" : normalizePermission(traveler?.permission_level),
    });
    if (isOwner) {
      form.setValue("permission_level", "edit", { shouldDirty: false, shouldTouch: false });
    }
    setCreatedShareId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, traveler?.id, traveler?.permission_level]);

  useEffect(() => {
    const hydrate = async () => {
      if (!open) return;
      const id = (traveler as any)?.id;
      if (!id || isOwner) return;
      const { data, error } = await supabase
        .from("trip_shares" as any)
        .select("permission_level")
        .eq("id", id)
        .maybeSingle();
      if (!error && data?.permission_level) {
        form.setValue("permission_level", normalizePermission(data.permission_level), {
          shouldDirty: false,
          shouldTouch: false,
        });
      }
    };
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, (traveler as any)?.id]);

  // Contacts for quick prefilling
  const [contacts, setContacts] = useState<any[]>([]);
  useEffect(() => {
    const run = async () => {
      if (!open) return;
      try {
        const list = await getConnectedContacts();
        setContacts(list.filter((c) => !!(c.email || c.profile_full_name)));
      } catch (e) {
        console.error("contacts load failed", e);
      }
    };
    run();
  }, [open]);

  const handlePickContact = (key: string) => {
    const c = contacts.find((x) => x.key === key);
    if (!c) return;
    const name = (c.profile_full_name && c.profile_full_name.trim())
      ? c.profile_full_name.trim()
      : `${c.share_first_name ?? ""} ${c.share_last_name ?? ""}`.trim();
    const [first, ...rest] = name ? name.split(" ") : [""];
    const last = rest.join(" ");
    if (!isOwner) {
      form.setValue("first_name", first || "", { shouldDirty: true });
      form.setValue("last_name", last || "", { shouldDirty: true });
      if (c.email) form.setValue("shared_with_email", c.email, { shouldDirty: true });
    }
  };

  const upsertMutation = useMutation({
    mutationFn: async (data: TravelerForm) => {
      // Use existing id, or the id captured when Share created the row
      const idToUse =
        ((isEditing && (traveler as any)?.id) ? (traveler as any).id : createdShareId) || undefined;

      const payload = {
        ...(idToUse ? { id: idToUse } : {}),
        first_name: data.first_name,
        last_name: data.last_name || undefined,
        shared_with_email: data.shared_with_email?.trim() || undefined,
        permission_level: normalizePermission(data.permission_level),
      };

      const { data: result, error } = await upsertTraveler(tripId, payload);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelers", tripId] });
      onOpenChange(false);
      form.reset();
      setCreatedShareId(null);
    },
    onError: (error: any) => {
      console.error("Error saving traveler:", error);
      const msg = String(error?.message || "").toLowerCase();
      const isDup = msg.includes("duplicate key") || error?.code === "23505";
      if (isDup) {
        // already exists; treat as success for UX
        toast.success("Traveler already added");
        onOpenChange(false);
        form.reset();
        setCreatedShareId(null);
        return;
      }
      toast.error("Failed to save traveler");
    },
  });

  const onSubmit = (data: TravelerForm) => {
    if (isOwner) {
      toast.info("Owner details cannot be modified here.");
      onOpenChange(false);
      return;
    }
    // Prevent "second save after share" no-op from throwing confusing errors
    if (!form.formState.isDirty) {
      onOpenChange(false);
      return;
    }
    upsertMutation.mutate(data);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setCreatedShareId(null);
  };

  // Share email
  const [sending, setSending] = useState(false);
  const canShare = useMemo(() => emailIsValid(watchedEmail) && !isOwner, [watchedEmail, isOwner]);

  const handleSaveAndSend = async () => {
    if (!canShare) return;

    // Validate form before proceeding
    const isValid = await form.trigger();
    if (!isValid) return;

    try {
      setSending(true);

      // 1) Idempotent create/update of the traveler row
      const idToUse =
        ((isEditing && (traveler as any)?.id) ? (traveler as any).id : createdShareId) || undefined;
      const payload = {
        ...(idToUse ? { id: idToUse } : {}),
        first_name: form.getValues("first_name"),
        last_name: form.getValues("last_name") || undefined,
        shared_with_email: watchedEmail.trim(),
        permission_level: normalizePermission(form.getValues("permission_level")),
      };
      const { data: upserted, error: upsertErr } = await upsertTraveler(tripId, payload);

      if (upsertErr) {
        const msg = String(upsertErr.message || "").toLowerCase();
        const isDup = msg.includes("duplicate key") || (upsertErr as any)?.code === "23505";
        if (!isDup) {
          toast.error("Could not add traveler");
          return;
        }
      }

      // 2) Capture created/located id
      if ((upserted as any)?.id) {
        setCreatedShareId((upserted as any).id);
      } else {
        const { data: row } = await supabase
          .from("trip_shares" as any)
          .select("id")
          .eq("trip_id", tripId)
          .eq("shared_with_email", watchedEmail.trim())
          .maybeSingle();
        if (row?.id) setCreatedShareId(row.id);
      }

      // 3) Send email
      const { data: trip } = await supabase
        .from("trips")
        .select("destination")
        .eq("trip_id", tripId)
        .single();
      const destination = trip?.destination || "your trip";

      const ok = await shareTrip(
        tripId,
        watchedEmail.trim(),
        destination,
        normalizePermission(form.getValues("permission_level"))
      );

      if (ok) {
        toast.success(isEditing ? "Traveler updated & invite sent" : "Traveler added & invite sent");
      } else {
        toast.success(isEditing ? "Traveler updated (email could not be sent)" : "Traveler added (email could not be sent)");
      }

      queryClient.invalidateQueries({ queryKey: ["travelers", tripId] });
      onOpenChange(false);
      form.reset();
      setCreatedShareId(null);
    } catch (err) {
      console.error("Error in save & send:", err);
      toast.error("Failed to save traveler");
    } finally {
      setSending(false);
    }
  };

  // ----- DELETE FUNCTIONALITY -----
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Guard: never delete owner
      if (isOwner) {
        throw new Error("Owner cannot be removed");
      }

      // Prefer explicit id (existing traveler row or one created during Share)
      const id =
        (traveler as any)?.id ||
        createdShareId ||
        null;

      if (id) {
        const { error } = await supabase
          .from("trip_shares" as any)
          .delete()
          .eq("id", id);
        if (error) throw error;
        return;
      }

      // Fallback: delete by (trip_id, shared_with_email) if no id is known yet
      const email = (form.getValues("shared_with_email") || "").trim();
      if (!email) {
        throw new Error("No traveler id or email available for deletion");
      }

      const { error } = await supabase
        .from("trip_shares" as any)
        .delete()
        .eq("trip_id", tripId)
        .eq("shared_with_email", email);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelers", tripId] });
      setCreatedShareId(null);
      onOpenChange(false);
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to remove traveler";
      toast.error(msg);
    },
  });

  const handleDelete = () => {
    if (isOwner) {
      toast.info("The trip owner cannot be removed.");
      return;
    }
    const name = `${form.getValues("first_name") || ""} ${form.getValues("last_name") || ""}`.trim();
    const email = (form.getValues("shared_with_email") || "").trim();
    const label = name || email || "this traveler";
    if (window.confirm(`Remove ${label} from this trip? This will revoke their access.`)) {
      deleteMutation.mutate();
    }
  };
  // ----- END DELETE FUNCTIONALITY -----

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" key={(traveler as any)?.id ?? "new"}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Traveler" : "Add Traveler"}
            {isOwner && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full align-middle">
                Owner
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Quick pick from known contacts */}
            {!isOwner && contacts.length > 0 && (
              <FormItem>
                <FormLabel>Pick from your contacts</FormLabel>
                <Select onValueChange={(v) => handlePickContact(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a person you've shared with before" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {contacts.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {pickBestName(c)} {c.email ? `— ${c.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}

            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter first name" disabled={isOwner} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter last name (optional)" disabled={isOwner} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shared_with_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (for sharing)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="email@example.com (optional)"
                      disabled={isOwner}
                    />
                  </FormControl>
                  {!emailIsValid(watchedEmail) && watchedEmail && (
                    <p className="text-xs text-red-600 mt-1">Please enter a valid email address</p>
                  )}
                  {isOwner && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Owner email and permissions cannot be modified.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permission_level"
              render={() => {
                const disabled = !hasEmail || isOwner;

                return (
                  <FormItem>
                    <FormLabel>Permission Level</FormLabel>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      value={perm}
                      onValueChange={(v) =>
                        v &&
                        form.setValue("permission_level", v as Perm, {
                          shouldDirty: true,
                          shouldTouch: true,
                        })
                      }
                      disabled={disabled}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="read" aria-label="View only">
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </ToggleGroupItem>
                      <ToggleGroupItem value="edit" aria-label="Can edit">
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </ToggleGroupItem>
                    </ToggleGroup>
                    {!hasEmail && !isOwner && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Add an email address to enable permission settings.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="flex gap-2 pt-4">
              {/* DELETE (only when editing a non-owner) */}
              {isEditing && !isOwner && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Delete traveler"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}

              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={upsertMutation.isPending || isOwner || !form.formState.isDirty}
                className="flex-1"
              >
                {upsertMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                onClick={handleSaveAndSend}
                disabled={!canShare || sending || upsertMutation.isPending || isOwner}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-1.5" />
                {sending ? "Sending..." : "Save & Send"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
