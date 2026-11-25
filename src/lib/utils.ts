import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/*
 * tailwind-merge only knows Tailwind's stock font sizes. Without this it reads
 * the custom `text-ui-*` ramp (tailwind.config.ts) as text *colours*, so
 * cn('text-ui-md', 'text-foreground') silently dropped the size and the
 * element fell back to whatever it inherited. Keep the list in step with
 * `fontSize` in the Tailwind config.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["ui-xs", "ui-sm", "ui-base", "ui-md", "ui-lg", "ui-day"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
