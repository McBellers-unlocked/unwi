"use client";
import { useEffect, useRef } from "react";

export function ScrollProgress() {
  const fillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) {
        if (fillRef.current) fillRef.current.style.width = "0%";
        return;
      }
      const pct = Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100));
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden>
      <div ref={fillRef} className="scroll-progress__fill" />
    </div>
  );
}
