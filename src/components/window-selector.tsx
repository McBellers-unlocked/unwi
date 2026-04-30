"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { WINDOW_KEYS, WINDOW_LABELS, type WindowKey } from "@/lib/window";
import { cn } from "@/lib/utils";

interface WindowSelectorProps {
  current: WindowKey;
  /** Caption text under the tab strip (e.g. window date range, snapshot count). */
  caption?: string;
}

export function WindowSelector({ current, caption }: WindowSelectorProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setWindow(next: WindowKey) {
    if (next === current) return;
    const sp = new URLSearchParams(params.toString());
    sp.set("window", next);
    startTransition(() => {
      router.replace(`?${sp.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex items-end gap-8 border-b border-rule",
          pending && "opacity-60 transition-opacity",
        )}
        role="tablist"
        aria-label="Time window"
      >
        {WINDOW_KEYS.map((w) => {
          const active = w === current;
          return (
            <button
              key={w}
              type="button"
              role="tab"
              onClick={() => setWindow(w)}
              aria-selected={active}
              className={cn(
                "relative -mb-px pb-3 text-[15px] font-medium transition-colors border-b-2",
                active
                  ? "border-highlight text-ink-primary"
                  : "border-transparent text-ink-muted hover:text-ink-primary",
              )}
            >
              {WINDOW_LABELS[w]}
            </button>
          );
        })}
      </div>
      {caption && (
        <p className="text-[11px] text-ink-muted leading-snug">{caption}</p>
      )}
    </div>
  );
}
