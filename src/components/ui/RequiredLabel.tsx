
import React from 'react';
import { Label } from "@/components/ui/label";

interface RequiredLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}

const RequiredLabel: React.FC<RequiredLabelProps> = ({ 
  htmlFor, 
  children, 
  required = true 
}) => {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1">
      {children}
      {required && <span className="text-red-500">*</span>}
    </Label>
  );
};

export default RequiredLabel;
