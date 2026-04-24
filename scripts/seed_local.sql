-- Minimal seed for local dev so the longform page renders.
-- Derived from classifier-service/reference/ with numbers adjusted to match
-- the Q1 2026 brief (4,938 postings / 334 digital roles). Not production data.

BEGIN;

TRUNCATE TABLE segment_distribution;
TRUNCATE TABLE organisation_breakdown;
TRUNCATE TABLE comparator_segment_shares;
TRUNCATE TABLE geography;
TRUNCATE TABLE active_roles;
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
  '{
    "segments": [
      {"segment": "ITOPS",           "staff_count":  98, "consultant_count":  36, "consultant_share_pct": 26.9},
      {"segment": "DATA_AI",         "staff_count":  42, "consultant_count":  18, "consultant_share_pct": 30.0},
      {"segment": "POLICY_ADVISORY", "staff_count":  12, "consultant_count":  24, "consultant_share_pct": 66.7},
      {"segment": "INFO_KM",         "staff_count":  20, "consultant_count":   8, "consultant_share_pct": 28.6},
      {"segment": "CYBER",           "staff_count":   7, "consultant_count":  17, "consultant_share_pct": 70.8},
      {"segment": "SOFTWARE",        "staff_count":  11, "consultant_count":   7, "consultant_share_pct": 38.9},
      {"segment": "CLOUD",           "staff_count":   9, "consultant_count":   7, "consultant_share_pct": 43.8},
      {"segment": "PRODUCT",         "staff_count":   6, "consultant_count":   8, "consultant_share_pct": 57.1},
      {"segment": "ENTERPRISE",      "staff_count":   4, "consultant_count":   0, "consultant_share_pct":  0.0}
    ]
  }'::jsonb,
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

-- Geography: top duty stations for digital hiring in Q1 2026. City names
-- map via normaliseKey() against public/duty_stations.json for coordinates.
-- Top 5 sum = 114; the remaining 220 roles spread across the long tail.
INSERT INTO geography
  (snapshot_date, location_or_country, count, share, top_segment, top_segments, organisation_count) VALUES
  ('2026-04-23', 'Geneva',        37, 11.08, 'ITOPS',           '["ITOPS","DATA_AI","POLICY_ADVISORY"]'::jsonb, 14),
  ('2026-04-23', 'New York',      35, 10.48, 'ITOPS',           '["ITOPS","DATA_AI","CYBER"]'::jsonb,           13),
  ('2026-04-23', 'Nairobi',       19,  5.69, 'DATA_AI',         '["DATA_AI","ITOPS"]'::jsonb,                    7),
  ('2026-04-23', 'Amman',         13,  3.89, 'INFO_KM',         '["INFO_KM","ITOPS","SOFTWARE"]'::jsonb,         6),
  ('2026-04-23', 'Rome',          10,  2.99, 'ITOPS',           '["ITOPS","POLICY_ADVISORY"]'::jsonb,            5),
  ('2026-04-23', 'Copenhagen',     9,  2.69, 'ITOPS',           '["ITOPS","DATA_AI"]'::jsonb,                    4),
  ('2026-04-23', 'Vienna',         9,  2.69, 'POLICY_ADVISORY', '["POLICY_ADVISORY","ITOPS"]'::jsonb,            5),
  ('2026-04-23', 'Bangkok',        8,  2.40, 'DATA_AI',         '["DATA_AI","POLICY_ADVISORY"]'::jsonb,          4),
  ('2026-04-23', 'Bonn',           8,  2.40, 'DATA_AI',         '["DATA_AI","INFO_KM"]'::jsonb,                  3),
  ('2026-04-23', 'Paris',          7,  2.10, 'POLICY_ADVISORY', '["POLICY_ADVISORY","DATA_AI"]'::jsonb,          4),
  ('2026-04-23', 'Brussels',       7,  2.10, 'POLICY_ADVISORY', '["POLICY_ADVISORY","CYBER"]'::jsonb,            3),
  ('2026-04-23', 'Madrid',         6,  1.80, 'ITOPS',           '["ITOPS","CYBER"]'::jsonb,                      3),
  ('2026-04-23', 'Beirut',         6,  1.80, 'INFO_KM',         '["INFO_KM","ITOPS"]'::jsonb,                    3),
  ('2026-04-23', 'Addis Ababa',    6,  1.80, 'POLICY_ADVISORY', '["POLICY_ADVISORY","ITOPS"]'::jsonb,            3),
  ('2026-04-23', 'Manila',         5,  1.50, 'ITOPS',           '["ITOPS","DATA_AI"]'::jsonb,                    3),
  ('2026-04-23', 'The Hague',      5,  1.50, 'POLICY_ADVISORY', '["POLICY_ADVISORY","CYBER"]'::jsonb,            3),
  ('2026-04-23', 'Budapest',       4,  1.20, 'ITOPS',           '["ITOPS"]'::jsonb,                              2),
  ('2026-04-23', 'Stockholm',      4,  1.20, 'DATA_AI',         '["DATA_AI","POLICY_ADVISORY"]'::jsonb,          3),
  ('2026-04-23', 'Valencia',       4,  1.20, 'ITOPS',           '["ITOPS","CYBER"]'::jsonb,                      1),
  ('2026-04-23', 'Florence',       3,  0.90, 'INFO_KM',         '["INFO_KM"]'::jsonb,                            1),
  ('2026-04-23', 'Gebze',          3,  0.90, 'SOFTWARE',        '["SOFTWARE"]'::jsonb,                           1),
  ('2026-04-23', 'Beijing',        3,  0.90, 'DATA_AI',         '["DATA_AI"]'::jsonb,                            2),
  ('2026-04-23', 'Dakar',          3,  0.90, 'POLICY_ADVISORY', '["POLICY_ADVISORY"]'::jsonb,                    2),
  ('2026-04-23', 'Panama City',    3,  0.90, 'INFO_KM',         '["INFO_KM","DATA_AI"]'::jsonb,                  2);

-- Active roles: 48 closing in next 30 days + 32 more in the 30-60 day
-- window, distributed roughly in proportion to segment size.
-- closing_date is relative to current_date at query time.
INSERT INTO active_roles
  (role_id, snapshot_date, title, organisation, segment, location, posted_date, closing_date, source_url, level) VALUES
  ('r001','2026-04-23','Senior IT Operations Specialist','UNICEF','ITOPS','New York','2026-03-10',current_date +  3,'https://careers.un.org/r001','P4'),
  ('r002','2026-04-23','ICT Officer','UN DESA','ITOPS','New York','2026-03-12',current_date +  5,'https://careers.un.org/r002','P3'),
  ('r003','2026-04-23','Information Systems Officer','UNCTAD','ITOPS','Geneva','2026-03-14',current_date +  6,'https://careers.un.org/r003','P3'),
  ('r004','2026-04-23','ICT Associate','UNON','ITOPS','Nairobi','2026-03-16',current_date +  7,'https://careers.un.org/r004','G6'),
  ('r005','2026-04-23','Systems Administrator','WFP','ITOPS','Rome','2026-03-16',current_date +  8,'https://careers.un.org/r005','P2'),
  ('r006','2026-04-23','Service Desk Analyst','UNOPS','ITOPS','Copenhagen','2026-03-18',current_date +  9,'https://careers.un.org/r006','P2'),
  ('r007','2026-04-23','Infrastructure Engineer','WHO','ITOPS','Geneva','2026-03-18',current_date + 10,'https://careers.un.org/r007','P3'),
  ('r008','2026-04-23','IT Support Technician','UNHCR','ITOPS','Amman','2026-03-19',current_date + 11,'https://careers.un.org/r008','G5'),
  ('r009','2026-04-23','Network Administrator','ITU','ITOPS','Geneva','2026-03-20',current_date + 12,'https://careers.un.org/r009','P3'),
  ('r010','2026-04-23','IT Operations Analyst','WIPO','ITOPS','Geneva','2026-03-21',current_date + 13,'https://careers.un.org/r010','P2'),
  ('r011','2026-04-23','ICT Assistant','UN DGACM','ITOPS','New York','2026-03-21',current_date + 14,'https://careers.un.org/r011','G4'),
  ('r012','2026-04-23','Digital Workplace Specialist','UNICEF','ITOPS','New York','2026-03-22',current_date + 15,'https://careers.un.org/r012','P3'),
  ('r013','2026-04-23','Information Systems Officer','UNAMA','ITOPS','Amman','2026-03-22',current_date + 16,'https://careers.un.org/r013','P4'),
  ('r014','2026-04-23','IT Technician','FAO','ITOPS','Rome','2026-03-23',current_date + 18,'https://careers.un.org/r014','G4'),
  ('r015','2026-04-23','Service Management Officer','UNOPS','ITOPS','Copenhagen','2026-03-23',current_date + 20,'https://careers.un.org/r015','P3'),
  ('r016','2026-04-23','IT Security Officer','UN OCT','ITOPS','New York','2026-03-24',current_date + 22,'https://careers.un.org/r016','P4'),
  ('r017','2026-04-23','Technology Operations Lead','UNICEF','ITOPS','New York','2026-03-24',current_date + 25,'https://careers.un.org/r017','P5'),
  ('r018','2026-04-23','Infrastructure Specialist','OICT','ITOPS','New York','2026-03-25',current_date + 26,'https://careers.un.org/r018','P4'),
  ('r019','2026-04-23','Data Scientist','UNEP','DATA_AI','Nairobi','2026-03-11',current_date +  4,'https://careers.un.org/r019','P3'),
  ('r020','2026-04-23','Senior Data Analyst','WFP','DATA_AI','Rome','2026-03-12',current_date +  7,'https://careers.un.org/r020','P4'),
  ('r021','2026-04-23','Machine Learning Engineer','UNDP','DATA_AI','New York','2026-03-13',current_date +  9,'https://careers.un.org/r021','P4'),
  ('r022','2026-04-23','Data Engineer','UNICEF','DATA_AI','Nairobi','2026-03-14',current_date + 11,'https://careers.un.org/r022','P3'),
  ('r023','2026-04-23','Analytics Officer','RC System','DATA_AI','Panama City','2026-03-16',current_date + 14,'https://careers.un.org/r023','P3'),
  ('r024','2026-04-23','Data Analyst','WIPO','DATA_AI','Geneva','2026-03-16',current_date + 17,'https://careers.un.org/r024','P2'),
  ('r025','2026-04-23','AI Research Specialist','UNDRR','DATA_AI','Geneva','2026-03-18',current_date + 21,'https://careers.un.org/r025','P4'),
  ('r026','2026-04-23','Statistics Officer','UN DESA','DATA_AI','New York','2026-03-20',current_date + 23,'https://careers.un.org/r026','P3'),
  ('r027','2026-04-23','Digital Policy Analyst','UN OCT','POLICY_ADVISORY','New York','2026-03-12',current_date +  6,'https://careers.un.org/r027','P3'),
  ('r028','2026-04-23','Technology Policy Officer','ITU','POLICY_ADVISORY','Geneva','2026-03-14',current_date + 10,'https://careers.un.org/r028','P4'),
  ('r029','2026-04-23','Digital Governance Consultant','UNESCO','POLICY_ADVISORY','Paris','2026-03-16',current_date + 13,'https://careers.un.org/r029','P3'),
  ('r030','2026-04-23','AI Ethics Advisor','UNESCO','POLICY_ADVISORY','Paris','2026-03-18',current_date + 18,'https://careers.un.org/r030','P4'),
  ('r031','2026-04-23','Cyber Policy Specialist','UNIDIR','POLICY_ADVISORY','Geneva','2026-03-21',current_date + 22,'https://careers.un.org/r031','P3'),
  ('r032','2026-04-23','Knowledge Management Officer','UN OCHA','INFO_KM','Geneva','2026-03-13',current_date +  8,'https://careers.un.org/r032','P3'),
  ('r033','2026-04-23','Information Management Analyst','UNHCR','INFO_KM','Geneva','2026-03-15',current_date + 12,'https://careers.un.org/r033','P2'),
  ('r034','2026-04-23','Records Management Officer','UN DGACM','INFO_KM','New York','2026-03-17',current_date + 15,'https://careers.un.org/r034','P3'),
  ('r035','2026-04-23','Content Strategy Officer','WHO','INFO_KM','Geneva','2026-03-19',current_date + 24,'https://careers.un.org/r035','P3'),
  ('r036','2026-04-23','Cybersecurity Analyst','OICT','CYBER','New York','2026-03-11',current_date +  5,'https://careers.un.org/r036','P3'),
  ('r037','2026-04-23','Information Security Officer','UNICEF','CYBER','New York','2026-03-13',current_date +  9,'https://careers.un.org/r037','P4'),
  ('r038','2026-04-23','Security Engineer','WIPO','CYBER','Geneva','2026-03-15',current_date + 14,'https://careers.un.org/r038','P3'),
  ('r039','2026-04-23','SOC Analyst','UN OCT','CYBER','New York','2026-03-18',current_date + 19,'https://careers.un.org/r039','P2'),
  ('r040','2026-04-23','Software Developer','UNOPS','SOFTWARE','Copenhagen','2026-03-12',current_date +  7,'https://careers.un.org/r040','P2'),
  ('r041','2026-04-23','Senior Backend Engineer','UNICEF','SOFTWARE','New York','2026-03-15',current_date + 12,'https://careers.un.org/r041','P4'),
  ('r042','2026-04-23','Full-Stack Developer','WFP','SOFTWARE','Rome','2026-03-17',current_date + 17,'https://careers.un.org/r042','P3'),
  ('r043','2026-04-23','Cloud Engineer','UNDP','CLOUD','New York','2026-03-13',current_date +  9,'https://careers.un.org/r043','P3'),
  ('r044','2026-04-23','DevOps Engineer','OICT','CLOUD','New York','2026-03-16',current_date + 13,'https://careers.un.org/r044','P3'),
  ('r045','2026-04-23','Platform Engineer','WIPO','CLOUD','Geneva','2026-03-19',current_date + 21,'https://careers.un.org/r045','P3'),
  ('r046','2026-04-23','Product Manager','UNICEF','PRODUCT','New York','2026-03-14',current_date + 11,'https://careers.un.org/r046','P4'),
  ('r047','2026-04-23','Digital Product Lead','UNDP','PRODUCT','New York','2026-03-18',current_date + 20,'https://careers.un.org/r047','P5'),
  ('r048','2026-04-23','ERP Functional Lead','UN Secretariat','ENTERPRISE','New York','2026-03-14',current_date + 28,'https://careers.un.org/r048','P5'),
  ('r049','2026-04-23','ICT Coordinator','ESCAP','ITOPS','Bangkok','2026-03-22',current_date + 34,'https://careers.un.org/r049','P4'),
  ('r050','2026-04-23','Data Visualisation Specialist','UNEP','DATA_AI','Nairobi','2026-03-23',current_date + 38,'https://careers.un.org/r050','P3'),
  ('r051','2026-04-23','Digital Trade Analyst','UNCTAD','POLICY_ADVISORY','Geneva','2026-03-26',current_date + 42,'https://careers.un.org/r051','P3'),
  ('r052','2026-04-23','Cyber Resilience Officer','ITU','CYBER','Geneva','2026-03-28',current_date + 46,'https://careers.un.org/r052','P4'),
  ('r053','2026-04-23','Senior Software Engineer','UNICEF','SOFTWARE','New York','2026-04-01',current_date + 49,'https://careers.un.org/r053','P5'),
  ('r054','2026-04-23','Cloud Solutions Architect','UN OCT','CLOUD','New York','2026-04-02',current_date + 52,'https://careers.un.org/r054','P4'),
  ('r055','2026-04-23','Knowledge Management Lead','OCHA','INFO_KM','Geneva','2026-04-03',current_date + 55,'https://careers.un.org/r055','P4'),
  ('r056','2026-04-23','Digital Product Designer','UNDP','PRODUCT','New York','2026-04-04',current_date + 58,'https://careers.un.org/r056','P3');

COMMIT;
