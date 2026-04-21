/**
 * UN common-system whitelist. Case-insensitive substring match on organization
 * name. Applied at snapshot-computation time, not at read time — v0.1 is
 * UN-only; the UI toggle for multilateral view is deferred to Phase 2.
 *
 * Source: spec in the v0.1 kickoff. Order-insensitive. Ambiguous multi-word
 * matches (e.g. "UN Habitat" vs "UN-Habitat") covered via multiple substrings.
 */
export const UN_WHITELIST = [
  "United Nations",
  "UN Secretariat",
  "UNDP",
  "UNICEF",
  "UNHCR",
  "WFP",
  "UNFPA",
  "UN Women",
  "UNEP",
  "UN-Habitat",
  "UN Habitat",
  "UNODC",
  "UNOPS",
  "UNCTAD",
  "UNICC",
  "UNV",
  "UNRWA",
  "UNESCO",
  "WHO",
  "ILO",
  "FAO",
  "IFAD",
  "IMO",
  "ITU",
  "UPU",
  "WMO",
  "WIPO",
  "UNIDO",
  "UNWTO",
  "UN Tourism",
  "IAEA",
  "IOM",
  "ICAO",
  "UNITAR",
  "UNSSC",
  "UN DESA",
  "OCHA",
  "OHCHR",
  "UNAIDS",
  "UN Environment",
];

const _lowered = UN_WHITELIST.map((s) => s.toLowerCase());

/** True if the organization name contains any UN-whitelist substring. */
export function isUnCommonSystem(organization: string | null | undefined): boolean {
  if (!organization) return false;
  const lower = organization.toLowerCase();
  for (const w of _lowered) {
    if (lower.includes(w)) return true;
  }
  return false;
}
