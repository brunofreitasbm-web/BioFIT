import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldWrapProps {
  label?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FieldWrap({ label, hint, className, children }: FieldWrapProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && <label className="text-xs font-medium text-ink-muted">{label}</label>}
      {children}
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </div>
  );
}

const fieldBase =
  "rounded-lg border border-line bg-base-900 px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-brand";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, hint, className, ...props }, ref) => {
  const input = <input ref={ref} className={cn(fieldBase, className)} {...props} />;
  if (!label && !hint) return input;
  return (
    <FieldWrap label={label} hint={hint}>
      {input}
    </FieldWrap>
  );
});
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, hint, className, ...props }, ref) => {
  const select = <select ref={ref} className={cn(fieldBase, className)} {...props} />;
  if (!label && !hint) return select;
  return (
    <FieldWrap label={label} hint={hint}>
      {select}
    </FieldWrap>
  );
});
Select.displayName = "Select";
