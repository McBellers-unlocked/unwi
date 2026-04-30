import { getSinceAugAggregates, SEGMENT_LABELS, type SegmentCode } from "@/lib/data";

const TOP_N = 10;

export async function SinceAugTopLists() {
  const a = await getSinceAugAggregates();
  if (!a) return null;

  const topOrgs = [...a.organisations]
    .sort((x, y) => y.digital_postings - x.digital_postings)
    .slice(0, TOP_N);
  const topStations = [...a.geography]
    .sort((x, y) => y.count - x.count)
    .slice(0, TOP_N);

  if (topOrgs.length === 0 && topStations.length === 0) return null;

  const maxOrgPostings = Math.max(1, ...topOrgs.map((o) => o.digital_postings));
  const maxStationCount = Math.max(1, ...topStations.map((s) => s.count));

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          Where the hiring concentrates
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Top organisations and duty stations.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Across the full Aug 2025 → today window, ranked by classified
          digital postings.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Top {topOrgs.length} organisations
            </p>
            <ul className="mt-4 flex flex-col">
              {topOrgs.map((o) => {
                const pct = (o.digital_postings / maxOrgPostings) * 100;
                const segLabel = o.top_segment_1
                  ? SEGMENT_LABELS[o.top_segment_1 as SegmentCode] ?? o.top_segment_1
                  : null;
                return (
                  <li
                    key={o.organisation}
                    className="grid grid-cols-[1fr_auto] gap-4 items-baseline py-3 border-t border-rule"
                  >
                    <div>
                      <p className="text-[14px] font-medium text-ink-primary leading-tight">
                        {o.organisation}
                      </p>
                      {segLabel && (
                        <p className="mt-1 text-[12px] text-ink-muted">
                          Top: {segLabel}
                        </p>
                      )}
                      <div className="mt-2 h-[3px] bg-canvas">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: "#0A3C5A",
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="numeric text-[15px] font-semibold text-ink-primary">
                        {o.digital_postings}
                      </p>
                      <p className="numeric text-[11px] text-ink-muted">
                        of {o.total_postings}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Top {topStations.length} duty stations
            </p>
            <ul className="mt-4 flex flex-col">
              {topStations.map((s) => {
                const pct = (s.count / maxStationCount) * 100;
                const segLabel = s.top_segment
                  ? SEGMENT_LABELS[s.top_segment as SegmentCode] ?? s.top_segment
                  : null;
                return (
                  <li
                    key={s.location_or_country}
                    className="grid grid-cols-[1fr_auto] gap-4 items-baseline py-3 border-t border-rule"
                  >
                    <div>
                      <p className="text-[14px] font-medium text-ink-primary leading-tight">
                        {s.location_or_country}
                      </p>
                      {segLabel && (
                        <p className="mt-1 text-[12px] text-ink-muted">
                          Top: {segLabel}
                          {s.organisation_count > 0
                            ? ` · ${s.organisation_count} org${s.organisation_count === 1 ? "" : "s"}`
                            : ""}
                        </p>
                      )}
                      <div className="mt-2 h-[3px] bg-canvas">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: "#00A0B0",
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="numeric text-[15px] font-semibold text-ink-primary">
                        {s.count}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
