
import React from 'react';
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const UserAvatar = () => {
  const { session, avatarUrl, fullName } = useAuth();
  const navigate = useNavigate();

  if (!session?.user) return null;

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
        <AvatarImage src={avatarUrl || undefined} alt={fullName || 'Profile'} />
        <AvatarFallback className="bg-sand-50 text-earth-500">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
    </motion.div>
  );
};

export default UserAvatar;
