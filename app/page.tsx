"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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

const FEATURES: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
  featured?: boolean;
  iconHover: Record<string, number | number[]>;
}[] = [
  {
    icon:  ShieldCheck,
    title: "Deterministic CPIC Classification",
    body:  "Risk labels are resolved through direct lookup against CPIC diplotype–phenotype–risk tables. No probabilistic model, no inference — fully auditable decision logic.",
    featured: true,
    iconHover: { scale: 1.2, rotate: -8 },
  },
  {
    icon:  FlaskConical,
    title: "Explainable AI Narration",
    body:  "Each classification is accompanied by an AI-generated clinical explanation citing the patient's specific rsID, diplotype, and metabolizer phenotype — grounded in CPIC evidence.",
    featured: true,
    iconHover: { rotate: [0, 12, -12, 6, 0] },
  },
  {
    icon:  Zap,
    title: "Parallel Multi-Drug Analysis",
    body:  "Evaluate up to ten drug–gene interactions per patient in a single session. Each drug is processed independently for progressive, low-latency result delivery.",
    iconHover: { scale: [1, 1.3, 1], y: -2 },
  },
  {
    icon:  BarChart3,
    title: "Diplotype Confidence Scoring",
    body:  "Every classification reports genotype confidence: 95% for fully resolved diplotypes, 70% for single-allele inference, flagged explicitly when data is incomplete.",
    iconHover: { y: [0, -3, 0] },
  },
  {
    icon:  Lock,
    title: "Client-Side Genomic Processing",
    body:  "VCF variant extraction executes entirely in the browser via the FileReader API. No genomic data is transmitted to, processed on, or retained by any server.",
    iconHover: { scale: 1.15, rotate: 6 },
  },
  {
    icon:  Dna,
    title: "Guideline-Aligned Alternatives",
    body:  "When a drug is classified as Toxic or Ineffective, the system surfaces pharmacogenomically appropriate therapeutic alternatives consistent with CPIC guidance.",
    iconHover: { rotate: [0, 180], scale: 1.1 },
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
  const [scrollProgress, setScrollProgress] = useState(0); // 0 → 1
  const scrolled = scrollProgress > 0.1;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  /* ── Smooth scroll progress (0 at top → 1 at 120px) ───────────────── */
  useEffect(() => {
    const handler = () => {
      const progress = Math.min(window.scrollY / 120, 1);
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler(); // init
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /* ── IntersectionObserver for active section capsule ────────────────── */
  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.replace("#", ""));
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        }
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* ── Close mobile menu on resize to desktop ────────────────────────── */
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  /* ── Lock body scroll when mobile menu is open ─────────────────────── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className="fixed top-0 z-50 w-full"
      style={{
        backgroundColor: `oklch(1 0 0 / ${0.03 + scrollProgress * 0.62})`,
        backdropFilter: `blur(${8 + scrollProgress * 16}px)`,
        WebkitBackdropFilter: `blur(${8 + scrollProgress * 16}px)`,
        borderBottom: `1px solid oklch(0 0 0 / ${scrollProgress * 0.08})`,
        boxShadow: scrollProgress > 0.3
          ? `0 1px 3px oklch(0 0 0 / ${scrollProgress * 0.06})`
          : "none",
        transition: "box-shadow 0.4s ease",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
              scrolled
                ? "bg-primary/10 ring-1 ring-primary/20"
                : "bg-white/12 ring-1 ring-white/20"
            )}
          >
            <FlaskConical className={cn("h-4 w-4 transition-colors duration-300", scrolled ? "text-primary" : "text-white")} />
          </motion.div>
          <span className={cn(
            "font-bold text-base tracking-tight transition-colors duration-300",
            scrolled ? "text-foreground" : "text-white"
          )}>
            PharmaGuard
          </span>
        </Link>

        {/* Desktop nav — frosted capsule container */}
        <nav className={cn(
          "hidden md:flex items-center gap-0.5 rounded-full p-1 transition-all duration-500",
          scrolled
            ? "bg-muted/50 border border-border/50"
            : "bg-white/[0.06] border border-white/[0.08]"
        )}>
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors duration-200",
                  scrolled
                    ? isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    : isActive ? "text-white" : "text-white/60 hover:text-white/90"
                )}
              >
                {/* Animated capsule indicator */}
                {isActive && (
                  <motion.div
                    layoutId="nav-capsule"
                    className={cn(
                      "absolute inset-0 rounded-full",
                      scrolled ? "bg-white shadow-sm ring-1 ring-border/50" : "bg-white/[0.12]"
                    )}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </a>
            );
          })}
        </nav>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/analyze"
            className={cn(
              "hidden md:inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-300",
              scrolled
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "bg-white/90 hover:bg-white shadow-card"
            )}
            style={scrolled ? {} : { color: "var(--pg-hero)" }}
          >
            Clinical Analysis
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>

          {/* Mobile hamburger — animated icon swap */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className={cn(
              "md:hidden p-2 rounded-full transition-colors duration-200",
              scrolled
                ? "hover:bg-muted/60 text-foreground"
                : "hover:bg-white/10 text-white"
            )}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mobileOpen ? "close" : "open"}
                initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.div>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile menu — fullscreen glass overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden fixed inset-0 top-[56px] z-40"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-2xl" onClick={() => setMobileOpen(false)} />

            {/* Menu panel */}
            <motion.nav
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="relative mx-4 mt-3 rounded-2xl bg-white border border-border shadow-card-lg p-2 space-y-0.5"
            >
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors",
                    activeSection === link.href
                      ? "bg-primary/8 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {activeSection === link.href && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  {link.label}
                </motion.a>
              ))}
              <div className="pt-1.5 px-2 pb-1">
                <Button asChild size="sm" className="w-full rounded-xl">
                  <Link href="/analyze" onClick={() => setMobileOpen(false)}>
                    Launch Clinical Analysis
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Hero (dark forest green, white text) ──────────────────────────────────────

function HeroSection() {
  /* cinematic ease curve */
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section
      className="relative min-h-screen flex items-center pt-24 pb-0 overflow-hidden"
      style={{ background: "linear-gradient(175deg, var(--pg-hero) 0%, var(--pg-hero-mid) 100%)" }}
    >
      {/* ── Living background layers ─────────────────────────────────── */}

      {/* DNA helix — slowly rising */}
      <div className="bg-dna-helix absolute inset-0 pointer-events-none" aria-hidden />

      {/* Dot grid — slow diagonal drift */}
      <div className="bg-dot-grid absolute inset-0 pointer-events-none opacity-60" aria-hidden />

      {/* Primary glow orb — breathing, top center */}
      <div
        className="hero-glow-orb absolute top-0 left-1/2 w-[80vw] h-[65vh] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 55% at 50% -5%, oklch(0.38 0.10 170 / 0.55), transparent 70%)",
        }}
        aria-hidden
      />

      {/* Secondary glow orb — drifting, bottom right */}
      <div
        className="hero-glow-orb-2 absolute bottom-0 right-0 w-[55vw] h-[45vh] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 75% 100%, oklch(0.32 0.09 180 / 0.35), transparent 70%)",
        }}
        aria-hidden
      />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-5 text-center w-full pb-28">

        {/* Eyebrow badge — clip-path reveal */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
              CPIC-Aligned Clinical Decision Support
            </span>
          </div>
        </motion.div>

        {/* Headline — line 1 */}
        <div className="overflow-hidden mb-1">
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease }}
          >
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-[5.5rem] leading-[1.04] text-white">
              Genomic-Guided
            </h1>
          </motion.div>
        </div>

        {/* Headline — line 2 (staggered, gradient text) */}
        <div className="overflow-hidden mb-6">
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.28, ease }}
          >
            <span className="hero-gradient-text text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-[5.5rem] leading-[1.04]">
              Prescribing
            </span>
          </motion.div>
        </div>

        {/* Sub-headline — fade up after headline lands */}
        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.5, ease }}
          className="mx-auto max-w-2xl text-xl sm:text-2xl font-medium text-white/65 mb-6 tracking-tight"
        >
          Powered by CPIC Clinical Evidence
        </motion.p>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease }}
          className="mx-auto max-w-xl text-sm sm:text-base text-white/60 leading-relaxed mb-10"
        >
          Deterministic pharmacogenomic risk classification from VCF
          variants — with transparent, AI-narrated clinical explanations.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16"
        >
          {/* Primary CTA — dominant with glow + micro-motion */}
          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Link
              href="/analyze"
              className="group relative inline-flex items-center gap-2 rounded-full px-8 h-12 text-base font-semibold bg-white shadow-card-lg overflow-hidden"
              style={{ color: "var(--pg-hero)" }}
            >
              {/* Glow ring on hover */}
              <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: "0 0 28px 4px oklch(0.65 0.14 170 / 0.35)" }} />
              {/* Shimmer sweep */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <span className="relative flex items-center gap-2">
                Launch Clinical Analysis
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </motion.div>

          {/* Secondary CTA */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-full px-8 h-12 text-base text-white/70 border border-white/20 hover:bg-white/[0.08] hover:text-white hover:border-white/30 transition-all duration-200"
            >
              View Methodology
            </a>
          </motion.div>
        </motion.div>

        {/* Stats — interactive glass chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0, ease }}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mx-auto"
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.05 + i * 0.1, ease }}
              whileHover={{ scale: 1.06, y: -2, backgroundColor: "rgba(255,255,255,0.12)" }}
              className="flex items-baseline gap-2.5 rounded-full border border-white/12 bg-white/[0.06] px-5 py-2.5 cursor-default transition-colors duration-200"
            >
              <span className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">
                {stat.value}
              </span>
              <span className="text-[11px] text-white/55 uppercase tracking-wider font-medium">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
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
          <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-widest text-white/55">
            Grounded in peer-reviewed clinical pharmacogenomics
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-white/75">
                <Icon className="h-4 w-4 text-emerald-400/70 shrink-0" />
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
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section
      id="how-it-works"
      className="py-24 md:py-32"
      style={{ background: "var(--pg-deep)" }}
    >
      <div className="mx-auto max-w-5xl px-5">

        {/* ── Section header — cinematic scroll reveal ────────────── */}
        <div className="text-center mb-16 md:mb-20">
          {/* Eyebrow — slide up */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80 mb-3"
          >
            Methodology
          </motion.p>

          {/* Headline — masked clip reveal */}
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: "100%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
              className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-white"
            >
              From VCF variant file to clinical risk report<br className="hidden sm:block" /> in three deterministic steps
            </motion.h2>
          </div>

          {/* Subtitle — fade */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.25, ease }}
            className="mx-auto max-w-xl text-white/60"
          >
            No account required. No data uploaded. Fully reproducible results.
          </motion.p>
        </div>

        {/* ── Step cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.15, ease }}
            >
              <motion.div
                whileHover={{
                  y: -6,
                  boxShadow: "0 0 0 1px oklch(0.65 0.14 170 / 0.25), 0 8px 32px oklch(0.65 0.14 170 / 0.12)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group relative flex flex-col items-center text-center p-6 rounded-2xl bg-white/10 border border-white/15 transition-colors duration-300 hover:bg-white/[0.13]"
              >
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+48px)] right-[-24px] h-px bg-gradient-to-r from-white/20 to-transparent" />
                )}

                {/* Icon circle — pulse on card hover */}
                <div className="relative mb-6">
                  <motion.div
                    whileHover={{ rotate: [0, -6, 6, -3, 0] }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 border border-white/15 transition-all duration-300 group-hover:bg-white/20 group-hover:border-emerald-400/30 group-hover:shadow-[0_0_20px_oklch(0.65_0.14_170/0.15)]"
                  >
                    <step.icon className="h-9 w-9 text-emerald-400 transition-transform duration-300 group-hover:scale-110" />
                  </motion.div>
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-emerald-950 shadow-sm">
                    {i + 1}
                  </span>
                </div>

                <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80 mb-2">{step.step}</div>
                <h3 className="text-lg font-semibold mb-3 text-white">{step.title}</h3>
                <p className="text-sm text-white/65 leading-relaxed">{step.body}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="mt-14 text-center"
        >
          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="inline-block"
          >
            <Link
              href="/analyze"
              className="group relative inline-flex items-center gap-2 rounded-full px-8 h-12 text-base font-semibold bg-white shadow-card-lg overflow-hidden"
              style={{ color: "var(--pg-hero)" }}
            >
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <span className="relative flex items-center gap-2">
                Launch Clinical Analysis
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section
      id="features"
      className="py-24 md:py-32"
      style={{ background: "var(--pg-mid)" }}
    >
      <div className="mx-auto max-w-5xl px-5">

        {/* ── Section header — scroll reveal ─────────────────────── */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="text-xs font-semibold uppercase tracking-widest text-emerald-300/80 mb-3"
          >
            Clinical Architecture
          </motion.p>
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: "100%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
              className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-white"
            >
              Evidence-based infrastructure for pharmacogenomic decision support
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.25, ease }}
            className="mx-auto max-w-xl text-white/65"
          >
            Every component is designed to preserve clinical rigor, ensure auditability,
            and surface actionable pharmacogenomic intelligence at the point of care.
          </motion.p>
        </div>

        {/* ── Feature cards — differentiated grid ────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.08 * i, ease }}
              className="h-full"
            >
              <motion.div
                whileHover={{
                  y: -5,
                  boxShadow: feat.featured
                    ? "0 0 0 1px oklch(0.65 0.14 170 / 0.30), 0 12px 40px oklch(0.65 0.14 170 / 0.15)"
                    : "0 0 0 1px oklch(1 0 0 / 0.12), 0 8px 28px oklch(0 0 0 / 0.20)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className={cn(
                  "group h-full rounded-xl p-6 transition-colors duration-300 cursor-default",
                  feat.featured
                    ? "bg-white/[0.13] border border-emerald-400/20 hover:bg-white/[0.17]"
                    : "bg-white/10 border border-white/15 hover:bg-white/[0.14]"
                )}
              >
                {/* Icon — animated per card */}
                <motion.div
                  whileHover={feat.iconHover}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className={cn(
                    "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300",
                    feat.featured
                      ? "bg-emerald-400/15 group-hover:bg-emerald-400/25 group-hover:shadow-[0_0_16px_oklch(0.65_0.14_170/0.20)]"
                      : "bg-white/15 group-hover:bg-white/20"
                  )}
                >
                  <feat.icon className={cn(
                    "h-5 w-5 transition-all duration-300",
                    feat.featured
                      ? "text-emerald-400 group-hover:text-emerald-300"
                      : "text-emerald-400/80 group-hover:text-emerald-400"
                  )} />
                </motion.div>

                {/* Featured badge */}
                {feat.featured && (
                  <span className="inline-block mb-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70 bg-emerald-400/10 rounded-full px-2 py-0.5">
                    Core
                  </span>
                )}

                <h3 className="font-semibold mb-2 text-white">{feat.title}</h3>
                <p className="text-sm text-white/65 leading-relaxed">{feat.body}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────

function SecuritySection() {
  const ease = [0.16, 1, 0.3, 1] as const;

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
      style={{ background: "var(--pg-light)" }}
    >
      <div className="mx-auto max-w-5xl px-5">
        {/* Card container — scroll reveal */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease }}
          className="rounded-2xl border border-white/20 bg-white/[0.12] overflow-hidden"
        >
          <div className="grid md:grid-cols-2 gap-0 relative">

            {/* Animated divider — grows on scroll */}
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.4, ease }}
              className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px origin-top"
              style={{ background: "linear-gradient(to bottom, transparent, oklch(0.65 0.14 170 / 0.3), transparent)" }}
            />

            {/* Text column — slides from left */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.15, ease }}
              className="p-8 md:p-12"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: 0.25, ease }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/15 mb-6"
              >
                <Lock className="h-6 w-6 text-emerald-400" />
              </motion.div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400 mb-3">Transparency &amp; Data Sovereignty</p>
              <h2 className="text-3xl font-bold tracking-tight mb-5 text-white">
                Auditable architecture.<br className="hidden sm:block" /> Zero genomic data exposure.
              </h2>
              <p className="text-white/80 leading-relaxed mb-6 text-base">
                Genomic data is among the most sensitive clinical information in existence.
                PharmaGuard is architected so that raw variant data never leaves the
                clinician&apos;s browser — and risk classification is deterministic, not probabilistic.
                Every output can be traced from variant to diplotype to phenotype to recommendation.
              </p>
              <p className="text-sm text-white/55 border-t border-white/20 pt-4">
                PharmaGuard is built for research and clinical decision support. It is not
                a regulated medical device. Always confirm reports with a qualified clinician.
              </p>
            </motion.div>

            {/* Principles column — slides from right, staggered checks */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.3, ease }}
              className="bg-white/[0.06] p-8 md:p-12 border-t md:border-t-0"
            >
              <p className="text-base font-bold mb-7 text-white">Core privacy principles</p>
              <ul className="space-y-5">
                {PRINCIPLES.map((p, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, delay: 0.4 + i * 0.09, ease }}
                    className="flex items-start gap-3.5"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 15,
                        delay: 0.45 + i * 0.09,
                      }}
                      className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/25"
                    >
                      <CheckCircle2 className="h-[18px] w-[18px] text-emerald-400" />
                    </motion.div>
                    <span className="text-[15px] text-white/85 font-medium leading-snug">{p}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Testimonials — infinite marquee with interactive cards ──────────────────

function TestimonialCard({ t, index }: { t: typeof TESTIMONIALS[number]; index: number }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
        scale: isHovered ? 1.03 : 1,
        y: isHovered ? -4 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      style={{ perspective: 800, transformStyle: "preserve-3d" }}
      className="w-80 shrink-0 rounded-xl border border-border/50 bg-white/85 backdrop-blur-sm p-6 shadow-card hover:shadow-card-md flex flex-col cursor-default transition-[border-color,box-shadow] duration-300 hover:border-primary/20"
    >
      {/* Stars — staggered pop-in */}
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: t.rating }).map((_, j) => (
          <motion.div
            key={j}
            initial={{ opacity: 0, scale: 0, rotate: -30 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 18,
              delay: 0.3 + j * 0.08,
            }}
          >
            <Star className="h-4 w-4 fill-primary text-primary" />
          </motion.div>
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-sm text-foreground/65 leading-relaxed flex-1 mb-6">
        &ldquo;{t.quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0 transition-colors duration-300",
          isHovered ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"
        )}>
          {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-medium leading-none text-foreground">{t.name}</p>
          <p className="mt-1 text-xs text-foreground/50">{t.role} · {t.org}</p>
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialsSection() {
  const ease = [0.16, 1, 0.3, 1] as const;
  const marqueeItems = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section
      className="py-24 md:py-32 overflow-hidden"
      style={{ background: "var(--pg-lighter)" }}
    >
      <div className="mx-auto max-w-5xl px-5">
        {/* Section header — cinematic reveal */}
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="eyebrow mb-3"
          >
            Clinical Validation
          </motion.p>
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: "100%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
              className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-foreground"
            >
              Evaluated by pharmacogenomics practitioners
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.25, ease }}
            className="mx-auto max-w-lg text-foreground/60"
          >
            Clinical pharmacologists, pharmacists, and PGx program coordinators
            assess PharmaGuard against real-world prescribing workflows.
          </motion.p>
        </div>
      </div>

      {/* Full-width scrolling strip */}
      <div className="relative">
        {/* Left + right edge fades */}
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
              <TestimonialCard key={i} t={t} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────

function FAQSection() {
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section
      id="faq"
      className="py-24 md:py-32"
      style={{ background: "var(--pg-near-white)" }}
    >
      <div className="mx-auto max-w-3xl px-5">
        {/* Section header — cinematic reveal */}
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="eyebrow mb-3"
          >
            Technical FAQ
          </motion.p>
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: "100%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
              className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-foreground"
            >
              Frequently asked questions
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.25, ease }}
            className="text-foreground/60"
          >
            Technical and clinical context for pharmacogenomic analysis with PharmaGuard.
          </motion.p>
        </div>

        {/* Accordion — each item staggered on scroll */}
        <Accordion type="single" collapsible className="space-y-2.5">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: 0.06 * i, ease }}
            >
              <AccordionItem
                value={`faq-${i}`}
                className="rounded-xl border border-border/50 bg-white/85 backdrop-blur-sm px-5 shadow-card data-[state=open]:shadow-card-md data-[state=open]:border-primary/15 transition-all duration-300"
              >
                <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
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
              <p className="text-xs font-semibold uppercase tracking-widest text-white/65 mb-4">
                Begin genomic-guided prescribing
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-4">
                Evidence-based risk classification.<br className="hidden sm:block" /> Available now.
              </h2>
              <p className="mx-auto max-w-lg text-white/70 text-sm mb-8 leading-relaxed">
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
        {/* Gradient bridge: trust → deep (smooth dark transition) */}
        <div
          aria-hidden
          className="w-full h-32 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, var(--pg-trust), var(--pg-deep))" }}
        />
        <HowItWorksSection />
        {/* Bridge: deep → mid */}
        <div
          aria-hidden
          className="w-full h-24 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, var(--pg-deep), var(--pg-mid))" }}
        />
        <FeaturesSection />
        {/* Bridge: mid → light */}
        <div
          aria-hidden
          className="w-full h-24 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, var(--pg-mid), var(--pg-light))" }}
        />
        <SecuritySection />
        {/* Bridge: light → lighter */}
        <div
          aria-hidden
          className="w-full h-24 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, var(--pg-light), var(--pg-lighter))" }}
        />
        <TestimonialsSection />
        {/* Bridge: lighter → near-white */}
        <div
          aria-hidden
          className="w-full h-16 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, var(--pg-lighter), var(--pg-near-white))" }}
        />
        <FAQSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
