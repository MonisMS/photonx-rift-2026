"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FlaskConical } from "lucide-react";
import { FOOTER_LINKS } from "./data";

export function FooterSection() {
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
              <Badge variant="secondary" className="text-xs font-normal">RIFT 2026</Badge>
              <Badge variant="outline" className="text-xs font-normal">Research Use</Badge>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">{section}</p>
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
                      <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
