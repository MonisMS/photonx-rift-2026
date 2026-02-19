"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { TESTIMONIALS } from "./data";

function TestimonialCard({ t, index }: { t: typeof TESTIMONIALS[number]; index: number }) {
  void index;

  return (
    <motion.div
      whileHover={{ rotateX: 2, rotateY: -2, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      style={{ perspective: 800, transformStyle: "preserve-3d" }}
      className="w-80 shrink-0 rounded-xl border border-border/60 bg-white p-6 shadow-card hover:shadow-card-md flex flex-col cursor-default transition-[border-color,box-shadow] duration-300 hover:border-primary/20"
    >
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: t.rating }).map((_, j) => (
          <motion.div
            key={j}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 + j * 0.08 }}
          >
            <Star className="h-4 w-4 fill-primary text-primary" />
          </motion.div>
        ))}
      </div>

      <blockquote className="text-sm text-foreground/65 leading-relaxed flex-1 mb-6">
        &ldquo;{t.quote}&rdquo;
      </blockquote>

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary shrink-0">
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

export function TestimonialsSection() {
  const ease = [0.16, 1, 0.3, 1] as const;
  const marqueeItems = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section
      className="relative py-24 md:py-32 overflow-hidden bg-noise section-border-top section-border-top-light"
      style={{ background: "var(--pg-lighter)" }}
    >
      <div className="relative z-[2] mx-auto max-w-5xl px-5">
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
      <div className="relative z-[2]">
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
