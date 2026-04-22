import { SectionShell } from "@/components/section-shell";
import { getCutManifest } from "@/lib/data";

export async function Section09Methodology() {
  const manifest = await getCutManifest();
  const sources = manifest?.apples_to_apples?.common_sources ?? [];
  // classifier_version_sha was the schema-declared field; the current Lambda
  // writes classifier_version.file_sha1 instead. Accept either until the
  // writer catches up to the typed shape.
  const m = manifest as unknown as {
    classifier_version_sha?: string;
    classifier_version?: { file_sha1?: string };
  };
  const sha =
    m?.classifier_version_sha ??
    m?.classifier_version?.file_sha1 ??
    "unknown";
  const shaShort = sha.slice(0, 12);

  return (
    <SectionShell
      id="section-9"
      number={9}
      title="Methodology &amp; Coverage"
      subtitle="How the numbers are computed. Reproducible from the same classifier + inputs."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <h3 className="font-serif text-navy text-lg mb-2">Data sources</h3>
          <p className="text-sm text-muted mb-3">
            {sources.length} sources common to both primary and comparator
            periods (apples-to-apples):
          </p>
          <ul className="text-xs text-navy space-y-1 font-mono">
            {sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
            {sources.length === 0 && <li className="text-muted">—</li>}
          </ul>
        </div>
        <div>
          <h3 className="font-serif text-navy text-lg mb-2">Classifier</h3>
          <p className="text-sm text-muted mb-3">
            Locked regex-based taxonomy, 9 segments. Deterministic —
            classification is identical run-to-run.
          </p>
          <p className="text-xs text-muted">Version SHA</p>
          <p className="text-sm font-mono text-navy">{shaShort}</p>
          <p className="text-xs text-muted mt-3">
            Overall precision 0.997 on a 2,676-row hand-labelled gold sample.
          </p>
        </div>
        <div>
          <h3 className="font-serif text-navy text-lg mb-2">Period</h3>
          <p className="text-xs text-muted">Primary</p>
          <p className="text-sm text-navy">
            {manifest?.period_from} → {manifest?.period_to}
          </p>
          <p className="text-xs text-muted mt-3">Comparator</p>
          <p className="text-sm text-navy">
            {manifest?.comparator_from} → {manifest?.comparator_to}
          </p>
          <p className="text-xs text-muted mt-3">Anchor date</p>
          <p className="text-sm text-navy">2025-08-01</p>
        </div>
        <div>
          <h3 className="font-serif text-navy text-lg mb-2">Limitations</h3>
          <ul className="text-sm text-muted space-y-2">
            <li>
              UNDP is backfilled for Q1 from cached sources (not in the
              apples-to-apples set).
            </li>
            <li>
              Consultant vs staff split approximated from title + level fields;
              some mislabels possible.
            </li>
            <li>
              Non-digital workforce taxonomy in development (see Section 10).
            </li>
            {(manifest?.warnings ?? []).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
