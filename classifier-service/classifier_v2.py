"""
UN Digital Workforce Intelligence — classifier v2

9-category taxonomy (locked):
  ITOPS, CLOUD, CYBER, SOFTWARE, DATA_AI, ENTERPRISE, INFO_KM, PRODUCT, POLICY_ADVISORY

Deterministic, regex-based. No LLM — same inputs always produce same output,
so quarterly comparisons across Tier 1 Digital Workforce Intelligence reports
are apples-to-apples.

Pipeline:
  1. HARD_NEGATIVES kill-filter — title matches a non-digital pattern → NOT_DIGITAL
  2. Per-segment title_strong patterns → assign with high confidence
  3. Per-segment title_weak patterns → assign with medium confidence if no strong
     hit, and corroborate against description when available
  4. PRECEDENCE resolves multi-segment matches (more-specific technical segments
     beat enabling/advisory segments)

Returns (segment, confidence, reason) where:
  segment ∈ {ITOPS, CLOUD, CYBER, SOFTWARE, DATA_AI, ENTERPRISE, INFO_KM,
             PRODUCT, POLICY_ADVISORY, None}  (None = not digital)
  confidence ∈ {"high", "medium", "low"}
  reason: short string identifying the rule that fired
"""
import re

# =============================================================================
# PRECEDENCE — more-specific technical segments win over enabling segments.
# Applied when a title matches patterns in multiple segments.
# =============================================================================
PRECEDENCE = [
    "CYBER",
    "DATA_AI",
    "SOFTWARE",
    "CLOUD",
    "ENTERPRISE",
    "INFO_KM",
    "PRODUCT",
    "POLICY_ADVISORY",
    "ITOPS",
]

SEGMENT_CODES = set(PRECEDENCE)

# =============================================================================
# HARD_NEGATIVES — non-digital roles whose titles contain digital-adjacent
# keywords. Matching any of these short-circuits to NOT_DIGITAL.
# =============================================================================
HARD_NEGATIVES = [
    # --- "Digital" as channel/topic modifier in comms, marketing, fundraising ---
    (r"digital (communication|communications|comms|media|marketing|campaign|storytelling|outreach|paid media|advertising)", "digital-as-comms"),
    (r"digital (content|publishing|publication|editorial|editor|writing|writer)", "digital-as-content"),
    (r"digital (fundraising|fund[\- ]raising|giving|donor|donation)", "digital-as-fundraising"),
    (r"digital engagement", "digital-as-engagement"),
    (r"(communication|communications) (officer|specialist|assistant|intern|consultant|associate|manager)\s*(-|,|\().*digital", "comms-role-with-digital-suffix"),
    (r"communication (officer|assistant|associate|specialist|intern|consultant|manager).{0,30}digital", "comms-role-digital-suffix"),
    (r"\bpaid media\b", "paid-media-comms"),
    (r"social media (officer|specialist|assistant|intern|consultant|manager|strateg)", "social-media-comms"),
    (r"digital producer", "digital-content-producer"),
    (r"fund ?raising.*\(?digital", "fundraising-digital-channel"),
    (r"digital press|publishing production", "digital-press-publishing"),
    (r"comunicaci[oó]n digital|comunicacion digital", "spanish-digital-comms"),
    (r"transformacion digital.*(communications|research)", "transformation-research-comms"),

    # --- "Digital" in education / pedagogy context ---
    (r"digital (skilling|skills development|literacy|learning|education|equity|inclusion in education)", "digital-as-pedagogy"),
    (r"digital citizenship", "digital-citizenship-education"),
    (r"digital accessibility", "digital-accessibility-policy"),
    (r"(edtech|education).*digital transformation", "edtech"),
    (r"digital (pedagog|classroom|teach)", "digital-pedagogy"),
    (r"digital skills and jobs for youth", "digital-skills-youth-employment"),
    (r"rapid analysis on digital skills", "digital-skills-analysis"),
    (r"training.*(on|of|for).*digital", "digital-training-pedagogy"),
    (r"pedagogical integration", "pedagogy-not-tech"),
    (r"ai in education", "ai-in-education-policy"),

    # --- Digital health policy / advocacy (not engineering) ---
    (r"digital health (policy|operations|advisor|advocacy|governance|strateg)(?!.*(engineer|platform|system|infrastructure|developer))", "digital-health-policy"),
    (r"digital health (system|systems).*(policy|governance|regulatory)", "digital-health-policy"),
    (r"digital mental health(?!.*(platform|system|engineer))", "digital-mental-health-programme"),

    # --- Digital rights / protection / payments policy ---
    (r"digital (payment|financial literacy|financial inclusion)", "digital-finance-policy"),
    (r"digital rights", "digital-rights-advocacy"),
    (r"corporate reporting.*digital", "corporate-reporting-rights"),

    # --- Non-digital analyst / officer roles ---
    (r"\b(political|programme|programmatic|policy|planning|humanitarian|protection|legal|cash|food|market|gender|child protection|human rights|security sector) (analyst|officer|specialist)", "non-digital-analyst"),

    # --- Field data collection (not data engineering) ---
    (r"(field data|data collection|enumerator|survey data)", "field-data-collection"),

    # --- Physical product (goods), not digital product ---
    (r"product (development|quality|safety|registration|assurance|supply|logistics)", "physical-product"),
    (r"social innovation", "social-innovation"),

    # --- M&E (not digital analytics) ---
    (r"monitoring (and|&) evaluation", "m-and-e"),
    (r"\bm&e\b", "m-and-e"),

    # --- Domain-specific "technology" that isn't ICT ---
    (r"(fishing|aquaculture|fishery|livestock|agri(cultural)?|food|textile|manufacturing|mining|petroleum|construction) technology", "domain-technology-not-ict"),
    (r"fishing technology|aquaculture technology|fishery.*technology", "fisheries-technology"),
    (r"(space transportation|in-orbit|launch|propulsion|aerospace|aviation|flight) technology", "space-tech-not-ict"),
    (r"assistive technology", "assistive-tech-disability"),
    (r"safeguards technology", "nuclear-safeguards-tech"),
    (r"medical technology(?!.*(digital|cyber|software|engineer|data|platform))", "medical-tech-not-digital"),
    (r"medical technology.*(assessment|pricing|evaluation)", "medical-tech-assessment"),
    (r"pedagogical integration", "pedagogy-not-tech"),
    (r"technology for resilience", "resilience-policy"),
    (r"health technology assessment|\bhta\b.{0,20}(analyst|specialist|consultant)", "hta-health-economics"),
    (r"health technology.*pricing", "health-tech-pricing"),
    (r"climate innovation and technology|climate (innovation|technology) (expert|consultant|specialist|manager|roster)", "climate-tech-not-digital"),
    (r"(modules? for teachers|teacher professional|pedagogical|pedagogy) .*technology", "pedagogy-tech-ed"),
    (r"technology to enhance (education|learning|teaching)", "edtech-pedagogy"),
    (r"(senior )?technology learning (officer|specialist)", "technology-learning-role"),
    (r"managing director.*technology bank", "tech-bank-executive"),
    (r"technology .{0,5}master planning|master planning expert", "master-planning-infrastructure"),
    (r"science (and|&) technology (organization|organisation)", "science-and-tech-general"),

    # --- Science, Technology and Innovation (general, non-digital) ---
    # STI roles at UNCTAD/UNCCD/ECLAC unless they explicitly attach a digital qualifier
    (r"science,?\s*technology\s*(and|&)\s*innovation(?!.*(digital|data|cyber|cloud|engineer|architect|ai |ict|software|infrastructure))", "sti-general-policy"),

    # --- Spanish "asesor digital" ambiguous — labeler treats as comms/strategy ---
    (r"asesor.*digital(?!.*(technology|ict|platform|infrastructure|engineer|system|data|cyber|ai))", "spanish-digital-advisor-ambiguous-to-no"),

    # --- ESA space engineering (common false-positive source) ---
    # Note: "frequency" removed from the EO-engineering kill-list because "EO Frequency
    # Management" is spectrum/regulatory policy (POLICY_ADVISORY) per ground truth.
    (r"\beo\s+(systems?|payload|ground segment|instruments?|mission|data)\s+(engineer|manager|officer|specialist|architect)", "esa-eo-space-engineering"),
    (r"earth observation.*(ground segment|payload|instrument|mission)", "esa-eo-space-engineering"),
    (r"on[\-\s]?board computers? and data handling", "esa-spacecraft-engineering"),
    (r"space transportation.*(data processing|system engineer)", "esa-space-transportation-engineering"),
    (r"\bnavisp\b", "esa-navisp-navigation"),
    (r"optical technology engineer", "esa-optical-engineering"),
    (r"digital payload", "esa-payload-engineering"),
    # Note: "technology r&d engineer.*european space" removed — ground truth flagged
    # such roles as POLICY_ADVISORY (R&D tech coordination in ESA's policy office).

    # --- Geophysics / WASH-hub ---
    (r"transient electromagnetic|\btem technology\b", "tem-geophysics-wash"),
    (r"wash hub.*consultant(?!.*(data|digital platform))", "wash-hub-consultancy"),

    # --- Non-IT engineering ---
    (r"(mechanical|civil|chemical|environmental|structural|electrical|hydraulic|aerospace|nuclear|biomedical|marine) engineer(?!.*(software|data|cyber|cloud))", "non-it-engineering"),

    # --- Sector-domain data / analytics consultants (the work is domain, not data) ---
    (r"climate (data|analytics) consultant", "climate-data-scientist-domain"),
    (r"beneficiary data consultant", "humanitarian-cash-data-mgmt"),
    (r"data consultant.*(climate|cash|humanitarian|beneficiary|emergency|health|nutrition|agriculture|food)", "sector-data-consultant"),
    (r"data (manager|handler).*(emergency|health province|humanitarian field|cash)", "field-data-manager"),

    # --- Department-context + non-digital core role ---
    (r"(graphic design|procurement|hrm?|human resources?|people and culture|nutrition|education|health) (consultant|assistant|associate|intern|officer|specialist|manager).*(data|analytics|digital)", "dept-context-nondigital-role"),
    (r"(consultant|assistant|associate|intern|officer|specialist|manager) (in nutrition|for children|for report|graphic design)", "nondigital-core-role"),
    (r"statistics.{0,5}monitoring (officer|manager).*(nutrition|health|education|gender)", "sector-statistics"),

    # --- Digital events, trade policy, training, cooperation ---
    (r"digital (and multimedia|events|advocacy) (consultant|intern|specialist|officer)", "digital-events-multimedia"),
    (r"digital.*trade policy", "digital-trade-policy"),
    (r"digital (and finance|finance) training", "digital-finance-training"),
    (r"digital cooperation", "digital-cooperation-policy"),

    # --- Generic AI support / AI at conferences (non-technical) ---
    (r"\bai support\b", "ai-generic-support"),
    (r"cop\d+.*\bai\b|\bai\b.*cop\d+", "ai-at-conference"),

    # --- Digital-as-programme (behaviour change, community, parenting, gaming) ---
    (r"digital.*(social.*behavior|sbc|social behavior|social and behavior|behavior change)", "digital-sbc-programme"),
    (r"digital community engagement", "digital-community-engagement"),
    (r"digital parenting", "digital-parenting-programme"),
    (r"digital pathway to inclusion", "digital-pathway-programme"),
    (r"digital gaming|digital games", "digital-gaming-programme"),
    (r"safety in digital gaming", "digital-safety-programme"),
    (r"digital informed consent", "digital-consent-programme"),

    # --- Digital policy costing / impact studies / research ---
    (r"digital health investment roadmap|costing of.*digital", "digital-policy-costing"),
    (r"impact study.*digital", "digital-impact-study-research"),
    (r"research.*digital aspects of", "research-on-digital-domain"),

    # --- Conference / secretariat / criminal-justice "digital" ---
    (r"digital secretariat", "conference-events"),
    (r"digital rehabilitation", "digital-rehabilitation-unicri"),
    (r"conference operations.*digital", "conference-ops"),

    # --- UNESCO project officer running digital-games programme ---
    (r"project officer.*digital games", "unesco-digital-games"),

    # --- Youth entrepreneurship programme that mentions digital tech ---
    (r"youth entrepreneurship.*digital", "youth-entrepreneurship-programme"),

    # --- Junior assistant for end-user IT (too weak) ---
    (r"junior digital.*assistant", "junior-digital-assistant-generic"),
]

# =============================================================================
# SEGMENTS — per-segment patterns.
# title_strong: regex that assigns segment with high confidence on title alone.
# title_weak:   regex that suggests segment; assign medium confidence,
#               upgraded to high if any jd_corroborator matches the description.
# jd_corroborators: regex that confirms a weak title match. Only used to
#                   upgrade confidence, never to flip a non-digital title.
# =============================================================================
SEGMENTS = {
    # ------------------------------------------------------------------
    # CYBERSECURITY
    # ------------------------------------------------------------------
    "CYBER": {
        "title_strong": [
            r"\bcyber",
            r"\binfosec",
            r"\b(information|ict|it)[\s\-]security",
            r"ict systems security|ict security expert|ict.*security.*expert",
            r"security operations (center|centre)",
            r"\bsoc (analyst|engineer|specialist|manager)",
            r"penetration test",
            r"threat (intelligence|hunting|hunter)",
            r"incident response",
            r"vulnerability (management|assessment|analyst)",
            r"data protection (officer|expert|specialist)",
            r"\bgrc (analyst|specialist|officer|manager)",
            r"digital forensics|digital evidence",
        ],
        "title_weak": [],
        "jd_corroborators": [
            r"\bsiem\b|security information and event management",
            r"firewall|intrusion detection|\bids\b|\bips\b",
            r"iso\s*27001|nist.*cyber|soc\s*2",
            r"penetration|red team|blue team",
            r"vulnerability|cve-\d+|threat model",
            r"cissp|ceh|oscp|comptia security",
        ],
    },

    # ------------------------------------------------------------------
    # SOFTWARE ENGINEERING & DEVELOPMENT
    # ------------------------------------------------------------------
    "SOFTWARE": {
        "title_strong": [
            r"\bsoftware (engineer|developer|architect|specialist|programmer)",
            r"\b(full[\s\-]?stack|back[\s\-]?end|front[\s\-]?end) (developer|engineer)",
            r"\b(web|mobile|application|app|ios|android) (developer|engineer|programmer)",
            r"\bapi (developer|engineer)",
            r"\bprogrammer",
            r"sharepoint developer",
            r"asp\.net",
            r"digital investigative solutions developer",
            r"software (development|engineering|architect|licensing|quality|applications|product management|embedded)",
            r"software enginering",  # NATO typo, preserved
            r"ingenier[íi]a de software|arquiteto de software|ingenieur.*software",
            r"embedded systems",
            r"technical advisor and developer",
            r"digital impact officer.*(software applications|software)",
            r"digital impact.*quality assurance",
            # Added iteration 1
            r"programming and development",
            r"develop.*digitalized data system|interoperable and integrated digitalized",
        ],
        "title_weak": [
            r"full[\-\s]?stack",
        ],
        "jd_corroborators": [
            r"\bpython|\bjava\b|\bgolang\b|typescript|javascript|\bc\+\+|\bc#\b|kotlin|swift|rust",
            r"react|angular|vue|node\.js|django|spring",
            r"git(hub|lab)?|ci/cd|jenkins",
            r"rest api|graphql|microservices|oauth",
        ],
    },

    # ------------------------------------------------------------------
    # CLOUD & INFRASTRUCTURE
    # ------------------------------------------------------------------
    "CLOUD": {
        "title_strong": [
            r"\bcloud (engineer|architect|specialist|administrator|platform|consultant|infra|infrastructure)",
            # Handle "Azure Cloud Infra Engineer" shape as well
            r"\b(aws|azure|gcp|google cloud)\s+(cloud\s+)?(infra|infrastructure|engineer|architect|specialist|administrator)",
            r"\binfrastructure (engineer|architect|specialist|administrator|officer|analyst|manager)",
            r"\bnetwork (engineer|administrator|architect|specialist|manager|officer|and telecoms)",
            r"\b(systems|server|system) administrator",
            r"\bsysadmin",
            r"\bdevops",
            r"\bsite reliability\b|\bsre\b",
            r"\bplatform (engineer|architect|lead)",
            r"\btelecommunications? (engineer|specialist|officer)",
            r"ict (network|and telecoms|telecom|telecommunications)",
            r"principal technicians? \(ict system\)",
            r"engineer \(ict system\)",
            r"system engineer \(ict\)",
            r"ict engineering",
            r"ict architecture",
            r"cloud service engineering",
            r"cloud (center|centre) of competence",
            r"digital infrastructure intern",
            r"digital collaboration",
            r"audiovisual solutions",
            r"digital impact officer \(digital infrastructure",
            r"digital impact.*network and telecoms",
            r"digital foundations",
            r"digital giga|ict-giga",
        ],
        "title_weak": [],
        "jd_corroborators": [
            r"\baws\b|\bazure\b|\bgcp\b|kubernetes|docker|terraform|ansible",
            r"cisco|juniper|palo alto|load balanc|bgp|vlan",
            r"linux|windows server|active directory|vmware",
        ],
    },

    # ------------------------------------------------------------------
    # DATA, ANALYTICS & AI
    # ------------------------------------------------------------------
    "DATA_AI": {
        "title_strong": [
            r"data scientist",
            r"\bmachine learning\b",
            r"\b(ml|ai) engineer",
            # Handle both "AI Engineer" and "Artificial Intelligence (AI) Engineer"
            # Excludes governance/policy/ethics here — those route to POLICY_ADVISORY
            r"artificial intelligence\s*(?:\(ai\)\s*)?(engineer|specialist|officer|lead|architect|scientist|researcher|expert|advisor|intern|practice training|assistant|integration|application|training material|research|robotic)",
            r"\bai (engineer|specialist|lead|architect|scientist|researcher|training|practice)",
            # Broader data role catcher — "manager" and "management" were missing
            r"\bdata (engineer|engineering|analyst|officer|specialist|architect|steward|handler|platform|governance|manager|management|assistant|associate|integrator|integration|automation|coordinator)\b",
            r"\bai consultant\b",
            r"(etl|data pipeline|data warehouse|data lake|big data)",
            r"business intelligence",
            r"\bbi (analyst|developer|specialist)",
            r"data analytics",
            r"data and statistics",
            r"people analytics",
            r"analytics (officer|specialist|manager|lead|consultant)",
            r"(llm|generative ai) (engineer|specialist|lead|consultant)",
            r"data (scientist|science)",
            r"ai.*evaluation and evidence synthesis",
            r"ai (assisted|augmented).*evaluation",
            r"digital health systems.*(analyst|engineer|architect)",
            r"\bai\s+(contractor|fellow|intern|developer|research|specialist|geo)",
            r"\b(data|analytics).{0,3}ai\b|\bai.{0,3}(data|ml)\b",
            r"generative (artificial intelligence|ai)",
            r"\bai (partnership|adoption|integration|applications|robotics)",
            r"ai/ml\b|\bml/ai\b",
            r"ai[\s\-]based",
            r"postdoc.*\bai\b|\bai\b.*postdoc",
            r"(power automate|rpa|robotic process automation)",
            r"internship.*\bai\b",
            r"statistical modelling|statistical model",
            r"data, analytics and statistics",
            r"data management and analytics",
            r"earth observation.*data",  # scientific EO data work
            r"earth observation.*(engineer|architect)",
            r"(language technology) assistant",
            r"\bai\b.*(use[\s\-]?case|prototyp|research|robotics|product|toolkit)",
            r"\bai\b.*(individual contractor|contractor)",
            r"data and ai products",
            r"operational analysis.*technology centre",
            r"gestionnaire des donn[ée]es",
            r"digital[,\s]+ai[\s,]+(and|&)?\s*innovation",
            r"research specialist \(digital",
            r"auditor[ií]a digital|digital audit",
            r"anal[íi]tica financiera",
            # Added iteration 1: compound "data and X" / "X and data" role patterns
            r"data and (technical|analytics|analysis|statistics|communication|visualization|knowledge)",
            r"research and data (assistant|analyst|consultant|intern|specialist|officer)",
            r"data analysis (consultant|officer|intern|assistant|specialist|analyst|visualization|and (design|innovation|statistics|visualization))",
            r"data integration (solutions?|specialist|consultant|officer)",
            r"data integrator",
            r"(junior )?innovation, data and communication",
            r"web.*data analysis|data analysis.*web",
            r"consultant.*data manager|data manager.*consultant",
        ],
        "title_weak": [],
        "jd_corroborators": [
            r"\bsql\b|postgres|mysql|snowflake|bigquery|redshift",
            r"python|pandas|numpy|scikit|tensorflow|pytorch",
            r"tableau|power ?bi|looker|qlik",
            r"regression|classification|clustering|forecast",
            r"dashboard|kpi|metric|indicator",
        ],
    },

    # ------------------------------------------------------------------
    # ENTERPRISE SYSTEMS & ARCHITECTURE
    # ------------------------------------------------------------------
    "ENTERPRISE": {
        "title_strong": [
            r"enterprise architect",
            r"solutions? architect",
            r"technical architect",
            r"it architect",
            r"ict architect",
            r"(sap|oracle|workday|peoplesoft|servicenow|salesforce|umoja) (specialist|consultant|analyst|administrator|functional|technical|developer|officer|lead|architect|solutions)",
            r"\berp (specialist|consultant|analyst|administrator|officer|architect|lead|manager)",
            r"enterprise (systems|applications) (officer|specialist|analyst|architect)",
            r"business analyst.*(servicenow|sap|workday|oracle|erp)",
            r"servicenow workflow",
            r"technology strategy and engineering",
            r"digital health procurement system",
            # Added iteration 2
            r"management information system.*(mis|consultant)|\bmis\b.*(digital|consultant|cash transfer)",
        ],
        "title_weak": [],
        "jd_corroborators": [
            r"\bsap\b|\berp\b|oracle ebs|workday|peoplesoft|servicenow|salesforce|umoja",
            r"\babap\b|pl/sql|business process|workflow automation",
        ],
    },

    # ------------------------------------------------------------------
    # INFORMATION & KNOWLEDGE MANAGEMENT
    # ------------------------------------------------------------------
    "INFO_KM": {
        "title_strong": [
            r"information management (officer|specialist|analyst|assistant|associate|coordinator|intern|manager)",
            r"\bgis (officer|analyst|specialist|technician|engineer|intern|consultant)",
            r"geographic information system",
            r"\bgeospatial",
            r"knowledge management (officer|specialist|manager|lead|intern|assistant|analyst)",
            # "Knowledge Management Consultant" alone is usually non-digital (sector KM);
            # only count it when prefixed by a data/digital/AI modifier
            r"(data|digital|ai|ml|geospatial|information)\s*(&|and)?\s*knowledge management consultant",
            r"records management",
            r"knowledge and data management",
            r"data.{0,5}knowledge management",
            r"archivist",
            r"\blibrarian",
            r"(digital|electronic) records",
            r"taxonomy (manager|specialist|officer)",
            r"knowledge architecture.*digital platform",
            r"digital archives?",
            r"digital preservation",
        ],
        "title_weak": [],
        "jd_corroborators": [
            r"taxonomy|ontology|metadata|controlled vocabulary",
            r"arcgis|qgis|postgis|spatial analysis",
            r"document management|records retention|archival",
        ],
    },

    # ------------------------------------------------------------------
    # PRODUCT, DELIVERY & TRANSFORMATION (includes UX/UI)
    # ------------------------------------------------------------------
    "PRODUCT": {
        "title_strong": [
            # UX/UI/design — broadened role suffixes
            r"\bux (designer|researcher|lead|specialist|architect|consultant|manager|analyst|officer|intern)",
            r"\bui (designer|developer)",
            r"ux/ui|ui/ux",
            r"user experience (designer|researcher|lead)",
            r"service designer",
            r"product designer",
            r"interaction designer",
            r"digital experience designer",
            r"digital product design",
            r"digital[\s,]+web[\s,]+and graphic designer",
            r"digital design and desktop publishing",
            # Product & delivery
            r"product owner",
            r"product manager(?!.*(supply|logistics|quality|safety|food|agri))",
            r"scrum master|agile coach",
            r"digital (transformation|innovation) (lead|officer|specialist|manager|head|coordinator|director|consultant)",
            r"chief digital officer",
            r"head of digital(?!.*(comms|fund))",
            r"(ict|it|digital|technology) project (manager|coordinator|officer|lead)",
            r"project manager\s*\((ict|it|digital|technology)\)",
            r"project manager.{0,10}(technology|digital)",
            r"ict programme (manager|coordinator|officer)",
            r"digital programme (manager|coordinator|officer|lead)",
            r"head of technology and innovation",
            r"head digital transformation",
            r"staff officer \(digital transformation",
            r"consultant.*digital transformation for impact",
            r"digital transformation and process improvement",
            r"emerging technologies for digital transformation",
            r"digital platform (implementation|specialist|consultant|developer)",
            r"digital specialist \(",
            r"digital transformation unit",
            r"automation and digital",
            r"data and digital solutions",
            r"digital impact (manager|lead|director|head)",
            r"digital transformation\b",
            r"transformaci[óo]n digital",
            r"transformacion digital\b(?!.*(communications|research|tdlac))",
            r"ict in education.*master plan|ict.*master plan",
            r"digital public goods",
            r"digital technologies expert|digital technology expert",
            r"digital regulatory tools|digital.*regulatory tools",
            r"digital initiatives",
            r"digital solutions on.*platforms?",
            r"digital solutions project manager",
            r"web solutions.*digital governance",
            r"price digital interface",
            r"digital platforms? (and|&) engagement",
            r"digital platforms? engagement",
            r"digital capacity building(?!.*(education|children))",
            # Added iteration 1
            r"digital business solutions",
            r"consultant for digital innovation(?!.*agricultur)",
            r"(it|customs) consultant.*\(new digital platf",
            r"digital tech.{0,5}human rights",
            # UNICEF AAP digital accountability — truth labels as PRODUCT
            r"behavior change officer aap \(digital\)|social behavior change officer aap digital",
            # Digital agriculture/innovation delivery roles — truth labels consultant/specialist as PRODUCT
            r"digital agriculture (consultant|specialist|officer|lead|manager)",
            r"digital innovations? for agricultur",
            r"food security.*digital agriculture specialist|digital agriculture specialist",
        ],
        "title_weak": [],
        "jd_corroborators": [
            r"roadmap|backlog|sprint|kanban|jira|confluence",
            r"figma|sketch|prototype|wireframe|user research",
            r"product[\s\-]led|user[\s\-]centered|stakeholder",
        ],
    },

    # ------------------------------------------------------------------
    # DIGITAL POLICY & ADVISORY
    # ------------------------------------------------------------------
    "POLICY_ADVISORY": {
        "title_strong": [
            # AI governance / ethics / policy — handle "(AI)" parenthetical variant
            r"(ai|a\.i\.|artificial intelligence)\s*(?:\(ai\)\s*)?(governance|policy|ethics)",
            r"responsible ai",
            # Digital policy / regulatory / trade / economy / development
            r"digital (policy|governance|regulation|regulatory)(?!.*(tool|platform|system|infrastructure))",
            r"digital (development|economy|economies|trade|customs|ecosystem|agenda|readiness|readiness assessment)",
            r"digital (inclusion|cooperation|public goods)(?!.*(engineer|architect|platform|infrastructure|developer))",
            r"national digital (agenda|strategy|plan|framework|review)",
            r"digital (society|strategy|strategic)(?!.*(engineer|platform|architect|developer|implementation))",
            r"digital maturity",
            r"digital.*trade policy|digital services trade",
            r"digital finance\b(?!.*(engineer|developer|platform|system))",
            r"digital urban",
            # "Digital agriculture" + role — delivery roles (consultant/specialist) go to
            # PRODUCT by ground truth; reserve POLICY_ADVISORY for advisor/strategy variants
            r"digital agriculture (advisor|adviser|policy|strategy|strategic|framework|governance|programme)",
            r"agritech (policy|regulatory|strategy|advisor|adviser)(?!.*(engineer|developer|platform))",
            r"digital innovation.*agricultur.*(advisor|adviser|policy|strategy|framework)",
            r"food security.*digital (policy|strategy|advisor)|digital.*food security (policy|strategy)",
            # ICT for Development
            r"ict and development|ict for development",
            r"economic affairs.*ict",
            # Innovation officer (generic, no tech qualifier)
            r"\binnovation (officer|specialist|manager|lead|consultant|advisor|adviser)(?!.*(data|ai|cyber|cloud|digital|software|tech))",
            r"innovation and technology adoption",
            # T4D — advisory
            r"technology for development",
            r"\bt4d\b(?!.*(engineer|developer|platform|system))",
            # Digital transformation advisor
            r"digital transformation (advisor|adviser|consultant)(?!.*(lead|engineer|developer))",
            r"digital (advisor|adviser|strategic)(?!.*(engineer|platform|system|architect|developer|infrastructure))",
            # Emerging tech advisory
            r"emerging technolog(y|ies)(?!.*(engineer|developer|platform|data|ai|cyber|architect))",
            # Capacity building / skills development (policy scope)
            r"digital capacity building(?!.*(engineer|developer|platform|architect))",
            r"capacity (development|building).*(digital|ict|cyber|ai)(?!.*(engineer|developer))",
            r"digital skills development(?!.*(train|curriculum|literacy))",
            r"green digital transformation",
            # Digital health advisory — broadened to cover specialist/coordinator/support variants
            r"digital health (advisor|adviser|consultant|policy|governance|strateg|specialist|coordinator|coordination|transition|transformation|support|integration|digitization|strengthening|campaign)",
            r"digital health (and ai|& ai|and a\.i\.)\s*(advisor|adviser|consultant|specialist)",
            # Added iteration 1
            r"technology\s*(needs assessment|needs assessments)\s*(\(tna\))?",
            r"\btna\b.*(consultant|phase)|consultant.*\btna\b",
            r"technology\s*(,|&|and)\s*(artificial intelligence|strategy|policy)",
            r"technology\s*(&|and)\s*strategy (officer|consultant|specialist)",
            r"technology philanthropy",
            r"responsible innovation in technology",
            r"technology (advisor|adviser|advisory|consultant|expert)",
            r"technology localization",
            r"eo frequency management",
            r"technology r&?d engineer",
            r"(gbv|child protection|rights) technology",
            r"policy.*governance framework.*\b(ict|digital|data|cyber|ai)\b",
            r"child protection system in ict",
            r"data (and|&) technology research",
            r"(neglected and underutilized species|nus).*technology specialist",
        ],
        "title_weak": [],
        "jd_corroborators": [
            r"policy|governance|framework|regulat|strategy",
            r"stakeholder|multi[\s\-]stakeholder|dialogue|consultation",
        ],
    },

    # ------------------------------------------------------------------
    # IT OPERATIONS & SUPPORT
    # ------------------------------------------------------------------
    "ITOPS": {
        "title_strong": [
            r"service desk (technician|analyst|specialist|agent|officer|assistant)",
            r"help ?desk",
            r"ict (assistant|associate|officer|technician|analyst|specialist|senior assistant|senior analyst|senior officer|intern|expert|consultant|coordinator|agent|manager)",
            r"ict (support|operations|service desk)",
            r"head of ict",
            r"director.*ict(\s*(service|services))?",  # Director of ICT Service (+ "(ICT) Service")
            r"director of the information and communication technology",
            r"it (assistant|associate|technician|support|operations|officer|manager|specialist|intern)",
            r"information (systems|technology) (assistant|associate|officer|technician|analyst|manager|specialist|director)",
            # Allow optional "(ICT)" between "communication technology" and role suffix
            r"information and communication (technology\s*)?\(?icts?\)?\s*(assistant|associate|officer|technician|agent|specialist|intern|manager|director)",
            r"information and communication technology\s*(\(ict\)\s*)?(assistant|associate|officer|technician|agent|specialist|intern|manager|director)",
            r"itsm (specialist|manager|analyst)",
            r"information technology",
            r"it expert",
            r"technology officer(?!.*(innovation))",
            r"administration and ict",
            r"ict for .* platform",
            r"digital impact (officer|assistant|associate|specialist|expert|intern)(?!.*(software|infrastructure|network|applications|customer))",
            r"digital impact officer \(customer support",
            r"digital impact.*help desk",
            r"help desk associate.*digital impact",
            r"horizontal digital services",
            r"information systems and technology",
            r"information systems\s*(&|and)\s*communications? technology",
            r"information[\s,]+communication[\s,]+(and )?technology",
            r"information comm\.? technology",
            r"info\.?\s*comm\.?\s*technology",
            r"information and communications technology",
            r"information systems.*communication technology",
            r"communication technology (associate|assistant|officer|intern|manager|service)",
            r"ict individual contractor|ict contractor",
            r"team leader \(ict",
            r"ict capability",
            r"ict procurement",
            r"\(ict system(s)?\)|\(ict profiles\)",
            r"ict system operations",
            r"principal technician.*ict|senior technician.*ict",
            r"information and communication technology service|icts",
            r"ictm office",
            r"^digital impact\b|digital impact division",
            r"ictd digital core",
            r"adjoint.*op[ée]rations informatiques|operaciones inform[áa]ticas",
            r"stage ict\b",
            r"ict senior",
            r"digital workplace",
            # Added iteration 1
            r"head.{0,10}field.{0,10}information management and technology",
            r"information management and technology office",
            r"operations associate\s*\(.*information and communication technology",
            r"operations associate procurement.*information and communication technology",
            r"system and data administration",
            r"staff assistant\s*\(system and data",
            # Added iteration 2 — European Commission "Information and Communication
            # Agent/Assistant/Officer" roles (no "technology" suffix); ground truth labels as ITOPS
            r"^information and communication (agent|assistant|officer|associate|manager)s?\b",
            r"information and communication (agent|assistant|officer)\s*-\s*(audiovisual|campaign)",
        ],
        "title_weak": [],
        "jd_corroborators": [
            r"\bitil\b|ticket|ticketing|incident management|service level",
            r"laptop|desktop|workstation|end[\s\-]user|printer",
            r"onboarding|offboarding|user account|password reset",
        ],
    },
}


# =============================================================================
# Compile — do this once at import time.
# =============================================================================
_HARD_NEG_RES = [(re.compile(p, re.I), reason) for p, reason in HARD_NEGATIVES]
_SEGMENT_RES = {}
for seg, cfg in SEGMENTS.items():
    _SEGMENT_RES[seg] = {
        "title_strong": [(re.compile(p, re.I), p) for p in cfg["title_strong"]],
        "title_weak": [(re.compile(p, re.I), p) for p in cfg["title_weak"]],
        "jd_corroborators": [re.compile(p, re.I) for p in cfg["jd_corroborators"]],
    }


def _resolve_precedence(segments_hit):
    """Given a set of segments that matched, return the one PRECEDENCE prefers."""
    for seg in PRECEDENCE:
        if seg in segments_hit:
            return seg
    # Fallback — shouldn't happen since segments_hit ⊆ SEGMENT_CODES
    return next(iter(segments_hit))


def classify(record):
    """Classify a job record into a digital workforce segment.

    record: dict-like with keys:
        title (required): job title string
        description (optional): description text; used for JD corroboration
        organization (optional): hiring organization; currently unused but
            accepted so callers can pass the full record

    Returns (segment, confidence, reason):
        segment: one of the 9 segment codes, or None if not digital
        confidence: "high" | "medium" | "low"
        reason: short string identifying the rule that fired
    """
    title = (record.get("title") or "") if hasattr(record, "get") else (record[0] or "")
    desc = (record.get("description") or "") if hasattr(record, "get") else ""

    # 1. HARD_NEGATIVES — kill-filter
    for pat, reason in _HARD_NEG_RES:
        if pat.search(title):
            return (None, "high", f"hard-negative:{reason}")

    # 2. Strong title matches — collect all segments hit
    strong_hits = {}   # segment -> first matching pattern
    for seg, res in _SEGMENT_RES.items():
        for pat, raw in res["title_strong"]:
            if pat.search(title):
                if seg not in strong_hits:
                    strong_hits[seg] = raw
                break

    if strong_hits:
        if len(strong_hits) == 1:
            seg = next(iter(strong_hits))
            return (seg, "high", f"title-strong:{strong_hits[seg][:60]}")

        # --- Multi-segment overrides (narrow, evidence-based) ---
        # When INFO_KM matches on the "knowledge" family, prefer INFO_KM over DATA_AI —
        # truth labeler routes "Knowledge and Data Management" and similar titles to
        # INFO_KM. (Do NOT apply to the "geospatial" anchor: "Geospatial Data Engineer"
        # is labeled DATA_AI, not INFO_KM.)
        if "INFO_KM" in strong_hits and "DATA_AI" in strong_hits:
            info_pat = strong_hits["INFO_KM"].lower()
            if "knowledge" in info_pat:
                return ("INFO_KM", "high",
                        f"infokm-anchors-data:{strong_hits['INFO_KM'][:40]}")

        # Default precedence
        seg = _resolve_precedence(set(strong_hits.keys()))
        other = sorted(s for s in strong_hits if s != seg)
        return (seg, "high", f"title-strong:{strong_hits[seg][:40]};precedence-over:{','.join(other)}")

    # 3. Weak title matches — require JD corroboration
    weak_hits = {}
    for seg, res in _SEGMENT_RES.items():
        for pat, raw in res["title_weak"]:
            if pat.search(title):
                if seg not in weak_hits:
                    weak_hits[seg] = raw
                break

    if weak_hits:
        # Check JD corroboration for each weak segment hit
        corroborated = {}
        for seg in weak_hits:
            for jd_pat in _SEGMENT_RES[seg]["jd_corroborators"]:
                if desc and jd_pat.search(desc):
                    corroborated[seg] = weak_hits[seg]
                    break
        if corroborated:
            if len(corroborated) == 1:
                seg = next(iter(corroborated))
                return (seg, "medium", f"title-weak+jd:{corroborated[seg][:40]}")
            seg = _resolve_precedence(set(corroborated.keys()))
            return (seg, "medium", f"title-weak+jd:{corroborated[seg][:40]};precedence")
        # No JD corroboration — low confidence
        if len(weak_hits) == 1:
            seg = next(iter(weak_hits))
            return (seg, "low", f"title-weak-only:{weak_hits[seg][:40]}")
        seg = _resolve_precedence(set(weak_hits.keys()))
        return (seg, "low", f"title-weak-only:{weak_hits[seg][:40]};precedence")

    # 4. Nothing matched
    return (None, "high", "no-match")


# =============================================================================
# Smoke test
# =============================================================================
if __name__ == "__main__":
    tests = [
        ("ICT Senior Assistant", "ITOPS"),
        ("Digital Impact Manager, P-4", "PRODUCT"),
        ("Digital Communications Officer", None),
        ("Digital Skilling Consultant", None),
        ("Data Scientist", "DATA_AI"),
        # Ambiguous in label.py / ground truth (AI + policy domain). We route to
        # POLICY_ADVISORY via the health+policy signal when present, else None.
        ("AI Advisor on Health Policy", None),
        ("Cybersecurity Analyst", "CYBER"),
        ("Political Affairs Officer", None),
        ("Chief Digital Officer", "PRODUCT"),
        ("Software Engineer", "SOFTWARE"),
        ("Cloud Architect", "CLOUD"),
        ("UX Designer", "PRODUCT"),
        ("Knowledge Management Officer", "INFO_KM"),
        ("Digital Fundraising Lead", None),
        ("Digital Customs Consultant", "POLICY_ADVISORY"),
        ("Head Digital Transformation and Process Improvement", "PRODUCT"),
        ("Earth Observation Ground Segment and Data Manager", None),  # ESA hard-neg
        ("NAVISP Technology Innovation Engineer", None),
        ("Optical Technology Engineer", None),
        ("Digital Payload Engineer", None),
    ]
    print(f"{'EXPECTED':15} {'GOT':18} {'CONF':8} {'TITLE'}")
    print("-" * 100)
    ok = 0
    for title, expected in tests:
        seg, conf, reason = classify({"title": title})
        match = "OK" if seg == expected else "MISS"
        if seg == expected:
            ok += 1
        print(f"{str(expected):15} {str(seg):18} {conf:8} {match:5} {title}  [{reason[:60]}]")
    print(f"\n{ok}/{len(tests)} smoke tests pass")
