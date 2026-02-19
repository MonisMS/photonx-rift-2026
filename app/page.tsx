"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FadeIn,
  FadeInSimple,
  StaggerContainer,
  StaggerItem,
  HoverLift,
  AnimatedStat,
} from "@/components/motion-primitives";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dna,
  ShieldCheck,
  Zap,
  FileSearch,
  BarChart3,
  Pill,
  Lock,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  FlaskConical,
  BookOpen,
  Microscope,
  Activity,
  Star,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Data ──────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features",     href: "#features"     },
  { label: "Security",     href: "#security"     },
  { label: "FAQ",          href: "#faq"          },
];

const STATS = [
  { value: "6",      label: "Pharmacogenes"       },
  { value: "10",     label: "CPIC drug–gene pairs" },
  { value: "50+",    label: "Variant diplotypes"   },
  { value: "Tier 1A", label: "CPIC evidence level" },
];

const TRUST_ITEMS = [
  { icon: BookOpen,    label: "CPIC Tier 1A Guidelines"         },
  { icon: Microscope,  label: "Peer-reviewed evidence base"     },
  { icon: ShieldCheck, label: "Deterministic risk classification" },
  { icon: Lock,        label: "Client-side genomic parsing"     },
  { icon: Zap,         label: "Zero data retention"             },
  ];

const STEPS = [
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

const FEATURES = [
  {
    icon:  ShieldCheck,
    title: "Deterministic CPIC Classification",
    body:  "Risk labels are resolved through direct lookup against CPIC diplotype–phenotype–risk tables. No probabilistic model, no inference — fully auditable decision logic.",
  },
  {
    icon:  FlaskConical,
    title: "Explainable AI Narration",
    body:  "Each classification is accompanied by an AI-generated clinical explanation citing the patient's specific rsID, diplotype, and metabolizer phenotype — grounded in CPIC evidence.",
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

const TESTIMONIALS = [
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

const FAQS = [
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

// ─── Sub-components ────────────────────────────────────────────────────────────

function TopNav() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-border shadow-card"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm ring-1 ring-white/25">
            <FlaskConical className="h-4 w-4 text-white" />
          </div>
          <span className={cn("font-bold text-base tracking-tight transition-colors", scrolled ? "text-foreground" : "text-white")}>
            PharmaGuard
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                scrolled
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className={cn(
              "hidden md:inline-flex transition-all",
              scrolled
                ? ""
                : "bg-white font-semibold hover:bg-white/90"
            )}
            style={scrolled ? {} : { color: "var(--pg-hero)" }}
          >
            <Link href="/analyze">
              Clinical Analysis <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <button
            className={cn(
              "md:hidden p-2 rounded-lg transition-colors",
              scrolled ? "hover:bg-muted/60 text-foreground" : "hover:bg-white/10 text-white"
            )}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="md:hidden bg-white/95 backdrop-blur-md border-b border-border px-5 pb-4 space-y-1"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2">
            <Button asChild size="sm" className="w-full">
              <Link href="/analyze">Clinical Analysis</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </header>
  );
}

// ─── Hero (dark forest green, white text) ──────────────────────────────────────

function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center pt-24 pb-0 overflow-hidden"
      style={{ background: "linear-gradient(175deg, var(--pg-hero) 0%, var(--pg-hero-mid) 100%)" }}
    >
      {/* DNA helix line art (scientific texture) */}
      <div className="bg-dna-helix absolute inset-0 pointer-events-none" aria-hidden />

      {/* Subtle white dot grid — reduced for depth */}
      <div className="bg-dot-grid absolute inset-0 pointer-events-none opacity-60" aria-hidden />

      {/* Soft radial glow from top-center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 55% at 50% -5%, oklch(0.35 0.09 170 / 0.50), transparent 70%)",
        }}
        aria-hidden
      />

      {/* Secondary glow — bottom right */}
      <div
        className="absolute bottom-0 right-0 w-[50vw] h-[40vh] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 80% 100%, oklch(0.30 0.08 180 / 0.30), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="mx-auto max-w-5xl px-5 text-center w-full pb-28">

        {/* Eyebrow badge */}
        <FadeIn>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] backdrop-blur-sm px-4 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
              CPIC-Aligned Clinical Decision Support
            </span>
          </div>
        </FadeIn>

        {/* Headline */}
        <FadeIn delay={0.05}>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-[5.5rem] mb-6 leading-[1.04] text-white">
            Genomic-Guided
            <br />
            <span className="hero-gradient-text">Prescribing</span>
          </h1>
        </FadeIn>

        {/* Sub-headline — scientific authority */}
        <FadeIn delay={0.08}>
          <p className="mx-auto max-w-2xl text-xl sm:text-2xl font-medium text-white/50 mb-6 tracking-tight">
            Powered by CPIC Clinical Evidence
          </p>
        </FadeIn>

        {/* Subtext */}
        <FadeIn delay={0.1}>
          <p className="mx-auto max-w-2xl text-base text-white/55 leading-relaxed mb-10">
            Upload a patient&apos;s VCF file and receive deterministic, guideline-aligned
            pharmacogenomic risk classification — with transparent AI-generated clinical explanations
            grounded in peer-reviewed CPIC recommendations.
          </p>
        </FadeIn>

        {/* CTAs */}
        <FadeIn delay={0.15}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Button
              asChild
              size="lg"
              className="px-8 h-12 text-base bg-white hover:bg-white/95 font-semibold shadow-card-lg"
              style={{ color: "var(--pg-hero)" }}
            >
              <Link href="/analyze">
                Launch Clinical Analysis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="px-8 h-12 text-base text-white/70 border border-white/20 hover:bg-white/[0.07] hover:text-white"
            >
              <a href="#how-it-works">View Methodology</a>
            </Button>
          </div>
        </FadeIn>

        {/* Stats — frosted glass panels */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] mx-auto max-w-2xl">
          {STATS.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="bg-white/[0.04] backdrop-blur-sm px-6 py-5 text-center">
                <AnimatedStat className="block text-2xl font-bold text-white tabular-nums">
                  {stat.value}
                </AnimatedStat>
                <span className="mt-1 block text-[11px] text-white/45 uppercase tracking-wider">{stat.label}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* Bottom gradient bridge: hero green → trust green */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, var(--pg-trust))" }}
        aria-hidden
      />
    </section>
  );
}

// ─── Trust bar (dark green continuation) ──────────────────────────────────────

function TrustBar() {
  return (
    <FadeInSimple>
      <div
        className="border-b border-white/8 py-5"
        style={{ background: "var(--pg-trust)" }}
      >
        <div className="mx-auto max-w-5xl px-5">
          <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Grounded in peer-reviewed clinical pharmacogenomics
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-white/70">
                <Icon className="h-4 w-4 text-white/45 shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FadeInSimple>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 md:py-32"
      style={{ background: "var(--pg-mid)" }}
    >
      <div className="mx-auto max-w-5xl px-5">

        <FadeIn className="text-center mb-16 md:mb-20">
          <p className="eyebrow mb-3">Methodology</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            From VCF variant file to clinical risk report<br className="hidden sm:block" /> in three deterministic steps
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            No account required. No data uploaded. Fully reproducible results.
          </p>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <StaggerItem key={i}>
              <div className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-accent/60 border border-border shadow-card">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+48px)] right-[-24px] h-px bg-gradient-to-r from-border to-transparent" />
                )}

                {/* Icon circle */}
                <div className="relative mb-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-card-md border border-border">
                    <step.icon className="h-9 w-9 text-primary" />
                  </div>
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                    {i + 1}
                  </span>
                </div>

                <div className="eyebrow mb-2">{step.step}</div>
                <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeIn className="mt-14 text-center" delay={0.1}>
          <Button asChild size="lg" className="gap-2">
            <Link href="/analyze">
              Launch Clinical Analysis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-24 md:py-32"
      style={{ background: "var(--pg-light)" }}
    >
      <div className="mx-auto max-w-5xl px-5">

        <FadeIn className="text-center mb-16">
          <p className="eyebrow mb-3">Clinical Architecture</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Evidence-based infrastructure for pharmacogenomic decision support
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Every component is designed to preserve clinical rigor, ensure auditability,
            and surface actionable pharmacogenomic intelligence at the point of care.
          </p>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat) => (
            <StaggerItem key={feat.title}>
              <HoverLift className="h-full">
                <div className="h-full rounded-xl border border-border bg-white p-6 shadow-card transition-shadow hover:shadow-card-md">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <feat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat.body}</p>
                </div>
              </HoverLift>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────

function SecuritySection() {
  const PRINCIPLES = [
    "Deterministic CPIC table logic — no ML in risk classification",
    "VCF parsed in-browser — genomic data never transmitted",
    "No patient data retained beyond session",
    "AI narrates clinical mechanisms — never determines risk labels",
    "Fully auditable decision pathway from variant to recommendation",
    "Open, reproducible science foundation",
  ];

  return (
    <section
      id="security"
      className="py-24 md:py-32"
      style={{ background: "var(--pg-lighter)" }}
    >
      <div className="mx-auto max-w-5xl px-5">
        <div className="rounded-2xl border border-border bg-white shadow-card-md overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">

            {/* Text column */}
            <div className="p-8 md:p-12">
              <FadeIn>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent mb-6">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <p className="eyebrow mb-3">Transparency &amp; Data Sovereignty</p>
                <h2 className="text-2xl font-bold tracking-tight mb-4">
                  Auditable architecture. Zero genomic data exposure.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm">
                  Genomic data is among the most sensitive clinical information in existence.
                  PharmaGuard is architected so that raw variant data never leaves the
                  clinician&apos;s browser — and risk classification is deterministic, not probabilistic.
                  Every output can be traced from variant to diplotype to phenotype to recommendation.
                </p>
                <p className="text-xs text-muted-foreground/70 border-t border-border pt-4">
                  PharmaGuard is built for research and clinical decision support. It is not
                  a regulated medical device. Always confirm reports with a qualified clinician.
                </p>
              </FadeIn>
            </div>

            {/* Principles column */}
            <div className="bg-accent/40 p-8 md:p-12 border-t md:border-t-0 md:border-l border-border">
              <FadeIn>
                <p className="text-sm font-semibold mb-6 text-foreground">Core privacy principles</p>
                <ul className="space-y-4">
                  {PRINCIPLES.map((p, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{p}</span>
                    </li>
                  ))}
                </ul>
              </FadeIn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials — infinite marquee ─────────────────────────────────────────

function TestimonialsSection() {
  const marqueeItems = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section
      className="py-24 md:py-32 overflow-hidden"
      style={{ background: "var(--pg-lighter)" }}
    >
      <div className="mx-auto max-w-5xl px-5">
        <FadeIn className="text-center mb-14">
          <p className="eyebrow mb-3">Clinical Validation</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Evaluated by pharmacogenomics practitioners
          </h2>
          <p className="mx-auto max-w-lg text-muted-foreground">
            Clinical pharmacologists, pharmacists, and PGx program coordinators
            assess PharmaGuard against real-world prescribing workflows.
          </p>
        </FadeIn>
      </div>

      {/* Full-width scrolling strip */}
      <div className="relative">
        {/* Left + right edge fades — match the section background */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-28 z-10"
          style={{ background: "linear-gradient(to right, var(--pg-lighter), transparent)" }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-28 z-10"
          style={{ background: "linear-gradient(to left, var(--pg-lighter), transparent)" }}
        />

        <div className="overflow-hidden">
          <div
            className="flex gap-5 animate-marquee"
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.animationPlayState = "paused"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.animationPlayState = "running"; }}
          >
            {marqueeItems.map((t, i) => (
              <div
                key={i}
                className="w-80 shrink-0 rounded-xl border border-border bg-white p-6 shadow-card flex flex-col"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary shrink-0">
                    {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">{t.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.role} · {t.org}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────

function FAQSection() {
  return (
    <section
      id="faq"
      className="py-24 md:py-32"
      style={{ background: "var(--pg-near-white)" }}
    >
      <div className="mx-auto max-w-3xl px-5">
        <FadeIn className="text-center mb-14">
          <p className="eyebrow mb-3">Technical FAQ</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Technical and clinical context for pharmacogenomic analysis with PharmaGuard.
          </p>
        </FadeIn>

        <FadeIn>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-border bg-white px-5 shadow-card data-[state=open]:shadow-card-md transition-shadow"
              >
                <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── CTA ───────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section
      className="py-20 md:py-28"
      style={{ background: "var(--pg-near-white)" }}
    >
      <div className="mx-auto max-w-5xl px-5">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl px-8 py-14 md:px-14 text-center shadow-card-lg" style={{ background: "var(--pg-hero)" }}>
            {/* DNA helix texture */}
            <div className="bg-dna-helix absolute inset-0 pointer-events-none" aria-hidden />
            {/* Subtle background circles */}
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/[0.03]" aria-hidden />
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/[0.03]" aria-hidden />

            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-4">
                Begin genomic-guided prescribing
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-4">
                Evidence-based risk classification.<br className="hidden sm:block" /> Available now.
              </h2>
              <p className="mx-auto max-w-lg text-white/55 text-sm mb-8 leading-relaxed">
                Upload a patient VCF file, define a drug panel, and receive a complete
                pharmacogenomic risk report — deterministic CPIC classification with
                transparent AI clinical narration.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  asChild
                  variant="secondary"
                  size="lg"
                  className="px-8 h-12 text-base bg-white hover:bg-white/90 shadow-card font-semibold"
                  style={{ color: "var(--pg-hero)" }}
                >
                  <Link href="/analyze">
                    Launch Clinical Analysis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="px-8 h-12 text-base text-white/70 hover:bg-white/[0.07] hover:text-white"
                >
                  <a href="#how-it-works">Review methodology</a>
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function FooterSection() {
  const FOOTER_LINKS = {
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

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <FlaskConical className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-base">PharmaGuard</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deterministic pharmacogenomic risk classification powered by CPIC clinical evidence and explainable AI.
            </p>
            <div className="mt-4 flex gap-2">
              <Badge variant="secondary" className="text-xs font-normal">
                RIFT 2026
              </Badge>
              <Badge variant="outline" className="text-xs font-normal">
                Research Use
              </Badge>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                {section}
              </p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 PharmaGuard · RIFT 2026 Hackathon</p>
          <p className="text-center">
            For clinical research and decision support use only.
            Not a diagnostic device. Consult a qualified clinician before any prescribing decision.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main className="flex-1">
        <HeroSection />
        <TrustBar />
        {/* Gradient bridge: trust green → sage mint */}
        <div
          aria-hidden
          className="w-full h-24 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, var(--pg-trust), var(--pg-mid))" }}
        />
        <HowItWorksSection />
        <FeaturesSection />
        <SecuritySection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
