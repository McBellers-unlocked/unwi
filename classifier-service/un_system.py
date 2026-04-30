"""Scope classification — applied at classify time.

Sorts raw aggregator postings into scope groups so the dashboard can show
UN Common System data alongside (rather than instead of) Bretton Woods,
Regional Development Banks, EU institutions and Other International
Organisations.

Returned scope_group values:
  - "UN Common System"          (default; existing dashboard sections filter to this)
  - "Bretton Woods"             (IMF, World Bank Group, IFC)
  - "Regional Development Banks" (ADB, AfDB, IDB, AIIB)
  - "European Union"            (Commission, Parliament, all EU agencies)
  - "Other International Organisations" (NATO, OSCE, OECD, WTO, ESA, Council of Europe, etc.)
  - None                        (org not in any tracked group — stays out of all aggregates)

Matching rules (case-insensitive):
  1. Acronym match: the acronym appears as a WHOLE WORD (regex \\b<A>\\b).
     Avoids false positives like "FUND" matching "un" or "Europe" matching
     "EU" — a substring with no word boundaries slips under the fence.
  2. Full-name match: one of the known full-name variants appears as a
     SUBSTRING. This catches aggregators that write "Food and Agriculture
     Organization" without the (FAO) parenthetical.

Earlier groups win: UN Common System checks happen first, so e.g. "Office
of the High Commissioner" attaches to OHCHR rather than leaking into "Other".
"""
from __future__ import annotations

import re

# A scope group is a dict[bucket_name, {acronyms[], names[]}].
# Each top-level entry is one of the five tracked groups (plus None for unmatched).
SCOPE_GROUPS: dict[str, dict[str, dict[str, list[str]]]] = {
    "UN Common System": {
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
        "UNOG":  {"acronyms": ["UNOG"],    "names": ["United Nations Office at Geneva"]},
        "UNON":  {"acronyms": ["UNON"],    "names": ["United Nations Office at Nairobi"]},
        "UNOV":  {"acronyms": ["UNOV"],    "names": ["United Nations Office at Vienna"]},
        "ICJ":   {"acronyms": ["ICJ"],     "names": ["International Court of Justice"]},
        "RC System": {
            "acronyms": ["RCO"],
            "names": ["Resident Coordinator System", "Resident Coordinator Office", "RC Office"],
        },
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
        "ICSC":   {"acronyms": ["ICSC"],   "names": ["International Civil Service Commission"]},
        "JIU":    {"acronyms": ["JIU"],    "names": ["Joint Inspection Unit", "Joint Inspections Unit"]},
        "UNODA":  {"acronyms": ["UNODA"],  "names": ["Office for Disarmament Affairs"]},
        "UNDRR":  {"acronyms": ["UNDRR"],  "names": ["United Nations Office for Disaster Risk Reduction"]},
        "UNJSPF": {"acronyms": ["UNJSPF"], "names": ["United Nations Joint Staff Pension Fund"]},
        "UNICRI": {"acronyms": ["UNICRI"], "names": ["United Nations Interregional Crime and Justice Research Institute"]},
        "IRMCT":  {"acronyms": ["IRMCT"],  "names": ["International Residual Mechanism"]},
        "IIMP":   {"acronyms": ["IIMP"],   "names": ["Independent Institution on Missing Persons"]},
        "IIIM-Syria": {
            "acronyms": ["IIIM"],
            "names": ["International, Impartial and Independent Mechanism"],
        },
        # Broad UN-prefix catch-alls. Last in the UN bucket so earlier rules
        # give more specific attribution.
        "UN (generic prefix)": {
            "acronyms": ["UN"],
            "names": ["United Nations"],
        },
    },
    "Bretton Woods": {
        "IMF": {"acronyms": ["IMF"], "names": ["International Monetary Fund"]},
        "World Bank Group": {
            "acronyms": ["IBRD", "IDA", "MIGA", "ICSID"],
            "names": [
                "World Bank",
                "International Bank for Reconstruction and Development",
                "International Development Association",
                "Multilateral Investment Guarantee Agency",
                "International Centre for Settlement of Investment Disputes",
            ],
        },
        "IFC": {"acronyms": ["IFC"], "names": ["International Finance Corporation"]},
    },
    "Regional Development Banks": {
        "ADB":  {"acronyms": ["ADB"],  "names": ["Asian Development Bank"]},
        "AIIB": {"acronyms": ["AIIB"], "names": ["Asian Infrastructure Investment Bank"]},
        "AfDB": {"acronyms": ["AfDB"], "names": ["African Development Bank"]},
        "IDB":  {"acronyms": ["IDB"],
                 "names": ["Inter-American Development Bank", "Inter American Development Bank"]},
        "EBRD": {"acronyms": ["EBRD"],
                 "names": ["European Bank for Reconstruction and Development"]},
        "IsDB": {"acronyms": ["IsDB", "IDB Group"],
                 "names": ["Islamic Development Bank"]},
    },
    "European Union": {
        "Core institutions": {
            "acronyms": ["EU"],
            "names": [
                "European Commission",
                "European Union",
                "European Parliament",
                "European Council",
                "European Central Bank",
                "European Investment Bank",
                "European External Action Service",
            ],
        },
        "EU agencies": {
            "acronyms": [
                "EBA", "ECHA", "EFSA", "EIOPA", "EMA", "EMSA", "ESMA",
                "EASA", "ENISA", "EUAA", "EUDA", "EUSPA",
                "EUROPOL", "FRONTEX", "EUROJUST",
                "SESAR", "EU-LISA",
                "SRB",
                "EDA",
            ],
            "names": [
                "European Defence Agency",
                "European Banking Authority",
                "European Food Safety", "European Aviation Safety",
                "European Chemicals",
                "European Insurance And Occupational",
                "European Maritime Safety",
                "European Medicines", "European Securities",
                "European Border And Coast Guard", "European Police",
                "European Network And Information", "European Space",
                "European Union Agency", "European Union Drugs",
                "European Union Agency for Criminal Justice",
                "Single European Sky", "Single Resolution Board",
            ],
        },
    },
    "Other International Organisations": {
        "NATO":  {"acronyms": ["NATO"], "names": ["North Atlantic Treaty Organization"]},
        "OSCE":  {"acronyms": ["OSCE"],
                  "names": ["Organization for Security and Co-operation in Europe"]},
        "OECD":  {"acronyms": ["OECD"],
                  "names": ["Organisation for Economic Co-operation and Development"]},
        "WTO":   {"acronyms": ["WTO"], "names": ["World Trade Organization"]},
        "ESA":   {"acronyms": ["ESA"], "names": ["European Space Agency"]},
        "Council of Europe":      {"acronyms": [], "names": ["Council of Europe"]},
        "Commonwealth Secretariat": {"acronyms": [], "names": ["Commonwealth Secretariat"]},
        "ISA":   {"acronyms": ["ISA"], "names": ["International Seabed Authority"]},
    },
}

GROUP_ORDER: tuple[str, ...] = (
    "UN Common System",
    "Bretton Woods",
    "Regional Development Banks",
    "European Union",
    "Other International Organisations",
)


# Compile patterns. List of (group, bucket, acronym_regex_or_None, name_substring_or_None).
_ACRONYM_RES: list[tuple[str, str, re.Pattern[str]]] = []
_NAME_SUBSTRINGS: list[tuple[str, str, str]] = []

for group_name in GROUP_ORDER:
    group = SCOPE_GROUPS[group_name]
    for bucket_name, cfg in group.items():
        for acr in cfg.get("acronyms", []):
            body = re.escape(acr)
            pattern = re.compile(rf"\b{body}\b", re.IGNORECASE)
            _ACRONYM_RES.append((group_name, bucket_name, pattern))
        for name in cfg.get("names", []):
            _NAME_SUBSTRINGS.append((group_name, bucket_name, name.lower()))


def classify_scope(org: str) -> tuple[str | None, str | None, str | None]:
    """Return (scope_group, bucket, reason).

    - scope_group=str   : org matched. e.g. "UN Common System".
    - scope_group=None  : org not in any tracked group. Stays out of all aggregates.

    Earlier groups (UN first) win, so e.g. "OHCHR" attaches to UN rather
    than leaking into "Other" via a generic "Office of" rule.
    """
    if not org:
        return None, None, "no-match"
    o = org.lower()
    for group, bucket, pat in _ACRONYM_RES:
        if pat.search(org):
            return group, bucket, f"acronym:{pat.pattern}"
    for group, bucket, sub in _NAME_SUBSTRINGS:
        if sub in o:
            return group, bucket, f"name:{sub[:40]}"
    return None, None, "no-match"


def is_un_common_system(org: str) -> bool:
    """Backward-compat helper. True if org is in the UN Common System group."""
    return classify_scope(org)[0] == "UN Common System"


def whitelist_size() -> int:
    """Total entity buckets across all tracked groups (was UN-only count)."""
    return sum(len(g) for g in SCOPE_GROUPS.values())


def un_common_system_size() -> int:
    """Bucket count for the UN Common System group only."""
    return len(SCOPE_GROUPS["UN Common System"])
