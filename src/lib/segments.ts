export const SEGMENT_CODES = [
  "CYBER",
  "DATA_AI",
  "SOFTWARE",
  "CLOUD",
  "ENTERPRISE",
  "INFO_KM",
  "PRODUCT",
  "POLICY_ADVISORY",
  "ITOPS",
] as const;

export type SegmentCode = (typeof SEGMENT_CODES)[number];

export const SEGMENT_LABELS: Record<SegmentCode, string> = {
  CYBER: "Cybersecurity",
  DATA_AI: "Data, Analytics & AI",
  SOFTWARE: "Software Engineering",
  CLOUD: "Cloud & Infrastructure",
  ENTERPRISE: "Enterprise Systems",
  INFO_KM: "Information & Knowledge",
  PRODUCT: "Product & Delivery",
  POLICY_ADVISORY: "Digital Policy & Advisory",
  ITOPS: "IT Operations & Support",
};
