
import React from 'react';
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
    <Avatar 
      className="cursor-pointer" 
      onClick={() => navigate('/profile')}
    >
      <AvatarFallback>
        {getInitials(session.user.email || 'U')}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
