import { cn } from "@/lib/cn";

type Variant = "error" | "success" | "info";

const variantClasses: Record<Variant, string> = {
  error: "border-danger/30 bg-danger-soft text-danger",
  success: "border-accent/30 bg-accent-soft text-accent",
  info: "border-brand/30 bg-brand-soft text-ink",
};

export function Banner({ variant = "info", children }: { variant?: Variant; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2 text-sm", variantClasses[variant])} role="status">
      {children}
    </div>
  );
}
