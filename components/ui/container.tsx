import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "narrow" | "wide";
}

/**
 * Container component that provides consistent layout styling across the application
 *
 * Uses the standard pattern: "container mx-auto px-5 py-6 max-w-7xl"
 *
 * @param variant - Layout variant:
 *   - "default": max-w-7xl (default)
 *   - "narrow": max-w-4xl (for content-heavy pages)
 *   - "wide": no max-width constraint
 */
export function Container({
  children,
  variant = "default",
  className,
  ...props
}: ContainerProps) {
  const variantStyles = {
    default: "max-w-7xl",
    narrow: "max-w-4xl",
    wide: "max-w-none",
  };

  return (
    <div
      className={cn(
        "container mx-auto px-4 py-6",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
