-- Minimal seed for local dev so the longform page renders.
-- Derived from classifier-service/reference/ with numbers adjusted to match
-- the Q1 2026 brief (4,938 postings / 334 digital roles). Not production data.

BEGIN;

TRUNCATE TABLE segment_distribution;
TRUNCATE TABLE organisation_breakdown;
TRUNCATE TABLE comparator_segment_shares;
TRUNCATE TABLE snapshots CASCADE;

INSERT INTO snapshots (
  snapshot_date,
  classifier_version_sha,
  primary_period_from,
  primary_period_to,
  comparator_period_from,
  comparator_period_to,
  total_postings,
  digital_postings,
  digital_share_pct,
  organisations_represented,
  headline_numbers,
  cut_manifest,
  concurrency_timeseries,
  qoq_change,
  collision_profiles,
  staff_vs_consultant,
  computed_at
) VALUES (
  '2026-04-23',
  '7f702e1d0000000000000000000000000000',
  '2026-01-01',
  '2026-03-31',
  '2025-10-01',
  '2025-12-31',
  4938,
  334,
  6.76,
  63,
  '{
    "total_postings": 4938,
    "digital_postings": 334,
    "digital_share_pct": 6.76,
    "segment_counts": {
      "CYBER": 24,
      "DATA_AI": 60,
      "SOFTWARE": 18,
      "CLOUD": 16,
      "ENTERPRISE": 4,
      "INFO_KM": 28,
      "PRODUCT": 14,
      "POLICY_ADVISORY": 36,
      "ITOPS": 134
    }
  }'::jsonb,
  '{
    "classifier_version_sha": "7f702e1d0000000000000000000000000000",
    "period_from": "2026-01-01",
    "period_to": "2026-03-31",
    "comparator_from": "2025-10-01",
    "comparator_to": "2025-12-31",
    "apples_to_apples": {
      "common_sources": [
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
        "wayback-unops"
      ]
    },
    "warnings": []
  }'::jsonb,
  '{
    "segments": [
      {
        "segment": "ITOPS",
        "points": [
          {"month": "2025-08", "distinct_organisations": 9},
          {"month": "2025-09", "distinct_organisations": 11},
          {"month": "2025-10", "distinct_organisations": 13},
          {"month": "2025-11", "distinct_organisations": 14},
          {"month": "2025-12", "distinct_organisations": 12},
          {"month": "2026-01", "distinct_organisations": 15},
          {"month": "2026-02", "distinct_organisations": 17},
          {"month": "2026-03", "distinct_organisations": 16}
        ]
      },
      {
        "segment": "DATA_AI",
        "points": [
          {"month": "2025-08", "distinct_organisations": 12},
          {"month": "2025-09", "distinct_organisations": 14},
          {"month": "2025-10", "distinct_organisations": 15},
          {"month": "2025-11", "distinct_organisations": 17},
          {"month": "2025-12", "distinct_organisations": 16},
          {"month": "2026-01", "distinct_organisations": 18},
          {"month": "2026-02", "distinct_organisations": 20},
          {"month": "2026-03", "distinct_organisations": 19}
        ]
      },
      {
        "segment": "POLICY_ADVISORY",
        "points": [
          {"month": "2025-08", "distinct_organisations": 5},
          {"month": "2025-09", "distinct_organisations": 6},
          {"month": "2025-10", "distinct_organisations": 7},
          {"month": "2025-11", "distinct_organisations": 8},
          {"month": "2025-12", "distinct_organisations": 6},
          {"month": "2026-01", "distinct_organisations": 9},
          {"month": "2026-02", "distinct_organisations": 10},
          {"month": "2026-03", "distinct_organisations": 9}
        ]
      },
      {
        "segment": "CYBER",
        "points": [
          {"month": "2025-08", "distinct_organisations": 4},
          {"month": "2025-09", "distinct_organisations": 5},
          {"month": "2025-10", "distinct_organisations": 6},
          {"month": "2025-11", "distinct_organisations": 7},
          {"month": "2025-12", "distinct_organisations": 5},
          {"month": "2026-01", "distinct_organisations": 8},
          {"month": "2026-02", "distinct_organisations": 9},
          {"month": "2026-03", "distinct_organisations": 7}
        ]
      },
      {
        "segment": "INFO_KM",
        "points": [
          {"month": "2025-08", "distinct_organisations": 3},
          {"month": "2025-09", "distinct_organisations": 4},
          {"month": "2025-10", "distinct_organisations": 5},
          {"month": "2025-11", "distinct_organisations": 6},
          {"month": "2025-12", "distinct_organisations": 5},
          {"month": "2026-01", "distinct_organisations": 7},
          {"month": "2026-02", "distinct_organisations": 8},
          {"month": "2026-03", "distinct_organisations": 7}
        ]
      },
      {
        "segment": "SOFTWARE",
        "points": [
          {"month": "2025-08", "distinct_organisations": 2},
          {"month": "2025-09", "distinct_organisations": 3},
          {"month": "2025-10", "distinct_organisations": 4},
          {"month": "2025-11", "distinct_organisations": 5},
          {"month": "2025-12", "distinct_organisations": 4},
          {"month": "2026-01", "distinct_organisations": 6},
          {"month": "2026-02", "distinct_organisations": 7},
          {"month": "2026-03", "distinct_organisations": 6}
        ]
      },
      {
        "segment": "CLOUD",
        "points": [
          {"month": "2025-08", "distinct_organisations": 2},
          {"month": "2025-09", "distinct_organisations": 2},
          {"month": "2025-10", "distinct_organisations": 3},
          {"month": "2025-11", "distinct_organisations": 4},
          {"month": "2025-12", "distinct_organisations": 3},
          {"month": "2026-01", "distinct_organisations": 5},
          {"month": "2026-02", "distinct_organisations": 6},
          {"month": "2026-03", "distinct_organisations": 5}
        ]
      },
      {
        "segment": "PRODUCT",
        "points": [
          {"month": "2025-08", "distinct_organisations": 2},
          {"month": "2025-09", "distinct_organisations": 3},
          {"month": "2025-10", "distinct_organisations": 3},
          {"month": "2025-11", "distinct_organisations": 4},
          {"month": "2025-12", "distinct_organisations": 3},
          {"month": "2026-01", "distinct_organisations": 5},
          {"month": "2026-02", "distinct_organisations": 6},
          {"month": "2026-03", "distinct_organisations": 5}
        ]
      },
      {
        "segment": "ENTERPRISE",
        "points": [
          {"month": "2025-08", "distinct_organisations": 1},
          {"month": "2025-09", "distinct_organisations": 1},
          {"month": "2025-10", "distinct_organisations": 1},
          {"month": "2025-11", "distinct_organisations": 1},
          {"month": "2025-12", "distinct_organisations": 1},
          {"month": "2026-01", "distinct_organisations": 1},
          {"month": "2026-02", "distinct_organisations": 1},
          {"month": "2026-03", "distinct_organisations": 1}
        ]
      }
    ]
  }'::jsonb,
  '{"segments": []}'::jsonb,
  '{
    "profiles": [
      {
        "canonical_title": "Information Systems Officer",
        "organisation_count": 6,
        "organisations": [
          "UN DGACM",
          "UN DESA",
          "UN OCT",
          "UNAMA",
          "UNCTAD",
          "UNON"
        ],
        "segment": "ITOPS"
      },
      {
        "canonical_title": "Data Analyst",
        "organisation_count": 3,
        "organisations": ["RC System", "UNEP", "WIPO"],
        "segment": "DATA_AI"
      },
      {
        "canonical_title": "Data Scientist",
        "organisation_count": 3,
        "organisations": ["UNEP", "UNDRR", "WFP"],
        "segment": "DATA_AI"
      },
      {
        "canonical_title": "Information Systems Assistant",
        "organisation_count": 3,
        "organisations": ["UNCCD", "ITC", "UNJSPF"],
        "segment": "ITOPS"
      }
    ]
  }'::jsonb,
  '{"segments": []}'::jsonb,
  now()
);

INSERT INTO segment_distribution (snapshot_date, segment, count, share_of_digital, share_of_all) VALUES
  ('2026-04-23', 'ITOPS',           134, 40.12, 2.71),
  ('2026-04-23', 'DATA_AI',          60, 17.96, 1.21),
  ('2026-04-23', 'POLICY_ADVISORY',  36, 10.78, 0.73),
  ('2026-04-23', 'INFO_KM',          28,  8.38, 0.57),
  ('2026-04-23', 'CYBER',            24,  7.19, 0.49),
  ('2026-04-23', 'SOFTWARE',         18,  5.39, 0.36),
  ('2026-04-23', 'CLOUD',            16,  4.79, 0.32),
  ('2026-04-23', 'PRODUCT',          14,  4.19, 0.28),
  ('2026-04-23', 'ENTERPRISE',        4,  1.20, 0.08);

-- Seeded subset of organisation_breakdown; used only to derive
-- {segment -> count(distinct orgs)} for Section 02's scatter axes.
-- Row shape mirrors classifier-service/reference/organisation_breakdown.csv.
INSERT INTO organisation_breakdown
  (snapshot_date, organisation, total_postings, digital_postings, digital_share,
   top_segment_1, top_segment_2, top_segment_3) VALUES
  ('2026-04-23', 'UNICEF',                                      1298, 78, 6.01, 'DATA_AI', 'ITOPS', 'POLICY_ADVISORY'),
  ('2026-04-23', 'World Food Programme (WFP)',                   612, 35, 5.72, 'ITOPS', 'DATA_AI', 'PRODUCT'),
  ('2026-04-23', 'UNOPS',                                        409, 27, 6.60, 'ITOPS', 'DATA_AI', 'PRODUCT'),
  ('2026-04-23', 'UNCTAD',                                       100, 23, 23.00, 'ITOPS', 'POLICY_ADVISORY', 'DATA_AI'),
  ('2026-04-23', 'UNEP',                                         361, 16, 4.43, 'DATA_AI', 'INFO_KM', 'ITOPS'),
  ('2026-04-23', 'RC System',                                    150, 10, 6.67, 'DATA_AI', NULL, NULL),
  ('2026-04-23', 'FAO',                                          148,  9, 6.08, 'ITOPS', 'DATA_AI', 'POLICY_ADVISORY'),
  ('2026-04-23', 'ESCWA',                                         47,  8, 17.02, 'POLICY_ADVISORY', 'DATA_AI', 'ITOPS'),
  ('2026-04-23', 'ITC',                                          113,  8, 7.08, 'POLICY_ADVISORY', 'ITOPS', 'SOFTWARE'),
  ('2026-04-23', 'UNODC',                                        137,  7, 5.11, 'DATA_AI', 'CYBER', 'SOFTWARE'),
  ('2026-04-23', 'OICT',                                          10,  6, 60.00, 'ITOPS', NULL, NULL),
  ('2026-04-23', 'UNJSPF',                                        16,  6, 37.50, 'INFO_KM', 'ITOPS', 'DATA_AI'),
  ('2026-04-23', 'ESCAP',                                         60,  5, 8.33, 'POLICY_ADVISORY', 'PRODUCT', 'DATA_AI'),
  ('2026-04-23', 'UNDP',                                          10,  5, 50.00, 'CLOUD', 'DATA_AI', 'SOFTWARE'),
  ('2026-04-23', 'DOS',                                           32,  4, 12.50, 'DATA_AI', 'CYBER', 'INFO_KM'),
  ('2026-04-23', 'ECA',                                           43,  4, 9.30, 'ITOPS', NULL, NULL),
  ('2026-04-23', 'OCHA',                                          39,  4, 10.26, 'DATA_AI', 'INFO_KM', NULL),
  ('2026-04-23', 'OHCHR',                                         90,  4, 4.44, 'INFO_KM', 'DATA_AI', 'ENTERPRISE'),
  ('2026-04-23', 'DGACM',                                         10,  3, 30.00, 'DATA_AI', 'ITOPS', NULL),
  ('2026-04-23', 'DPO',                                           22,  3, 13.64, 'DATA_AI', 'INFO_KM', NULL),
  ('2026-04-23', 'ECLAC',                                         73,  3, 4.11, 'DATA_AI', 'ITOPS', 'POLICY_ADVISORY'),
  ('2026-04-23', 'UN-DESA',                                       40,  3, 7.50, 'ITOPS', 'POLICY_ADVISORY', NULL),
  ('2026-04-23', 'UN-OCT',                                        30,  3, 10.00, 'ITOPS', 'CYBER', NULL),
  ('2026-04-23', 'UNAMA',                                         55,  3, 5.45, 'ITOPS', 'INFO_KM', NULL),
  ('2026-04-23', 'UNON',                                          80,  3, 3.75, 'ITOPS', 'INFO_KM', NULL),
  ('2026-04-23', 'UNCCD',                                         25,  2, 8.00, 'ITOPS', NULL, NULL),
  ('2026-04-23', 'UNDRR',                                         35,  2, 5.71, 'DATA_AI', 'INFO_KM', NULL),
  ('2026-04-23', 'WIPO',                                         140,  2, 1.43, 'DATA_AI', 'ITOPS', 'CYBER'),
  ('2026-04-23', 'ICAO',                                          80,  2, 2.50, 'ITOPS', 'CYBER', NULL),
  ('2026-04-23', 'WHO',                                          320,  2, 0.63, 'POLICY_ADVISORY', 'DATA_AI', NULL),
  ('2026-04-23', 'UNRWA',                                         17,  2, 11.76, 'SOFTWARE', 'CLOUD', 'CYBER'),
  ('2026-04-23', 'WMO',                                           55,  1, 1.82, 'ITOPS', NULL, NULL),
  ('2026-04-23', 'UNIDO',                                         40,  1, 2.50, 'ENTERPRISE', NULL, NULL),
  ('2026-04-23', 'UN-Habitat',                                    30,  1, 3.33, 'DATA_AI', NULL, NULL),
  ('2026-04-23', 'IMO',                                           45,  1, 2.22, 'CYBER', NULL, NULL);

-- Segment share deltas derived from classifier-service reference values,
-- adjusted so the two largest movers land on the spec's annotation numbers
-- (+7.61pp ITOPS / -6.69pp DATA_AI).
INSERT INTO comparator_segment_shares
  (snapshot_date, segment, primary_count, primary_share, comparator_count, comparator_share, delta_pp) VALUES
  ('2026-04-23', 'ITOPS',           134, 40.12, 70, 32.51, 7.61),
  ('2026-04-23', 'CYBER',            24,  7.19, 10,  4.69, 2.50),
  ('2026-04-23', 'INFO_KM',          28,  8.38, 14,  6.58, 1.80),
  ('2026-04-23', 'ENTERPRISE',        4,  1.20,  2,  0.90, 0.30),
  ('2026-04-23', 'SOFTWARE',         18,  5.39, 13,  5.89, -0.50),
  ('2026-04-23', 'CLOUD',            16,  4.79, 12,  5.49, -0.70),
  ('2026-04-23', 'POLICY_ADVISORY',  36, 10.78, 25, 11.71, -0.93),
  ('2026-04-23', 'PRODUCT',          14,  4.19, 16,  7.59, -3.40),
  ('2026-04-23', 'DATA_AI',          60, 17.96, 53, 24.65, -6.69);

COMMIT;
