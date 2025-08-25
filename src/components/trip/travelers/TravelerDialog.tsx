import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { travelerSchema, TravelerForm } from "./schemas";
import { upsertTraveler } from "@/services/travelers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Traveler } from "@/hooks/useTravelers";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface TravelerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  traveler?: Traveler | null;
}

export default function TravelerDialog({
  open,
  onOpenChange,
  tripId,
  traveler,
}: TravelerDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!traveler;

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
        ...(isEditing && { id: traveler.id }),
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
      toast.success(isEditing ? 'Traveler updated' : 'Traveler added');
      queryClient.invalidateQueries({ queryKey: ['travelers', tripId] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error('Error saving traveler:', error);
      toast.error('Failed to save traveler');
    },
  });

  const onSubmit = (data: TravelerForm) => {
    upsertMutation.mutate(data);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Traveler' : 'Add Traveler'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter first name" />
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
                    <Input {...field} placeholder="Enter last name (optional)" />
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
                      placeholder="Enter email to share access (optional)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permission_level"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Permission Level</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Label
                        htmlFor="permission-toggle"
                        className={cn(
                          "text-sm",
                          !hasEmail && "text-gray-400"
                        )}
                      >
                        {field.value === "edit" ? "Edit" : "Read"}
                      </Label>
                      <Switch
                        id="permission-toggle"
                        checked={field.value === "edit"}
                        onCheckedChange={(checked) => {
                          field.onChange(checked ? "edit" : "read");
                        }}
                        disabled={!hasEmail}
                        className={cn(!hasEmail && "opacity-50")}
                      />
                    </div>
                  </div>
                  {!hasEmail && (
                    <p className="text-xs text-gray-500">
                      Add an email address to enable permission settings
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
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
                disabled={upsertMutation.isPending}
                className="flex-1 bg-earth-600 hover:bg-earth-700 text-white"
              >
                {upsertMutation.isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Update'
                  : 'Add'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}