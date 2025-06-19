
import React from 'react';
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const UserAvatar = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  
  if (!session?.user) return null;

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="cursor-pointer"
      onClick={() => navigate('/profile')}
    >
      <Avatar className="border-2 border-earth-500">
        <AvatarFallback className="bg-sand-50 text-earth-500">
          {getInitials(session.user.email || 'U')}
        </AvatarFallback>
      </Avatar>
    </motion.div>
  );
};

export default UserAvatar;
