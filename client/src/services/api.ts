import { toast } from '@/hooks/use-toast';

const BASE_URL = `http://0.0.0.0:${process.env.PORT || 3000}/api`; // Added BASE_URL

const handleApiError = (error: any) => {
  const message = error?.response?.data?.message || 'An error occurred';
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  });
  throw error;
};

export const api = {
  async get(url: string) {
    try {
      const response = await fetch(BASE_URL + url); // Updated to use BASE_URL
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  async post(url: string, data?: any) {
    try {
      const response = await fetch(BASE_URL + url, { // Updated to use BASE_URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    } catch (error) {
      return handleApiError(error);
    }
  }
};