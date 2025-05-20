/**
 * Helper function to check if required environment variables are set
 */
export const checkRequiredEnv = (varName: string): boolean => {
  const value = import.meta.env[varName];
  if (!value) {
    console.error(`Required environment variable ${varName} is not set`);
    return false;
  }
  return true;
};

// Check for the SendGrid API key
export const checkSendGridApiKey = (): boolean => {
  return checkRequiredEnv('VITE_SENDGRID_API_KEY');
};
