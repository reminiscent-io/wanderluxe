import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group print:hidden"
      // Sonner's default 16px puts a phone toast on the home indicator and,
      // on a trip page, over the tab bar. Lift it clear of both.
      mobileOffset={{
        bottom: "calc(1rem + var(--app-bottom-clear, 0px) + env(safe-area-inset-bottom, 0px))",
        top: "calc(1rem + env(safe-area-inset-top, 0px))",
      }}
      offset={{
        bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
        top: "calc(1.5rem + env(safe-area-inset-top, 0px))",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-warm-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
