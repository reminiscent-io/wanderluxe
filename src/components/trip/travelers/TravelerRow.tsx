import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Share2, Trash2, ShieldCheck } from "lucide-react";
import { deleteTraveler, upsertTraveler } from "@/services/travelers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Traveler } from "@/hooks/useTravelers";
import { cn } from "@/lib/utils";

interface TravelerRowProps {
  traveler: Traveler;
  onEdit: () => void;
  tripId: string;
}

export default function TravelerRow({ traveler, onEdit, tripId }: TravelerRowProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const updatePermissionMutation = useMutation({
    mutationFn: async (newPermission: "edit" | "read") => {
      const { data, error } = await upsertTraveler(tripId, {
        id: traveler.id,
        first_name: traveler.first_name,
        last_name: traveler.last_name,
        shared_with_email: traveler.shared_with_email,
        permission_level: newPermission,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelers', tripId] });
    },
    onError: (error) => {
      console.error('Error updating traveler permission:', error);
      toast.error('Failed to update permission');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await deleteTraveler(traveler.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Traveler deleted');
      queryClient.invalidateQueries({ queryKey: ['travelers', tripId] });
      setIsDeleting(false);
    },
    onError: (error) => {
      console.error('Error deleting traveler:', error);
      toast.error('Failed to delete traveler');
      setIsDeleting(false);
    },
  });

  const getInitials = () => {
    const firstInitial = traveler.first_name.charAt(0).toUpperCase();
    const lastInitial = traveler.last_name?.charAt(0).toUpperCase() || '';
    return firstInitial + lastInitial;
  };

  const getFullName = () => {
    return [traveler.first_name, traveler.last_name].filter(Boolean).join(' ');
  };

  const hasEmail = !!traveler.shared_with_email;

  const handleDelete = () => {
    if (isDeleting) {
      deleteMutation.mutate();
    } else {
      setIsDeleting(true);
      setTimeout(() => setIsDeleting(false), 3000); // Auto-cancel after 3 seconds
    }
  };

  return (
    <div className="p-3 bg-sand-50 rounded-lg hover:bg-sand-100 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-earth-100 text-earth-700">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">{getFullName()}</h4>
              {hasEmail && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Share2 className="h-3 w-3 text-earth-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Invite / Manage access</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            {traveler.shared_with_email && (
              <p className="text-xs text-gray-500">{traveler.shared_with_email}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Permission toggle */}
          <div className="flex items-center space-x-2">
            <Badge variant={hasEmail ? "default" : "secondary"} className="text-xs">
              {traveler.permission_level === "edit" ? "Edit" : "Read"}
            </Badge>
            <Switch
              checked={traveler.permission_level === "edit"}
              onCheckedChange={(checked) => {
                updatePermissionMutation.mutate(checked ? "edit" : "read");
              }}
              disabled={!hasEmail || updatePermissionMutation.isPending}
              className={cn(
                "scale-75",
                !hasEmail && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>

          {/* Edit button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0"
          >
            <ShieldCheck className="h-3 w-3" />
          </Button>

          {/* Delete button */}
          <Button
            variant={isDeleting ? "destructive" : "ghost"}
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {isDeleting && (
        <p className="text-xs text-red-600 mt-2">
          Click delete again to confirm removal
        </p>
      )}
    </div>
  );
}