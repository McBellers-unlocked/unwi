import { getCutManifest, getSnapshotMeta } from "@/lib/data";
import { getPeriodCopy, type WindowKey } from "@/lib/window";

export async function Section09Methodology({
  window = "q1",
}: {
  window?: WindowKey;
} = {}) {
  const [meta, manifest] = await Promise.all([
    getSnapshotMeta(),
    getCutManifest(),
  ]);
  const copy = getPeriodCopy(window);

  const sha = (meta?.classifierVersionSha ?? "").slice(0, 7) || "7f702e1";
  const commonSources = manifest?.apples_to_apples?.common_sources ?? [];
  const sourcesForDisplay: string[] =
    commonSources.length > 0
      ? commonSources
      : [
          "un-careers",
          "unicef:pageup",
          "wfp:workday",
          "unops:marketplace",
          "WHO",
          "WIPO",
          "fao.org",
          "careers.icao.int",
          "oracle-hcm:CX_1001",
          "wayback-unicef",
          "wayback-unops",
        ];

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          09
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Methodology
        </h2>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-12">
          <dl className="space-y-5">
            <Item
              term="Classifier"
              description={`v2 (SHA ${sha}), 0.997 precision on 2,676-row gold sample`}
            />
            <Item term="Taxonomy" description="9 segments, locked" />
            <Item
              term="Scope"
              description="UN Common System whitelist, 63 entity buckets"
            />
            <Item term="Period" description={copy.methodPeriod} />
          </dl>
          <dl className="space-y-5">
            <Item term="Rows classified" description="878 / 15,423" />
            <Item term="Scope filter" description="12,958 in / 2,465 out" />
            <Item
              term="Apples-to-apples sources"
              description={String(sourcesForDisplay.length)}
            />
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                Sources
              </dt>
              <dd className="mt-1">
                <ul className="text-[14px] text-ink-primary leading-snug space-y-[2px]">
                  {sourcesForDisplay.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[13px] text-ink-muted">
                  Plus <span className="font-medium">unicc:uniqtalent</span>
                  {" "}&mdash; Q1 2026 only, excluded from QoQ to preserve
                  apples-to-apples integrity.
                </p>
              </dd>
            </div>
          </dl>
        </div>

        <p className="mt-12 font-serif italic text-[13px] text-ink-muted">
          UNICC data integrated via direct UNICConnect feed. Excluded from QoQ
          comparison (Section&nbsp;03) to preserve apples-to-apples integrity
          with comparator sources.
        </p>
        <p className="mt-4 text-[13px] text-ink-body leading-snug">
          Maintained by UNICC&rsquo;s Workforce Intelligence function. The
          methodology and source list are open by design &mdash; the value
          of this dataset goes up the more UN-system and IO partners use it.
          {/* TODO: replace with a real contact handle when supplied */}
          To request access for your organisation, get in touch with the
          UNICC team.
        </p>
      </div>
    </section>
  );
}

function Item({ term, description }: { term: string; description: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        {term}
      </dt>
      <dd className="mt-1 text-[15px] text-ink-primary leading-snug">
        {description}
      </dd>
    </div>
  );
}
