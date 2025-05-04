import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader, Plus, Trash2, Share2 } from "lucide-react";
import { Tables } from '@/integrations/supabase/types';
import { shareTrip } from '@/services/tripSharingService';

type TripShare = Tables<'trip_shares'>;

interface ShareTripDialogProps {
  tripId: string;
  tripDestination: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareTripDialog: React.FC<ShareTripDialogProps> = ({
  tripId,
  tripDestination,
  open,
  onOpenChange
}) => {
  const [emails, setEmails] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingShares, setExistingShares] = useState<TripShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  React.useEffect(() => {
    if (open) {
      fetchExistingShares();
    }
  }, [open, tripId]);

  const fetchExistingShares = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('trip_shares')
        .select('*')
        .eq('trip_id', tripId);

      if (error) throw error;
      setExistingShares(data || []);
    } catch (error) {
      console.error('Error fetching existing shares:', error);
      toast.error('Failed to load shared users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmail = () => {
    setEmails([...emails, '']);
  };

  const handleRemoveEmail = (index: number) => {
    const newEmails = [...emails];
    newEmails.splice(index, 1);
    if (newEmails.length === 0) {
      setEmails(['']);
    } else {
      setEmails(newEmails);
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('trip_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      
      setExistingShares(existingShares.filter(share => share.id !== shareId));
      toast.success('User removed from trip sharing');
    } catch (error) {
      console.error('Error removing share:', error);
      toast.error('Failed to remove user from sharing');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Filter out empty emails
      const validEmails = emails.filter(email => email.trim() !== '');
      
      if (validEmails.length === 0) {
        toast.error('Please enter at least one valid email address');
        setIsSubmitting(false);
        return;
      }

      // Validate email format
      const invalidEmails = validEmails.filter(email => !isValidEmail(email));
      if (invalidEmails.length > 0) {
        toast.error(`Invalid email format: ${invalidEmails.join(', ')}`);
        setIsSubmitting(false);
        return;
      }

      // Share trip with each email
      for (const email of validEmails) {
        await shareTrip(tripId, email.trim(), tripDestination);
      }

      toast.success('Trip shared successfully!');
      setEmails(['']);
      fetchExistingShares();
    } catch (error) {
      console.error('Error sharing trip:', error);
      toast.error('Failed to share trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
          <DialogDescription>
            Share your trip with friends or family by email
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveEmail(index)}
                    disabled={emails.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleAddEmail}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Another Email
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {existingShares.length > 0 && (
                  <div className="space-y-2 mt-6">
                    <Label>Currently Shared With</Label>
                    <div className="border rounded-md overflow-hidden">
                      {existingShares.map((share) => (
                        <div key={share.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                          <span className="truncate">{share.shared_with_email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveShare(share.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Trip
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTripDialog;