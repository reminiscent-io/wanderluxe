/**
 * Helper function to check if required environment variables are set
 */
export const checkRequiredEnv = (varName: string): boolean => {
  const envVar = import.meta.env[varName];
  return typeof envVar === 'string' && envVar.trim() !== '';
};