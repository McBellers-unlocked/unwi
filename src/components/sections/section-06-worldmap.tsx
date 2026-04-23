"use client";
import dynamic from "next/dynamic";

// react-simple-maps fetches the TopoJSON client-side, which produces a
// hydration mismatch if rendered during SSR (the server paints an empty
// <svg>, the client then paints the resolved paths). Loading the inner
// implementation dynamically with ssr:false removes the mismatch.
export const WorldMap = dynamic(
  () => import("./section-06-worldmap-inner").then((m) => m.WorldMap),
  { ssr: false, loading: () => <WorldMapFallback /> },
);

function WorldMapFallback() {
  return (
    <div
      style={{ aspectRatio: "1200 / 560" }}
      className="w-full bg-surface/30"
      aria-hidden
    />
  );
}
