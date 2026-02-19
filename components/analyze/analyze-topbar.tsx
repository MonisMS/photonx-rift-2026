"use client";

import Link from "next/link";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FlaskConical, ChevronLeft, Trash2 } from "lucide-react";
import type { VCFVariant, AnalysisResult } from "@/lib/types";

type CPICResult = Omit<AnalysisResult, "llm_generated_explanation">;

interface Props {
  cpicResults: CPICResult[];
  variants:    VCFVariant[];
  onClear:     () => void;
}

export function AnalyzeTopbar({ cpicResults, variants, onClear }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1"
          >
            <Link href="/">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>

          <Separator orientation="vertical" className="h-4" />

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <FlaskConical className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">PharmaGuard</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(cpicResults.length > 0 || variants.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Analysis</span>
            </Button>
          )}
          <Badge variant="secondary" className="text-xs font-medium">
            Patient Analysis
          </Badge>
        </div>
      </div>
    </header>
  );
}
