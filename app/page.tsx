import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { FlaskConical, ShieldCheck, Dna, FileSearch } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* ── Nav ── */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-blue-600" />
            <span className="font-bold">PharmaGuard</span>
          </div>
          <Badge variant="secondary" className="text-xs">RIFT 2026</Badge>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="max-w-2xl space-y-6">

          <div className="flex justify-center">
            <span className="rounded-full border bg-muted px-4 py-1 text-sm text-muted-foreground">
              Pharmacogenomics · Explainable AI · HealthTech
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Know if a drug is safe<br />
            <span className="text-blue-600">before prescribing it.</span>
          </h1>

          <p className="text-lg text-muted-foreground">
            Upload a patient&apos;s genetic file. Get an instant, AI-powered
            risk report for any drug — powered by published CPIC clinical guidelines.
          </p>

          <Button asChild size="lg" className="px-8">
            <Link href="/analyze">Get Started</Link>
          </Button>
        </div>

        {/* ── 3 Feature Pills ── */}
        <div className="mt-20 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Dna,         title: "VCF Analysis",       desc: "Parses standard genetic variant files instantly." },
            { icon: ShieldCheck, title: "CPIC Guidelines",    desc: "Deterministic risk logic from peer-reviewed science." },
            { icon: FileSearch,  title: "AI Explanations",    desc: "Gemini generates plain-English clinical context." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border bg-muted/40 p-5 text-left">
              <Icon className="mb-3 h-5 w-5 text-blue-600" />
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        PharmaGuard · RIFT 2026 Hackathon · For clinical research use only
      </footer>
    </div>
  );
}
