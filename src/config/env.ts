import { z } from 'zod';

/**
 * Environment Variable Validation for WanderLuxe
 *
 * This module validates all required environment variables at application startup.
 * For Replit deployments, ensure all variables are set in the "Secrets" tab.
 *
 * Required Secrets in Replit:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 * - VITE_GOOGLE_MAPS_API_KEY
 */

const envSchema = z.object({
  // === REQUIRED VARIABLES ===

  // Supabase Configuration (CRITICAL)
  VITE_SUPABASE_URL: z
    .string()
    .min(1, 'VITE_SUPABASE_URL is required')
    .url('VITE_SUPABASE_URL must be a valid URL')
    .refine(
      (url) => url.includes('supabase.co'),
      'VITE_SUPABASE_URL must be a Supabase URL (should contain "supabase.co")'
    ),

  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'VITE_SUPABASE_ANON_KEY is required')
    .min(40, 'VITE_SUPABASE_ANON_KEY appears to be invalid (too short)'),

  // Google Maps API (CRITICAL for location features)
  VITE_GOOGLE_MAPS_API_KEY: z
    .string()
    .min(1, 'VITE_GOOGLE_MAPS_API_KEY is required for location search features')
    .optional(), // Making it optional initially to not break existing deploys

  // === OPTIONAL VARIABLES ===

  // Unsplash API for trip imagery (optional - will use placeholders if missing)
  VITE_UNSPLASH_ACCESS_KEY: z.string().optional(),

  // Travel document parsing endpoint (optional feature)
  VITE_PARSE_TRAVEL_DOC_URL: z.string().url().optional().or(z.literal('')),

  // Admin email for special permissions (has fallback)
  VITE_ADMIN_EMAIL: z.string().email().optional(),

  // Photo cache TTL in milliseconds (has defaults)
  VITE_PLACE_PHOTO_CACHE_TTL_MS: z
    .string()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().positive().optional())
    .optional(),

  // Environment mode (automatically set by Vite)
  MODE: z.enum(['development', 'production', 'test']).optional(),
  DEV: z.boolean().optional(),
  PROD: z.boolean().optional(),
});

type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed env object
 * @throws {Error} If validation fails with detailed error message
 */
function validateEnv(): Env {
  const env = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    VITE_UNSPLASH_ACCESS_KEY: import.meta.env.VITE_UNSPLASH_ACCESS_KEY,
    VITE_PARSE_TRAVEL_DOC_URL: import.meta.env.VITE_PARSE_TRAVEL_DOC_URL,
    VITE_ADMIN_EMAIL: import.meta.env.VITE_ADMIN_EMAIL,
    VITE_PLACE_PHOTO_CACHE_TTL_MS: import.meta.env.VITE_PLACE_PHOTO_CACHE_TTL_MS,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      const errorMessage = `
╔════════════════════════════════════════════════════════════════╗
║                 ENVIRONMENT VARIABLES MISSING                  ║
╚════════════════════════════════════════════════════════════════╝

WanderLuxe requires the following environment variables to be set:

${missingVars}

${getInstructionsForPlatform()}

After setting the variables, please restart the application.
`;

      console.error(errorMessage);
      throw new Error('Environment validation failed. See console for details.');
    }
    throw error;
  }
}

/**
 * Returns platform-specific instructions for setting environment variables
 */
function getInstructionsForPlatform(): string {
  // Check if running on Replit
  if (typeof process !== 'undefined' && process.env.REPL_ID) {
    return `
📍 REPLIT DEPLOYMENT DETECTED

To fix this issue:
1. Click on the "Tools" button in the left sidebar
2. Select "Secrets"
3. Add each missing variable with its value
4. Click "Add Secret" for each one
5. Restart the Repl

Required Secrets:
  • VITE_SUPABASE_URL - Your Supabase project URL
  • VITE_SUPABASE_ANON_KEY - Your Supabase anonymous key
  • VITE_GOOGLE_MAPS_API_KEY - Your Google Maps API key

⚠️  DO NOT commit these values to .env file!
`;
  }

  // Default instructions for local development
  return `
📍 LOCAL DEVELOPMENT

To fix this issue:
1. Copy .env.example to .env
2. Fill in the required values in .env
3. Restart the development server

Example:
  cp .env.example .env
  # Edit .env with your values
  bun run dev
`;
}

// Validate environment variables immediately on module import
export const env = validateEnv();

// Export individual variables for convenience
export const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  VITE_GOOGLE_MAPS_API_KEY,
  VITE_UNSPLASH_ACCESS_KEY,
  VITE_PARSE_TRAVEL_DOC_URL,
  VITE_ADMIN_EMAIL,
  VITE_PLACE_PHOTO_CACHE_TTL_MS,
} = env;
