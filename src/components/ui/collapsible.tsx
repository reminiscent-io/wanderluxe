import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOpen = () => {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100); // Small delay to ensure content is rendered
    };

    contentRef.current?.addEventListener('animationstart', handleOpen);
    return () => {
      contentRef.current?.removeEventListener('animationstart', handleOpen);
    };
  }, []);

  return (
    <CollapsiblePrimitive.CollapsibleContent
      ref={ref}
      className={className}
      {...props}
    >
      <div ref={contentRef}>
        {props.children}
      </div>
    </CollapsiblePrimitive.CollapsibleContent>
  );
});

CollapsibleContent.displayName = CollapsiblePrimitive.CollapsibleContent.displayName;

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
