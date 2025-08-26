// /src/components/trip/travelers/schemas.ts
import { z } from "zod";

export const travelerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  shared_with_email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  permission_level: z.enum(["edit", "read"]).default("read"),
});
export type TravelerForm = z.infer<typeof travelerSchema>;
