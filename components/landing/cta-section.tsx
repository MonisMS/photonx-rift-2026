"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative py-20 md:py-28" style={{ background: "var(--pg-near-white)" }}>
      <div className="mx-auto max-w-5xl px-5">
          <div className="relative overflow-hidden rounded-2xl px-8 py-14 md:px-14 text-center shadow-card-lg" style={{ background: "var(--pg-hero)" }}>
            <div className="bg-dna-helix absolute inset-0 pointer-events-none" aria-hidden />
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
      </div>
    </section>
  );
}
