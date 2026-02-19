import {
  BookOpen,
  Microscope,
  ShieldCheck,
  Lock,
  Zap,
  FileSearch,
  Pill,
  Activity,
  FlaskConical,
  BarChart3,
  Dna,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features",     href: "#features"     },
  { label: "Security",     href: "#security"     },
  { label: "FAQ",          href: "#faq"          },
];

export const STATS = [
  { value: "6",      label: "Pharmacogenes"       },
  { value: "10",     label: "CPIC drug–gene pairs" },
  { value: "50+",    label: "Variant diplotypes"   },
  { value: "Tier 1A", label: "CPIC evidence level" },
];

export const TRUST_ITEMS = [
  { icon: BookOpen,    label: "CPIC Tier 1A Guidelines"          },
  { icon: Microscope,  label: "Peer-reviewed evidence base"      },
  { icon: ShieldCheck, label: "Deterministic risk classification" },
  { icon: Lock,        label: "Client-side genomic parsing"      },
  { icon: Zap,         label: "Zero data retention"              },
];

export const STEPS = [
  {
    icon: FileSearch,
    step: "01",
    title: "Ingest Genomic Variants",
    body:  "Upload a patient VCF file. All variant extraction and star-allele resolution occurs entirely in the browser — no genomic data is transmitted, logged, or stored.",
  },
  {
    icon: Pill,
    step: "02",
    title: "Define Drug Panel",
    body:  "Select from ten CPIC-validated drug–gene interactions spanning pain management, cardiovascular, gastrointestinal, immunosuppressive, and oncology pharmacotherapy.",
  },
  {
    icon: Activity,
    step: "03",
    title: "Generate Risk Assessment",
    body:  "Receive deterministic risk classifications (Safe, Adjust Dosage, Toxic, Ineffective), diplotype-level confidence scores, and AI-narrated clinical mechanism explanations.",
  },
];

export const FEATURES: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
  featured?: boolean;
}[] = [
  {
    icon:  ShieldCheck,
    title: "Deterministic CPIC Classification",
    body:  "Risk labels are resolved through direct lookup against CPIC diplotype–phenotype–risk tables. No probabilistic model, no inference — fully auditable decision logic.",
    featured: true,
  },
  {
    icon:  FlaskConical,
    title: "Explainable AI Narration",
    body:  "Each classification is accompanied by an AI-generated clinical explanation citing the patient's specific rsID, diplotype, and metabolizer phenotype — grounded in CPIC evidence.",
    featured: true,
  },
  {
    icon:  Zap,
    title: "Parallel Multi-Drug Analysis",
    body:  "Evaluate up to ten drug–gene interactions per patient in a single session. Each drug is processed independently for progressive, low-latency result delivery.",
  },
  {
    icon:  BarChart3,
    title: "Diplotype Confidence Scoring",
    body:  "Every classification reports genotype confidence: 95% for fully resolved diplotypes, 70% for single-allele inference, flagged explicitly when data is incomplete.",
  },
  {
    icon:  Lock,
    title: "Client-Side Genomic Processing",
    body:  "VCF variant extraction executes entirely in the browser via the FileReader API. No genomic data is transmitted to, processed on, or retained by any server.",
  },
  {
    icon:  Dna,
    title: "Guideline-Aligned Alternatives",
    body:  "When a drug is classified as Toxic or Ineffective, the system surfaces pharmacogenomically appropriate therapeutic alternatives consistent with CPIC guidance.",
  },
];

export const TESTIMONIALS = [
  {
    quote:  "For a pharmacogenomics decision-support workflow, having a tool that cites the actual CPIC recommendation and explains the mechanism is genuinely useful. We use it as a rapid sanity check before deeper review.",
    name:   "Dr. A. Patel",
    role:   "Clinical Pharmacologist",
    org:    "Academic Medical Center",
    rating: 5,
  },
  {
    quote:  "The multi-drug batch report is what sets this apart. One upload, one report, six drugs. The confidence scoring is also a thoughtful touch — it tells you how much to trust each result.",
    name:   "R. Huang",
    role:   "Clinical Pharmacist",
    org:    "Regional Health System",
    rating: 5,
  },
  {
    quote:  "Clean, fast, and the AI explanations are appropriately conservative. It doesn't overclaim. It gives you the mechanism, the evidence base, and a clear recommendation. Exactly what this workflow needs.",
    name:   "S. Okonkwo",
    role:   "Oncology Clinical Specialist",
    org:    "Cancer Treatment Center",
    rating: 5,
  },
  {
    quote:  "The confidence score is a subtle but crucial feature. Knowing whether we're working with a full diplotype or a partial call changes how we weight the recommendation during rounds.",
    name:   "Dr. M. Reyes",
    role:   "Clinical Geneticist",
    org:    "University Hospital Network",
    rating: 5,
  },
  {
    quote:  "Finally a pharmacogenomics tool that doesn't overclaim. The CPIC classification stays transparent, and the AI narration adds clinical context without introducing hallucination risk.",
    name:   "J. Williams",
    role:   "PGx Program Coordinator",
    org:    "Precision Medicine Institute",
    rating: 5,
  },
  {
    quote:  "We piloted this for pre-admission oncology patients. Batch analysis across six drugs in a single upload significantly cut our pre-prescribing review time and reduced cognitive load.",
    name:   "Dr. L. Chen",
    role:   "Hospital Clinical Pharmacist",
    org:    "Regional Oncology Center",
    rating: 5,
  },
];

export const FAQS = [
  {
    q: "What is pharmacogenomics?",
    a: "Pharmacogenomics studies how a person's genes affect their response to drugs. Because enzymes encoded by specific genes metabolize medications, genetic variants can cause the same drug at the same dose to be safe for one patient and dangerous for another. PharmaGuard uses this science to flag risk before prescribing.",
  },
  {
    q: "What is a VCF file?",
    a: "A VCF (Variant Call Format) file is a standard text format that lists where a patient's DNA differs from the reference genome. It's produced by genetic sequencing labs and contains the variant data PharmaGuard needs to perform pharmacogenomic analysis. The file is parsed locally in your browser.",
  },
  {
    q: "How accurate are the risk predictions?",
    a: "Risk classifications are deterministic — they come directly from CPIC lookup tables, not from a model that can hallucinate. If both alleles are detected in the VCF, confidence is 95%. If only one allele is found, confidence is 70%. Missing data is flagged explicitly with an Unknown result rather than guessed.",
  },
  {
    q: "Does PharmaGuard store or transmit my patient's genetic data?",
    a: "No. VCF parsing happens entirely in your browser using the FileReader API. The raw file is never uploaded. Only a compact JSON summary of the detected variants is sent to the analysis API to compute the risk assessment. No patient data is retained after the session.",
  },
  {
    q: "Which drugs and genes are currently supported?",
    a: "PharmaGuard covers ten drug–gene pairs across six genes: Codeine and Tramadol (CYP2D6), Warfarin and Celecoxib (CYP2C9), Clopidogrel and Omeprazole (CYP2C19), Simvastatin (SLCO1B1), Azathioprine (TPMT), and Fluorouracil and Capecitabine (DPYD). These cover the most clinically actionable CPIC Tier 1A recommendations.",
  },
  {
    q: "Is PharmaGuard a diagnostic tool?",
    a: "No. PharmaGuard is a clinical decision support tool built for research and clinical workflows. It is not a regulated medical device or diagnostic product. All outputs should be reviewed by a qualified clinician or pharmacist alongside other patient information before any prescribing decision is made.",
  },
];

export const FOOTER_LINKS = {
  Product: [
    { label: "Analyze Patient", href: "/analyze" },
    { label: "How It Works",   href: "#how-it-works" },
    { label: "Features",       href: "#features" },
    { label: "FAQ",            href: "#faq" },
  ],
  Science: [
    { label: "CPIC Guidelines",      href: "https://cpicpgx.org", external: true },
    { label: "CYP2D6 (Codeine)",     href: "#" },
    { label: "CYP2C9 (Warfarin)",    href: "#" },
    { label: "DPYD (Fluorouracil)",  href: "#" },
  ],
  Legal: [
    { label: "Research Use Only", href: "#" },
    { label: "Privacy Notice",    href: "#" },
    { label: "Terms of Use",      href: "#" },
    { label: "RIFT 2026",         href: "#" },
  ],
};
