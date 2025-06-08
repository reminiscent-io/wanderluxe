import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, PlusCircle, X, Mail, AlertCircle, Eye, Edit } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { shareTrip, getTripShares, removeTripShare, updateTripSharePermission } from '@/services/tripSharingService';
import { supabase } from '@/integrations/supabase/client';
// We're now using Supabase Edge Functions for email
import { TripShare, PermissionLevel } from '@/integrations/supabase/trip_shares_types';

interface ShareTripDialogProps {
  tripId: string;
  tripDestination: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ShareTripDialog = ({ tripId, tripDestination, open, onOpenChange }: ShareTripDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Use controlled state if provided by parent
  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;
  const [emails, setEmails] = useState<string[]>(['']);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingShares, setExistingShares] = useState<TripShare[]>([]);
  const [currentUser, setCurrentUser] = useState<{fullName: string | null, email: string | null}>({
    fullName: null,
    email: null
  });

  useEffect(() => {
    // Fetch current user info
    const getUserInfo = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.user.id)
          .single();
          
        setCurrentUser({
          fullName: profileData?.full_name || null,
          email: data.user.email || null
        });
      }
    };
    
    getUserInfo();
  }, []);

  // Load existing shares when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      fetchExistingShares();
    }
  }, [dialogOpen]);

  const fetchExistingShares = async () => {
    setIsLoading(true);
    try {
      const shares = await getTripShares(tripId);
      setExistingShares(shares);
    } catch (error) {
      console.error('Error fetching existing shares:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const addEmailField = () => {
    setEmails([...emails, '']);
  };

  const removeEmailField = (index: number) => {
    if (emails.length === 1) {
      setEmails(['']);
    } else {
      const newEmails = [...emails];
      newEmails.splice(index, 1);
      setEmails(newEmails);
    }
  };

  const validateEmails = () => {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nonEmptyEmails = emails.filter(email => email.trim() !== '');
    
    if (nonEmptyEmails.length === 0) {
      toast.error('Please enter at least one email address');
      return false;
    }

    for (const email of nonEmptyEmails) {
      if (!emailRegex.test(email)) {
        toast.error(`Invalid email format: ${email}`);
        return false;
      }
    }

    return nonEmptyEmails;
  };

  const handleSave = async () => {
    const validEmails = validateEmails();
    if (!validEmails) return;

    setIsSubmitting(true);
    
    try {
      let successCount = 0;
      
      for (const email of validEmails) {
        const success = await shareTrip(tripId, email, tripDestination, permissionLevel);
        if (success) {
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Trip shared with ${successCount} ${successCount === 1 ? 'person' : 'people'}`);
        // Reset form
        setEmails(['']);
        // Refresh the list of shares
        fetchExistingShares();
      }
    } catch (error) {
      console.error('Error sharing trip:', error);
      toast.error('Failed to share the trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const success = await removeTripShare(shareId);
      if (success) {
        fetchExistingShares();
      }
    } catch (error) {
      console.error('Error removing share:', error);
    }
  };

  const handleUpdatePermission = async (shareId: string, currentPermission: PermissionLevel) => {
    try {
      const newPermission: PermissionLevel = currentPermission === 'read' ? 'edit' : 'read';
      const success = await updateTripSharePermission(shareId, newPermission);
      if (success) {
        fetchExistingShares();
      }
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Share Trip</DialogTitle>
          <DialogDescription>
            Enter email addresses of people you'd like to share this trip with.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          <div className="space-y-2">
            <p className="text-sm font-medium">Email addresses</p>
            
            {emails.map((email, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEmailField(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
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

          <div className="space-y-3 border-t pt-4 mt-4">
            <p className="text-sm font-medium">Permission Level</p>
            <RadioGroup 
              value={permissionLevel} 
              onValueChange={(value) => setPermissionLevel(value as PermissionLevel)}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                <RadioGroupItem value="read" id="read" />
                <Label htmlFor="read" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">View Only</div>
                    <div className="text-xs text-muted-foreground">Can view trip details but cannot edit</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                <RadioGroupItem value="edit" id="edit" />
                <Label htmlFor="edit" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Edit className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">Full Access</div>
                    <div className="text-xs text-muted-foreground">Can view and edit all trip details</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {existingShares.length > 0 && (
            <div className="space-y-2 border-t pt-4 mt-6">
              <p className="text-sm font-medium">Currently shared with</p>
              
              <div className="space-y-2">
                {existingShares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{share.shared_with_email}</span>
                      <div className="flex items-center gap-1 ml-auto mr-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdatePermission(share.id, share.permission_level)}
                          className="h-auto p-1"
                        >
                          {share.permission_level === 'read' ? (
                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs hover:bg-blue-100 transition-colors">
                              <Eye className="h-3 w-3" />
                              View Only
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs hover:bg-green-100 transition-colors">
                              <Edit className="h-3 w-3" />
                              Full Access
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveShare(share.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Trip owner:</p>
              <div className="flex items-center gap-2 rounded-md border p-2">
                <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                  {/* Display user initials */}
                  {currentUser.fullName 
                    ? currentUser.fullName.split(' ').map(name => name[0]).join('').toUpperCase().substring(0, 2)
                    : currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
                <span className="text-sm">{currentUser.fullName || currentUser.email || 'You'}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between flex-shrink-0 border-t pt-4 mt-4">
          <Button
            variant="secondary"
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSubmitting || isLoading}
          >
            Share Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTripDialog;