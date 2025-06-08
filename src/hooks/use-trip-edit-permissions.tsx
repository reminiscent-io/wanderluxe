import { useState, useEffect } from 'react';
import { useTripPermissions } from './use-trip-permissions';

/**
 * Hook to determine if the current user can edit a specific trip
 * This includes both ownership and edit permission via sharing
 */
export function useTripEditPermissions(tripId: string | undefined) {
  const { canEdit, isLoading } = useTripPermissions(tripId);
  
  return {
    canEdit,
    isLoading,
    isReadOnly: !canEdit && !isLoading
  };
}

/**
 * Hook to provide user-friendly error handling for permission-denied operations
 */
export function usePermissionHandler() {
  const handlePermissionError = (error: any) => {
    if (error?.message?.includes('permission') || error?.message?.includes('policy') || error?.code === 'PGRST301') {
      return {
        isPermissionError: true,
        message: 'You only have view access to this trip. Contact the trip owner to request edit permissions.'
      };
    }
    return {
      isPermissionError: false,
      message: error?.message || 'An unexpected error occurred'
    };
  };

  return { handlePermissionError };
}