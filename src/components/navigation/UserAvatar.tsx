
import React from 'react';
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const UserAvatar = () => {
  const { session, avatarUrl, fullName, profileLoaded } = useAuth();
  const navigate = useNavigate();

  if (!session?.user) return null;

  // Show loading skeleton until profile has loaded (avoids flashing Google avatar → initials → photo)
  if (!profileLoaded) {
    return (
      <Skeleton className="h-10 w-10 shrink-0 rounded-full border-2 border-earth-500" />
    );
  }

  // Use only avatarUrl from profile (AuthContext already falls back to OAuth when setting it)
  const displayAvatarUrl = avatarUrl ?? undefined;

  const getInitials = () => {
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return fullName.substring(0, 2).toUpperCase();
    }
    return (session.user.email || 'U').substring(0, 2).toUpperCase();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="cursor-pointer"
      onClick={() => navigate('/profile')}
    >
      <Avatar className="border-2 border-earth-500">
        <AvatarImage src={displayAvatarUrl} alt={fullName || 'Profile'} />
        <AvatarFallback delayMs={400} className="bg-sand-50 text-earth-500">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
    </motion.div>
  );
};

export default UserAvatar;
