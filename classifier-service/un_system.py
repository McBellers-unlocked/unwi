"""UN Common System whitelist — applied at classify time.

Filters raw aggregator postings to UN Common System entities only. Applied
BEFORE classification so non-UN orgs never enter any downstream metric.

Matching rules (case-insensitive):
  1. Acronym match: the acronym appears as a WHOLE WORD (regex \\b<A>\\b).
     Avoids false positives like "FUND" matching "un" or "Europe" matching
     "EU" — a substring with no word boundaries slips under the fence.
  2. Full-name match: one of the known full-name variants appears as a
     SUBSTRING. This catches aggregators that write "Food and Agriculture
     Organization" without the (FAO) parenthetical.
  3. Pattern match (peacekeeping missions): regex over the whole name.

Deliberately out of scope:
  - NATO, all EU institutions (European Commission, EDA, Europol, ENISA,
    EUSPA, SESAR, eu-LISA, SRB, EASA/EBA/ECHA/EFSA/EIOPA/EMA/EMSA/ESMA/
    EUROJUST/FRONTEX/all *EU* agencies)
  - Bretton Woods (IMF, World Bank Group, IFC)
  - Regional development banks (ADB, AfDB, IDB, AIIB)
  - OSCE, ESA, OECD, Council of Europe, Commonwealth Secretariat
  - Any national government body
"""
from __future__ import annotations

import re

# Each bucket → list of (acronyms[], full-name variants[]).
# An org passes if ANY acronym matches \\b<acronym>\\b OR any variant is a
# substring. Case-insensitive throughout.
WHITELIST: dict[str, dict[str, list[str]]] = {
    "UN Secretariat": {
        "acronyms": [
            "UN Secretariat", "EOSG", "DGACM", "DESA", "UN DESA",
            "DPO", "DPPA", "DGC", "DOS", "DSS",
            "OICT", "DMSPC", "OLA", "OIOS",
        ],
        "names": [
            "Executive Office of the Secretary-General",
            "Department for General Assembly and Conference Management",
            "Department of Economic and Social Affairs",
            "Department of Peace Operations",
            "Department of Peacekeeping Operations",
            "Department of Political and Peacebuilding Affairs",
            "Department of Global Communications",
            "Department of Operational Support",
            "Department of Safety and Security",
            "Department of Management Strategy, Policy and Compliance",
            "Office of Information and Communications Technology",
            "Office of Legal Affairs",
            "Office of Internal Oversight Services",
            "Office of the Secretary-Generals Envoy on Technology",
            "Office of the Special Adviser",
            "Office of the Special Representative",
            "Office of the SRSG",
            "Office of the Special Envoy",
            "Office of the Personal Envoy",
            "Office of the Special Coordinator",
            "Office of the High Representative for the Least Developed",
            "Office of Administration of Justice",
            "Office of the Victims Rights Advocate",
            "Peacebuilding Support Office",
            "Electoral Assistance Division",
            "Ethics Office",
            "Global Compact Office",
            "Human Security Unit",
            "Regional Commissions - New York Office",
        ],
    },
    "UNDP":   {"acronyms": ["UNDP"],   "names": ["United Nations Development Programme"]},
    "UNICEF": {"acronyms": ["UNICEF"], "names": ["United Nations Children"]},
    "UNFPA":  {"acronyms": ["UNFPA"],  "names": ["United Nations Population Fund"]},
    "WFP":    {"acronyms": ["WFP"],    "names": ["World Food Programme"]},
    "UNHCR":  {"acronyms": ["UNHCR"],
               "names": ["United Nations High Commissioner for Refugees"]},
    "UN Women": {
        "acronyms": ["UN Women"],
        "names": ["United Nations Entity for Gender Equality"],
    },
    "UNEP / UN Environment": {
        "acronyms": ["UNEP", "UN Environment"],
        "names": ["United Nations Environment Programme"],
    },
    "UN-Habitat": {
        "acronyms": ["UN-Habitat", "UN Habitat"],
        "names": ["United Nations Human Settlements Programme"],
    },
    "UNODC":  {"acronyms": ["UNODC"],  "names": ["United Nations Office on Drugs and Crime"]},
    "UNOPS":  {"acronyms": ["UNOPS"],  "names": ["United Nations Office for Project Services"]},
    "UNCTAD": {"acronyms": ["UNCTAD"], "names": ["United Nations Conference on Trade and Development"]},
    "UNICC":  {"acronyms": ["UNICC"],  "names": ["United Nations International Computing Centre"]},
    "UNV":    {"acronyms": ["UNV"],    "names": ["United Nations Volunteers"]},
    "UNCDF":  {"acronyms": ["UNCDF"],  "names": ["United Nations Capital Development Fund"]},
    "UNRWA":  {"acronyms": ["UNRWA"],
               "names": ["United Nations Relief and Works Agency"]},
    "UNESCO": {"acronyms": ["UNESCO"],
               "names": ["United Nations Educational, Scientific and Cultural Organization"]},
    "WHO":    {"acronyms": ["WHO"],    "names": ["World Health Organization"]},
    "ILO":    {"acronyms": ["ILO"],    "names": ["International Labour Organization",
                                                "International Labour Office"]},
    "FAO":    {"acronyms": ["FAO"],    "names": ["Food and Agriculture Organization"]},
    "IFAD":   {"acronyms": ["IFAD"],   "names": ["International Fund for Agricultural Development"]},
    "IMO":    {"acronyms": ["IMO"],    "names": ["International Maritime Organization"]},
    "ITU":    {"acronyms": ["ITU"],    "names": ["International Telecommunication Union"]},
    "UPU":    {"acronyms": ["UPU"],    "names": ["Universal Postal Union"]},
    "WMO":    {"acronyms": ["WMO"],    "names": ["World Meteorological Organization"]},
    "WIPO":   {"acronyms": ["WIPO"],   "names": ["World Intellectual Property Organization"]},
    "UNIDO":  {"acronyms": ["UNIDO"],  "names": ["United Nations Industrial Development Organization"]},
    "UNWTO / UN Tourism": {
        "acronyms": ["UNWTO", "UN Tourism"],
        "names": ["World Tourism Organization"],
    },
    "IAEA":   {"acronyms": ["IAEA"],   "names": ["International Atomic Energy Agency"]},
    "IOM":    {"acronyms": ["IOM"],    "names": ["International Organization for Migration"]},
    "ICAO":   {"acronyms": ["ICAO"],   "names": ["International Civil Aviation Organization"]},
    "UNITAR": {"acronyms": ["UNITAR"], "names": ["United Nations Institute for Training and Research"]},
    "UNSSC":  {"acronyms": ["UNSSC"],  "names": ["United Nations System Staff College"]},
    "UNU":    {"acronyms": ["UNU"],    "names": ["United Nations University"]},
    "OCHA":   {"acronyms": ["OCHA", "UNOCHA"],
               "names": ["Office for the Coordination of Humanitarian Affairs"]},
    "OHCHR":  {"acronyms": ["OHCHR"],
               "names": ["Office of the High Commissioner for Human Rights",
                         "Office of the United Nations High Commissioner for Human Rights"]},
    "UNAIDS": {"acronyms": ["UNAIDS"],
               "names": ["Joint United Nations Programme on HIV/AIDS"]},
    "ITC": {
        "acronyms": ["ITC"],
        "names": ["International Trade Centre"],
    },
    # Regional commissions (UN Secretariat regional arms)
    "ECA":   {"acronyms": ["ECA"],
              "names": ["Economic Commission for Africa"]},
    "ECE":   {"acronyms": ["ECE"],
              "names": ["Economic Commission for Europe"]},
    "ECLAC": {"acronyms": ["ECLAC"],
              "names": ["Economic Commission for Latin America and the Caribbean"]},
    "ESCAP": {"acronyms": ["ESCAP"],
              "names": ["Economic and Social Commission for Asia and the Pacific"]},
    "ESCWA": {"acronyms": ["ESCWA"],
              "names": ["Economic and Social Commission for Western Asia"]},
    # Duty-station offices
    "UNOG":  {"acronyms": ["UNOG"],    "names": ["United Nations Office at Geneva"]},
    "UNON":  {"acronyms": ["UNON"],    "names": ["United Nations Office at Nairobi"]},
    "UNOV":  {"acronyms": ["UNOV"],    "names": ["United Nations Office at Vienna"]},
    # Principal organ
    "ICJ":   {"acronyms": ["ICJ"],     "names": ["International Court of Justice"]},
    # Resident Coordinator system (UN country teams)
    "RC System": {
        "acronyms": ["RCO"],
        "names": ["Resident Coordinator System", "Resident Coordinator Office", "RC Office"],
    },
    # Peacekeeping (pattern-matched below; acronyms kept for clarity)
    "Peacekeeping": {
        "acronyms": [
            "MONUSCO", "UNIFIL", "UNMISS", "UNMOGIP", "UNTSO", "UNAMA",
            "UNSOS", "UNAMID", "UNOCI", "UNMIK", "UNMIL", "UNDOF",
            "MINUSCA", "MINUSMA", "MINURSO", "MINUSTAH", "UNISFA",
        ],
        "names": [
            "United Nations Assistance Mission",
            "United Nations Interim Security Force",
            "United Nations Mission in",
            "United Nations Support Office",
            "United Nations Logistic Base",
            "United Nations Office at",
            "Regional Service Centre at Entebbe",
            "Independent Investigative Mechanism",
        ],
    },
    # Specific UN bodies that don't fit the patterns above
    "UNCCD":   {"acronyms": ["UNCCD"],
                "names": ["Convention to Combat Desertification"]},
    "UNOCT":   {"acronyms": ["UNOCT"],
                "names": ["Office of Counter-Terrorism"]},
    "CTED":    {"acronyms": ["CTED"],
                "names": ["Counter-Terrorism Committee Executive Directorate"]},
    "UN Technology Bank": {
        "acronyms": [],
        "names": ["Technology Bank for the Least Developed Countries"],
    },
    # Common System bodies sui generis
    "ICSC":   {"acronyms": ["ICSC"],   "names": ["International Civil Service Commission"]},
    "JIU":    {"acronyms": ["JIU"],    "names": ["Joint Inspection Unit", "Joint Inspections Unit"]},
    "UNODA":  {"acronyms": ["UNODA"],  "names": ["Office for Disarmament Affairs"]},
    # Bodies previously folded into Peacekeeping; kept in-scope, bucketed accurately
    "UNDRR":  {"acronyms": ["UNDRR"],  "names": ["United Nations Office for Disaster Risk Reduction"]},
    "UNJSPF": {"acronyms": ["UNJSPF"], "names": ["United Nations Joint Staff Pension Fund"]},
    "UNICRI": {"acronyms": ["UNICRI"], "names": ["United Nations Interregional Crime and Justice Research Institute"]},
    "IRMCT":  {"acronyms": ["IRMCT"],  "names": ["International Residual Mechanism"]},
    "IIMP":   {"acronyms": ["IIMP"],   "names": ["Independent Institution on Missing Persons"]},
    # Syria IIIM (distinct from Myanmar's IIMM, which remains in Peacekeeping)
    "IIIM-Syria": {
        "acronyms": ["IIIM"],
        "names": ["International, Impartial and Independent Mechanism"],
    },
    # ----------------------------------------------------------------------
    # Broad UN-prefix catch-alls. Intentionally last; earlier buckets give
    # more specific attribution. These catch any UN body whose name starts
    # with "UN " (as a word) or contains "United Nations" but whose specific
    # acronym isn't separately bucketed — e.g. "UN Support Office in Haiti",
    # "United Nations Peacebuilding Support Office".
    "UN (generic prefix)": {
        "acronyms": ["UN"],
        "names": ["United Nations"],
    },
}

# --- explicit exclusions (short-circuit) ---
# Checked BEFORE whitelist. Split into two classes so short acronyms don't
# leak as substring matches:
#   ACRONYMS: matched with word boundaries (\bNATO\b avoids hitting
#             "coordi**NATO**r" in "Resident Coordinator System").
#   NAMES:    case-insensitive substring match for unambiguous multi-word
#             phrases that have no within-word collision risk.
HARD_EXCLUSION_ACRONYMS = [
    "NATO", "IMF", "WTO", "OSCE", "OECD", "EU", "IFC",
    "ADB", "AfDB", "IDB", "AIIB",
    "EBA", "ECHA", "EFSA", "EIOPA", "EMA", "EMSA", "ESMA",
    "EASA", "ENISA", "EUAA", "EUDA", "EUSPA",
    "EUROPOL", "FRONTEX", "EUROJUST",
    "SESAR", "EU-LISA",
    "SRB",   # Single Resolution Board (EU)
]
HARD_EXCLUSION_NAMES = [
    "North Atlantic Treaty Organization",
    "European Commission", "European Union", "European Defence Agency",
    "European Central Bank", "European Parliament", "European Council",
    "European Investment Bank", "European Banking Authority",
    "European Food Safety", "European Aviation Safety", "European Chemicals",
    "European Insurance And Occupational", "European Maritime Safety",
    "European Medicines", "European Securities",
    "European Border And Coast Guard", "European Police",
    "European Network And Information", "European Space",
    "European Union Agency", "European Union Drugs",
    "European Union Agency for Criminal Justice",
    "Single European Sky", "Single Resolution Board",
    "International Monetary Fund",
    "World Bank", "International Finance Corporation",
    "Asian Development Bank", "Asian Infrastructure Investment Bank",
    "African Development Bank", "Inter-American Development Bank",
    "Organization for Security and Co-operation in Europe",
    "European Space Agency",
    "Organisation for Economic Co-operation and Development",
    "Council of Europe", "Commonwealth Secretariat",
    "World Trade Organization",
    "International Seabed Authority",
]

# Compile patterns
_ACRONYM_RES: list[tuple[str, re.Pattern[str]]] = []
_NAME_SUBSTRINGS: list[tuple[str, str]] = []

for bucket, cfg in WHITELIST.items():
    for acr in cfg.get("acronyms", []):
        # Word-boundary acronym regex; escape any hyphens / spaces via re.escape
        # then re-assemble so multi-word acronyms still match whole-word.
        # For "UN-Habitat" / "UN Women", we want the EXACT literal to match.
        body = re.escape(acr)
        pattern = re.compile(rf"\b{body}\b", re.IGNORECASE)
        _ACRONYM_RES.append((bucket, pattern))
    for name in cfg.get("names", []):
        _NAME_SUBSTRINGS.append((bucket, name.lower()))

_EXCLUSION_ACRONYM_RES = [
    re.compile(rf"\b{re.escape(a)}\b", re.IGNORECASE)
    for a in HARD_EXCLUSION_ACRONYMS
]
_EXCLUSION_NAME_SUBSTRINGS = [s.lower() for s in HARD_EXCLUSION_NAMES]


def classify_scope(org: str) -> tuple[bool, str | None, str | None]:
    """Return (in_scope, bucket, reason).

    - in_scope=True  : the org is UN Common System. bucket = which bucket.
    - in_scope=False : not in scope. reason = "exclusion" / "no-match".
    """
    if not org:
        return False, None, "no-match"
    o = org.lower()
    # Early-out on hard exclusions so e.g. "European Commission Directorate for
    # International Atomic Energy" doesn't leak through the IAEA rule.
    for pat in _EXCLUSION_ACRONYM_RES:
        if pat.search(org):
            return False, None, f"exclusion:{pat.pattern}"
    for ex in _EXCLUSION_NAME_SUBSTRINGS:
        if ex in o:
            return False, None, f"exclusion:{ex[:30]}"
    # Whitelist pass
    for bucket, pat in _ACRONYM_RES:
        if pat.search(org):
            return True, bucket, f"acronym:{pat.pattern}"
    for bucket, sub in _NAME_SUBSTRINGS:
        if sub in o:
            return True, bucket, f"name:{sub[:40]}"
    return False, None, "no-match"


def is_un_common_system(org: str) -> bool:
    return classify_scope(org)[0]


def whitelist_size() -> int:
    """Size reported in cut_manifest.scope_filter."""
    return len(WHITELIST)
