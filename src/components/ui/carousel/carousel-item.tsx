
import * as React from "react"
import { cn } from "@/lib/utils"
import { useCarousel } from "./context"

export const CarouselItem = React.forwardRef<
  HTMLFieldSetElement,
  React.HTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <fieldset
      ref={ref}
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"
