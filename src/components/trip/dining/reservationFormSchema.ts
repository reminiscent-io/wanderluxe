import * as z from "zod";
import { toMinutesOfDay } from "@/utils/timeUtils";

const toNullableNumber = (val: unknown) => {
  if (val === '' || val === null || typeof val === 'undefined') return undefined;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

/**
 * Optional fields are `.nullable()` because a saved reservation comes straight
 * from Postgres, where anything the user left blank is NULL.
 */
export const reservationFormSchema = z.object({
  restaurant_name: z.string().min(1, "Restaurant name is required"),
  reservation_date: z.string().min(1, "Reservation date is required"),
  reservation_time: z.string().min(1, "Reservation time is required"),
  end_time: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  number_of_people: z.preprocess(toNullableNumber, z.number().int().positive().optional().nullable()),
  notes: z.string().optional().nullable(),
  cost: z.preprocess(toNullableNumber, z.number().optional()),
  currency: z.string().optional().nullable(),
  place_id: z.string().optional().nullable(),
  rating: z.preprocess(toNullableNumber, z.number().optional()),
  travelers: z.array(z.string()).optional(),
  timezone: z.string().optional().nullable(),
}).superRefine((values, ctx) => {
  // A reservation is pinned to one day and carries no end date, so an end at or
  // before the start has nowhere to live: it would render backwards on the
  // calendar and emit DTEND < DTSTART in the iCal feed. Reject it here rather
  // than letting every downstream reader defend against it.
  const start = toMinutesOfDay(values.reservation_time);
  const end = toMinutesOfDay(values.end_time);
  if (start === null || end === null) return;
  if (end > start) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['end_time'],
    message: 'End time must be after the start time',
  });
});

export type ReservationFormValues = z.infer<typeof reservationFormSchema>;
