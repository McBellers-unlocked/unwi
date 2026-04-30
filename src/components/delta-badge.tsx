import { cn } from "@/lib/utils";

interface DeltaBadgeProps {
  value: number;
  /** Render with explicit "+" / "−" prefix and tabular nums. */
  className?: string;
  /** When the metric is "lower is better", invert the colour. */
  invertColour?: boolean;
  /** Optional unit suffix, e.g. "pp" for percentage points. */
  suffix?: string;
}

export function DeltaBadge({ value, className, invertColour, suffix }: DeltaBadgeProps) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) {
    return (
      <span
        className={cn(
          "numeric inline-flex items-baseline text-[12px] font-medium text-ink-muted",
          className,
        )}
      >
        no change
      </span>
    );
  }
  const positive = rounded > 0;
  const goodColour = positive !== !!invertColour ? "text-highlight" : "text-claret";
  const arrow = positive ? "▲" : "▼";
  const display = `${positive ? "+" : "−"}${Math.abs(rounded)}${suffix ?? ""}`;
  return (
    <span
      className={cn(
        "numeric inline-flex items-baseline gap-[3px] text-[12px] font-semibold",
        goodColour,
        className,
      )}
    >
      <span className="text-[10px] leading-none">{arrow}</span>
      <span>{display}</span>
    </span>
  );
}
