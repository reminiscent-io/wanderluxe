
import React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Profile = () => {
  const { session } = useAuth();

  if (!session?.user) return null;

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col min-h-screen bg-sand-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="flex flex-col items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-2xl">
              {getInitials(session.user.email || 'U')}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">{session.user.email}</h1>
        </div>
      </div>
    </div>
  );
};

export default Profile;
