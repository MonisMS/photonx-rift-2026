"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FlaskConical, ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./data";

export function TopNav() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrolled = scrollProgress > 0.1;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handler = () => {
      const progress = Math.min(window.scrollY / 120, 1);
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.replace("#", ""));
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

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
              scrolled ? "bg-primary/10 ring-1 ring-primary/20" : "bg-white/12 ring-1 ring-white/20",
            )}
          >
            <FlaskConical className={cn("h-4 w-4 transition-colors duration-300", scrolled ? "text-primary" : "text-white")} />
          </motion.div>
          <span className={cn("font-bold text-base tracking-tight transition-colors duration-300", scrolled ? "text-foreground" : "text-white")}>
            PharmaGuard
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className={cn(
          "hidden md:flex items-center gap-0.5 rounded-full p-1 transition-all duration-500",
          scrolled ? "bg-muted/50 border border-border/50" : "bg-white/[0.06] border border-white/[0.08]",
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
                    : isActive ? "text-white" : "text-white/60 hover:text-white/90",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-capsule"
                    className={cn("absolute inset-0 rounded-full", scrolled ? "bg-white shadow-sm ring-1 ring-border/50" : "bg-white/[0.12]")}
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
                : "bg-white/90 hover:bg-white shadow-card",
            )}
            style={scrolled ? {} : { color: "var(--pg-hero)" }}
          >
            Clinical Analysis
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>

          <motion.button
            whileTap={{ scale: 0.9 }}
            className={cn(
              "md:hidden p-2 rounded-full transition-colors duration-200",
              scrolled ? "hover:bg-muted/60 text-foreground" : "hover:bg-white/10 text-white",
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

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden fixed inset-0 top-[56px] z-40"
          >
            <div className="absolute inset-0 bg-background/95 backdrop-blur-2xl" onClick={() => setMobileOpen(false)} />
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
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {activeSection === link.href && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  {link.label}
                </motion.a>
              ))}
              <div className="pt-1.5 px-2 pb-1">
                <Button asChild size="sm" className="w-full rounded-xl">
                  <Link href="/analyze" onClick={() => setMobileOpen(false)}>
                    Launch Clinical Analysis
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
