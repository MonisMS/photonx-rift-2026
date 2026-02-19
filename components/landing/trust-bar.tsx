"use client";

import { FadeIn } from "@/components/motion-primitives";
import { TRUST_ITEMS } from "./data";

export function TrustBar() {
  return (
    <FadeIn>
      <div className="border-b border-white/8 py-5" style={{ background: "var(--pg-trust)" }}>
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
    </FadeIn>
  );
}
