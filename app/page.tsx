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
  { value: "6",      label: "Drug–gene pairs"    },
  { value: "50+",    label: "Variant mappings"   },
  { value: "<5 sec", label: "Time to report"     },
  { value: "CPIC",   label: "Evidence standard"  },
];

const TRUST_ITEMS = [
  { icon: BookOpen,    label: "CPIC Clinical Guidelines" },
  { icon: Microscope,  label: "Peer-reviewed science"    },
  { icon: Lock,        label: "Browser-side parsing"     },
  { icon: Zap,         label: "Instant AI analysis"      },
  { icon: ShieldCheck, label: "No data retention"        },
];

const STEPS = [
  {
    icon: FileSearch,
    step: "01",
    title: "Upload Genetic Data",
    body:  "Drop a patient's VCF file into PharmaGuard. All variant parsing happens entirely in your browser — no genetic data ever leaves your device or touches a server.",
  },
  {
    icon: Pill,
    step: "02",
    title: "Select Drugs to Evaluate",
    body:  "Choose from six clinically validated drug–gene pairs. Batch analysis means one upload delivers one complete multi-drug report, not six separate lookups.",
  },
  {
    icon: Activity,
    step: "03",
    title: "Receive Your Clinical Report",
    body:  "Get risk labels (Safe, Adjust Dosage, Toxic, Ineffective), confidence scores, biological mechanisms, and CPIC-aligned dosing recommendations — in seconds.",
  },
];

const FEATURES = [
  {
    icon:  ShieldCheck,
    title: "CPIC Risk Classification",
    body:  "Safe, Adjust Dosage, Toxic, or Ineffective — determined entirely by peer-reviewed CPIC clinical evidence, not machine learning guesswork.",
  },
  {
    icon:  FlaskConical,
    title: "AI Clinical Explanations",
    body:  "Gemini explains the exact molecular mechanism behind each risk outcome — citing the patient's specific rsID, diplotype, and phenotype — in plain clinical language.",
  },
  {
    icon:  Zap,
    title: "Batch Drug Analysis",
    body:  "Analyze all six drugs against a patient genome in a single upload. One report per patient visit, not six round trips.",
  },
  {
    icon:  BarChart3,
    title: "Confidence Scoring",
    body:  "Every result carries a transparency score. 95% confidence when both alleles are detected; clearly lower when only partial data is available.",
  },
  {
    icon:  Lock,
    title: "Privacy by Design",
    body:  "VCF parsing runs in your browser via the FileReader API. No health data is transmitted, logged, or retained on any server.",
  },
  {
    icon:  Dna,
    title: "Alternative Drug Suggestions",
    body:  "When a drug is flagged as Toxic or Ineffective, PharmaGuard recommends pharmacogenomically appropriate alternatives aligned with CPIC guidance.",
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
    a: "PharmaGuard currently covers six clinically significant drug–gene pairs: Codeine (CYP2D6), Warfarin (CYP2C9), Clopidogrel (CYP2C19), Simvastatin (SLCO1B1), Azathioprine (TPMT), and Fluorouracil (DPYD). These cover the most clinically actionable CPIC Tier 1A recommendations.",
  },
  {
    q: "Is PharmaGuard a diagnostic tool?",
    a: "No. PharmaGuard is a clinical decision support tool built for research and clinical workflows. It is not a regulated medical device or diagnostic product. All outputs should be reviewed by a qualified clinician or pharmacist alongside other patient information before any prescribing decision is made.",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function TopNav() {
  const [scrolled,     setScrolled]     = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);

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
          ? "bg-background/90 backdrop-blur-md border-b border-border shadow-card"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FlaskConical className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight">PharmaGuard</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/analyze">
              Start Analysis <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted/60 transition-colors"
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
          className="md:hidden bg-background/95 backdrop-blur-md border-b border-border px-5 pb-4 space-y-1"
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
              <Link href="/analyze">Start Analysis</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden">
      {/* Background gradient accents */}
      <div className="hero-gradient absolute inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-5xl px-5 text-center w-full">

        {/* Eyebrow */}
        <FadeIn>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent/60 px-4 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="eyebrow">Clinical Pharmacogenomics Platform</span>
          </div>
        </FadeIn>

        {/* Headline */}
        <FadeIn delay={0.05}>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl mb-6 leading-[1.07]">
            Know Which Drugs Are Safe
            <br />
            <span className="gradient-text">Before You Prescribe</span>
          </h1>
        </FadeIn>

        {/* Body copy */}
        <FadeIn delay={0.1}>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed mb-10">
            PharmaGuard analyzes your patient&apos;s genetic profile against peer-reviewed CPIC
            clinical guidelines — delivering instant drug safety reports explained in plain,
            actionable language by AI.
          </p>
        </FadeIn>

        {/* CTAs */}
        <FadeIn delay={0.15}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Button asChild size="lg" className="px-8 h-12 text-base shadow-card-md">
              <Link href="/analyze">
                Analyze a Patient
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8 h-12 text-base">
              <a href="#how-it-works">
                See How It Works
              </a>
            </Button>
          </div>
        </FadeIn>

        {/* Stats */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-border bg-border shadow-card mx-auto max-w-2xl">
          {STATS.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="bg-card px-6 py-5 text-center">
                <AnimatedStat className="block text-2xl font-bold text-primary tabular-nums">
                  {stat.value}
                </AnimatedStat>
                <span className="mt-1 block text-xs text-muted-foreground">{stat.label}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <FadeInSimple>
      <div className="border-y border-border bg-muted/30 py-5">
        <div className="mx-auto max-w-5xl px-5">
          <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Built on established clinical science
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FadeInSimple>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-5">

        {/* Section header */}
        <FadeIn className="text-center mb-16 md:mb-20">
          <p className="eyebrow mb-3">How It Works</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            From genetic file to clinical report<br className="hidden sm:block" /> in three steps
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            No complex setup. No accounts required. Upload, select, and receive.
          </p>
        </FadeIn>

        {/* Steps */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <StaggerItem key={i}>
              <div className="relative flex flex-col items-center text-center p-6">
                {/* Connector line (desktop only) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+48px)] right-0 h-px bg-gradient-to-r from-border to-transparent" />
                )}

                {/* Icon circle with step badge */}
                <div className="relative mb-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent shadow-card">
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

        {/* CTA */}
        <FadeIn className="mt-14 text-center" delay={0.1}>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href="/analyze">
              Try It Now — It&apos;s Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </FadeIn>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 bg-muted/25">
      <div className="mx-auto max-w-5xl px-5">

        <FadeIn className="text-center mb-16">
          <p className="eyebrow mb-3">Platform Capabilities</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Precision tools built for clinical workflows
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Every capability is designed to reduce cognitive load, eliminate guesswork,
            and surface the information clinicians actually need.
          </p>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat) => (
            <StaggerItem key={feat.title}>
              <HoverLift className="h-full">
                <div className="h-full rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-md">
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

function SecuritySection() {
  const PRINCIPLES = [
    "VCF parsed in-browser, never uploaded",
    "No patient data retained post-session",
    "Transparent, auditable CPIC logic",
    "AI explains — never predicts alone",
    "Open science foundation",
  ];

  return (
    <section id="security" className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-5">
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">

            {/* Text column */}
            <div className="p-8 md:p-12">
              <FadeIn>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent mb-6">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <p className="eyebrow mb-3">Clinical Data Principles</p>
                <h2 className="text-2xl font-bold tracking-tight mb-4">
                  Built with patient data sovereignty in mind
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm">
                  Genetic data is among the most sensitive personal information that exists.
                  PharmaGuard is architected so that a patient&apos;s raw genomic data never
                  leaves their clinician&apos;s browser — by design, not by policy.
                </p>
                <p className="text-xs text-muted-foreground/70 border-t border-border pt-4">
                  PharmaGuard is built for research and clinical decision support. It is not
                  a regulated medical device. Always confirm reports with a qualified clinician.
                </p>
              </FadeIn>
            </div>

            {/* Principles column */}
            <div className="bg-muted/30 p-8 md:p-12 border-t md:border-t-0 md:border-l border-border">
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

function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32 bg-muted/25">
      <div className="mx-auto max-w-5xl px-5">

        <FadeIn className="text-center mb-14">
          <p className="eyebrow mb-3">From the field</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Trusted by clinical teams
          </h2>
          <p className="mx-auto max-w-lg text-muted-foreground">
            Clinicians and pharmacists working on pharmacogenomics workflows share their experience.
          </p>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <StaggerItem key={i}>
              <HoverLift className="h-full">
                <div className="h-full rounded-xl border border-border bg-card p-6 shadow-card flex flex-col">
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
                      {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{t.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t.role} · {t.org}</p>
                    </div>
                  </div>
                </div>
              </HoverLift>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-5">
        <FadeIn className="text-center mb-14">
          <p className="eyebrow mb-3">FAQ</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Common questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about PharmaGuard and pharmacogenomic analysis.
          </p>
        </FadeIn>

        <FadeIn>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-border bg-card px-5 shadow-card data-[state=open]:shadow-card-md transition-shadow"
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

function CTASection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-14 md:px-14 text-center shadow-card-lg">
            {/* Subtle background circles */}
            <div
              className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5"
              aria-hidden
            />
            <div
              className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/5"
              aria-hidden
            />

            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60 mb-4">
                Ready to get started?
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl mb-4">
                Run your first analysis — free, instant, private.
              </h2>
              <p className="mx-auto max-w-lg text-primary-foreground/70 text-sm mb-8 leading-relaxed">
                Upload a patient&apos;s VCF file, select drugs, and receive a complete pharmacogenomic
                risk report powered by CPIC guidelines in under 30 seconds.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  asChild
                  variant="secondary"
                  size="lg"
                  className="px-8 h-12 text-base bg-white text-primary hover:bg-white/90 shadow-card"
                >
                  <Link href="/analyze">
                    Analyze a Patient
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="px-8 h-12 text-base text-primary-foreground hover:bg-white/10"
                >
                  <a href="#how-it-works">Learn how it works</a>
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

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
    <footer className="border-t border-border bg-card">
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
              Pharmacogenomic risk analysis powered by CPIC clinical guidelines and AI.
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
