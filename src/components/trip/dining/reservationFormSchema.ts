import * as z from "zod";

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
});

export type ReservationFormValues = z.infer<typeof reservationFormSchema>;
