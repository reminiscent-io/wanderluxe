import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { travelerSchema, TravelerForm } from "./schemas";
import { upsertTraveler } from "@/services/travelers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Traveler } from "@/hooks/useTravelers";
import { cn } from "@/lib/utils";
import { Eye, Edit, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { shareTrip } from "@/services/tripSharingService";

interface TravelerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  traveler?: Traveler | null;
}

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
      shared_with_email: traveler?.shared_with_email || "",
      permission_level: traveler?.permission_level || "read",
    },
  });

  const watchedEmail = form.watch("shared_with_email");
  const hasEmail = !!watchedEmail;

  // Reset form when traveler changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        first_name: traveler?.first_name || "",
        last_name: traveler?.last_name || "",
        shared_with_email: traveler?.shared_with_email || "",
        permission_level: traveler?.permission_level || "read",
      });
    }
  }, [open, traveler, form]);

  const upsertMutation = useMutation({
    mutationFn: async (data: TravelerForm) => {
      const payload = {
        ...(isEditing && (traveler as any).id ? { id: (traveler as any).id } : {}),
        first_name: data.first_name,
        last_name: data.last_name || undefined,
        shared_with_email: data.shared_with_email || undefined,
        permission_level: data.permission_level,
      };

      const { data: result, error } = await upsertTraveler(tripId, payload);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success(isEditing ? "Traveler updated" : "Traveler added");
      queryClient.invalidateQueries({ queryKey: ["travelers", tripId] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error saving traveler:", error);
      toast.error("Failed to save traveler");
    },
  });

  const onSubmit = (data: TravelerForm) => {
    if (isOwner) {
      toast.info("Owner details cannot be modified here.");
      onOpenChange(false);
      return;
    }
    upsertMutation.mutate(data);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  // Share email
  const [sending, setSending] = useState(false);
  const canShare = useMemo(() => emailIsValid(watchedEmail) && !isOwner, [watchedEmail, isOwner]);

  const handleShareEmail = async () => {
    if (!canShare) return;
    try {
      setSending(true);

      // Upsert first so names/permission persist
      try {
        await upsertTraveler(tripId, {
          ...(isEditing && (traveler as any)?.id ? { id: (traveler as any).id } : {}),
          first_name: form.getValues("first_name"),
          last_name: form.getValues("last_name") || undefined,
          shared_with_email: watchedEmail.trim(),
          permission_level: form.getValues("permission_level"),
        });
      } catch {
        // ignore uniqueness races
      }

      // Fetch destination for email content
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
        (form.getValues("permission_level") as "read" | "edit") || "edit"
      );

      if (ok) {
        toast.success("Share email sent");
        queryClient.invalidateQueries({ queryKey: ["travelers", tripId] });
      }
    } catch (err) {
      console.error("Error sending share email:", err);
      toast.error("Failed to send share email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
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
            {/* First Name */}
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter first name"
                      disabled={isOwner}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Last Name */}
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter last name (optional)"
                      disabled={isOwner}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email + clearer Share button */}
            <FormField
              control={form.control}
              name="shared_with_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (for sharing)</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="email@example.com (optional)"
                        disabled={isOwner}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleShareEmail}
                      disabled={!canShare || sending}
                      className={cn(
                        "shrink-0 bg-earth-600 text-white hover:bg-earth-700 shadow-sm"
                      )}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Share Trip
                    </Button>
                  </div>
                  {!emailIsValid(watchedEmail) && watchedEmail && (
                    <p className="text-xs text-red-600 mt-1">
                      Please enter a valid email address
                    </p>
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

            {/* Permission (selected = dark background + light text) */}
            <FormField
              control={form.control}
              name="permission_level"
              render={({ field }) => {
                const current = field.value as "read" | "edit";
                const disabled = !hasEmail || isOwner;
                const baseBtn = "h-8 px-3";
                const selected = "bg-earth-600 text-white hover:bg-earth-700";
                const unselected = "border";

                return (
                  <FormItem>
                    <FormLabel>Permission Level</FormLabel>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={disabled}
                        onClick={() => field.onChange("read")}
                        className={cn(baseBtn, current === "read" ? selected : unselected)}
                        variant={current === "read" ? "default" : "outline"}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={disabled}
                        onClick={() => field.onChange("edit")}
                        className={cn(baseBtn, current === "edit" ? selected : unselected)}
                        variant={current === "edit" ? "default" : "outline"}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    {!hasEmail && !isOwner && (
                      <p className="text-xs text-gray-500 mt-1">
                        Add an email address to enable permission settings.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={upsertMutation.isPending || isOwner}
                className="flex-1 bg-earth-600 hover:bg-earth-700 text-white"
              >
                {upsertMutation.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update"
                  : "Add"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
