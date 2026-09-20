import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

// Variants ported 1:1 from the Lovable design's Button (signal / ink / quiet /
// glass), plus `destructive` for the account-deletion flow.
const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed";

const VARIANTS = {
  signal: "rounded-full bg-signal text-signal-foreground shadow-soft hover:bg-signal/90 active:scale-[0.98]",
  ink: "rounded-full bg-foreground text-background shadow-soft hover:bg-foreground/90",
  quiet: "rounded-full bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
  glass: "rounded-full border border-border bg-card/90 text-foreground shadow-soft hover:bg-card",
  destructive: "rounded-full bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
} as const;

const SIZES = {
  default: "h-9 px-4 py-2",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-8",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

export function buttonClass({
  variant = "ink",
  size = "default",
  className = "",
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim();
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
