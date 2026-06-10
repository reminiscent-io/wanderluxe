// src/services/pdf/types.ts
import type { PdfPageSize } from './theme';

export type Item = {
  type: 'accommodation' | 'transportation' | 'activity' | 'dining';
  title: string;
  time: string; // may be "08:00 AM – 11:45 AM"
  details?: string;
  location?: string;
  cost?: string;
  thumb?: string; // dataURL after conversion (not remote URL)
  sortKey: number; // minutes from midnight (start time) for sorting
};

export type Day = {
  date: string;
  title?: string;
  description?: string;
  items: Item[];
  activityCount?: number;
  hasTransport?: boolean;
};

export type AccommodationSummary = {
  hotel: string;
  checkIn: string;
  checkOut: string;
  address?: string;
  phone?: string;
  website?: string;
  checkInDate: string;
  checkOutDate: string;
};

export type TransportSegment = {
  from: string;
  to: string;
  date: string;
  type: string;
  confirmationNumber?: string;
};

export type DiningRef = { restaurant: string; confirmationNumber?: string };

export type BudgetData = {
  budget: number | null;
  categories: { category: string; amount: number }[];
  total: number;
};

/** User-facing export options (dialog state). */
export interface PdfExportOptions {
  showImages: boolean;
  showCosts: boolean;
  /** Paper size ('LETTER' for en-US locales, 'A4' otherwise — see defaultPageSize). */
  pageSize?: PdfPageSize;
}

/** Options with all defaults applied — what the pure builder consumes. */
export interface ResolvedPdfOptions {
  showImages: boolean;
  showCosts: boolean;
  pageSize: PdfPageSize;
  exportedAt: Date;
}

/** Everything the pure builder needs. No Supabase rows, no remote URLs. */
export interface PdfTripData {
  destination: string;
  dateRange: string;
  /** '' when no cover available or fetch failed. */
  coverImageDataUri: string;
  /** True when the user wanted images and the trip has a cover URL (drives the placeholder band). */
  coverImageRequested: boolean;
  days: Day[];
  stays: AccommodationSummary[];
  transports: TransportSegment[];
  diningRefs: DiningRef[];
  budgetData: BudgetData;
}
