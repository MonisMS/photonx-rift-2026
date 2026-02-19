import { TopNav }              from "@/components/landing/top-nav";
import { HeroSection }         from "@/components/landing/hero-section";
import { TrustBar }            from "@/components/landing/trust-bar";
import { HowItWorksSection }   from "@/components/landing/how-it-works-section";
import { FeaturesSection }     from "@/components/landing/features-section";
import { SecuritySection }     from "@/components/landing/security-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { FAQSection }          from "@/components/landing/faq-section";
import { CTASection }          from "@/components/landing/cta-section";
import { FooterSection }       from "@/components/landing/footer-section";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main className="flex-1">
        <HeroSection />
        <TrustBar />
        {/* Gradient bridge: trust → deep */}
        <div aria-hidden className="w-full h-32 pointer-events-none" style={{ background: "linear-gradient(to bottom, var(--pg-trust), var(--pg-deep))" }} />
        <HowItWorksSection />
        {/* Bridge: deep → mid */}
        <div aria-hidden className="w-full h-24 pointer-events-none" style={{ background: "linear-gradient(to bottom, var(--pg-deep), var(--pg-mid))" }} />
        <FeaturesSection />
        {/* Bridge: mid → light */}
        <div aria-hidden className="w-full h-24 pointer-events-none" style={{ background: "linear-gradient(to bottom, var(--pg-mid), var(--pg-light))" }} />
        <SecuritySection />
        {/* Bridge: light → lighter */}
        <div aria-hidden className="w-full h-24 pointer-events-none" style={{ background: "linear-gradient(to bottom, var(--pg-light), var(--pg-lighter))" }} />
        <TestimonialsSection />
        {/* Bridge: lighter → near-white */}
        <div aria-hidden className="w-full h-16 pointer-events-none" style={{ background: "linear-gradient(to bottom, var(--pg-lighter), var(--pg-near-white))" }} />
        <FAQSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
