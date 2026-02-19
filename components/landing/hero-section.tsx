"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { STATS } from "./data";

export function HeroSection() {
  const ease = [0.16, 1, 0.3, 1] as const;
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [scrollOpacity, setScrollOpacity] = useState(0.55);
  const rafRef = useRef<number>(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (prefersReduced || window.innerWidth < 768) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = sectionRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = (e.clientX - rect.left) / rect.width - 0.5;
        const cy = (e.clientY - rect.top) / rect.height - 0.5;
        setParallax({ x: cx * 8, y: cy * 8 });
      });
    },
    [prefersReduced],
  );

  const handleMouseLeave = useCallback(() => {
    setParallax({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const handler = () => {
      const t = Math.min(window.scrollY / 600, 1);
      setScrollOpacity(0.55 - t * 0.35);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [prefersReduced]);

  const m = (props: Record<string, unknown>) => (prefersReduced ? {} : props);

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen flex items-center pt-24 pb-0 overflow-hidden"
      style={{ background: "linear-gradient(175deg, var(--pg-hero) 0%, var(--pg-hero-mid) 100%)" }}
    >
      {/* Living background layers */}
      <div
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{
          transform: `translate(${parallax.x}px, ${parallax.y}px)`,
          transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}
        aria-hidden
      >
        <div className="bg-dna-helix absolute inset-[-8px]" />
        <div className="bg-dot-grid absolute inset-[-8px] opacity-60" />
      </div>

      {/* Glow orbs */}
      <div
        className="hero-glow-orb absolute top-0 left-1/2 w-[80vw] h-[65vh] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% -5%, oklch(0.38 0.10 170 / ${scrollOpacity}), transparent 70%)`,
          transition: "background 0.3s ease",
        }}
        aria-hidden
      />
      <div
        className="hero-glow-orb-2 absolute bottom-0 right-0 w-[55vw] h-[45vh] pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 80% at 75% 100%, oklch(0.32 0.09 180 / 0.35), transparent 70%)" }}
        aria-hidden
      />

      {/* Content */}
      <div className="mx-auto max-w-5xl px-5 text-center w-full pb-28">

        {/* Eyebrow badge */}
        <motion.div {...m({ initial: { opacity: 0, y: 40 } })} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
              CPIC-Aligned Clinical Decision Support
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <div className="overflow-hidden mb-1">
          <motion.h1
            {...m({ initial: { y: 40, opacity: 0 } })}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-[5.5rem] leading-[1.04] text-white"
          >
            Genomic-Guided
          </motion.h1>
        </div>

        <div className="overflow-hidden mb-6">
          <motion.span
            {...m({ initial: { y: 40, opacity: 0 } })}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.30, ease }}
            className="hero-gradient-text inline-block text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-[5.5rem] leading-[1.04]"
          >
            Prescribing
          </motion.span>
        </div>

        <motion.p
          {...m({ initial: { opacity: 0, y: 20 } })}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75, ease }}
          className="mx-auto max-w-2xl text-xl sm:text-2xl font-medium text-white/65 mb-6 tracking-tight"
        >
          Powered by CPIC Clinical Evidence
        </motion.p>

        <motion.p
          {...m({ initial: { opacity: 0, y: 14 } })}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85, ease }}
          className="mx-auto max-w-xl text-sm sm:text-base text-white/60 leading-relaxed mb-10"
        >
          Deterministic pharmacogenomic risk classification from VCF variants — with transparent, AI-narrated clinical explanations.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...m({ initial: { opacity: 0, scale: 0.95 } })}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 30, delay: 0.95 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16"
        >
          <Link
            href="/analyze"
            className="group relative inline-flex items-center gap-2 rounded-full px-8 h-12 text-base font-semibold bg-white overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] hover:shadow-[0_4px_24px_oklch(0.65_0.14_170/0.25),0_0_0_1px_oklch(0.65_0.14_170/0.10)] shadow-card-lg"
            style={{ color: "var(--pg-hero)" }}
          >
            <span
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-250"
              style={{ background: "linear-gradient(90deg, oklch(0.97 0.01 184.5) 0%, oklch(1 0 0) 50%, oklch(0.97 0.01 184.5) 100%)" }}
            />
            <span className="relative flex items-center gap-2">
              Launch Clinical Analysis
              <ArrowRight className="h-4 w-4 transition-transform duration-250 group-hover:translate-x-1" />
            </span>
          </Link>

          <motion.div
            whileHover={prefersReduced ? {} : { scale: 1.03 }}
            whileTap={prefersReduced ? {} : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-full px-8 h-12 text-base text-white/70 border border-white/20 hover:bg-white/[0.08] hover:text-white hover:border-white/30 transition-all duration-200"
            >
              View Methodology
            </a>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mx-auto">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              {...m({ initial: { opacity: 0, y: 16 } })}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 + i * 0.1, ease }}
              whileHover={prefersReduced ? {} : { scale: 1.06, y: -2, backgroundColor: "rgba(255,255,255,0.12)" }}
              className="flex items-baseline gap-2.5 rounded-full border border-white/12 bg-white/[0.06] px-5 py-2.5 cursor-default transition-colors duration-200"
            >
              <span className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">{stat.value}</span>
              <span className="text-[11px] text-white/55 uppercase tracking-wider font-medium">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom gradient bridge */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, var(--pg-trust))" }}
        aria-hidden
      />
    </section>
  );
}
