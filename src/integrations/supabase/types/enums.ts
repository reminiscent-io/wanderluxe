import { Database } from './database';

export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];