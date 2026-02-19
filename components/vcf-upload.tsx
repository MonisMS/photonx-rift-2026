"use client";

import { useRef, useState }   from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { parseVCF }           from "@/lib/vcf-parser";
import type { VCFVariant, SupportedGene } from "@/lib/types";
import { cn }                 from "@/lib/utils";
import { UploadCloud, FileCheck2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VCFUploadProps {
  onParsed: (variants: VCFVariant[], patientId: string, genesDetected: SupportedGene[]) => void;
  onClear:  () => void;
}

type UploadState = "idle" | "dragging" | "success" | "error";

export function VCFUpload({ onParsed, onClear }: VCFUploadProps) {
  const shouldReduce            = useReducedMotion();
  const inputRef                = useRef<HTMLInputElement>(null);
  const [state,    setState]    = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function processFile(file: File) {
    setErrorMsg(null);

    if (!file.name.endsWith(".vcf")) {
      setState("error");
      setErrorMsg("Only .vcf files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setState("error");
      setErrorMsg("File size must be under 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text   = e.target?.result as string;
      const result = parseVCF(text);
      if (!result.success) {
        setState("error");
        setErrorMsg(result.error ?? "Failed to parse VCF file.");
        return;
      }
      if (result.variants.length === 0 && result.genesDetected.length === 0) {
        setState("error");
        setErrorMsg("No pharmacogenomic variants found in this file.");
        return;
      }
      setState("success");
      setFileName(file.name);
      onParsed(result.variants, result.patientId, result.genesDetected);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setState("idle");
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleClear() {
    setState("idle");
    setFileName(null);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  }

  const isDragging = state === "dragging";
  const isSuccess  = state === "success";
  const isError    = state === "error";

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload VCF file"
        onClick={() => !isSuccess && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!isSuccess) inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); if (!isSuccess) setState("dragging"); }}
        onDragLeave={() => setState((s) => s === "dragging" ? "idle" : s)}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed",
          "min-h-[144px] px-6 py-8 text-center transition-all duration-200 cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isDragging && "border-primary bg-accent/70 scale-[1.01] ring-4 ring-primary/10",
          isSuccess  && "border-solid border-emerald-400 bg-emerald-50/60 cursor-default",
          isError    && "border-destructive/40 bg-destructive/5",
          !isDragging && !isSuccess && !isError && [
            "border-border hover:border-primary/40 hover:bg-accent/30 bg-muted/20",
          ]
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".vcf"
          className="hidden"
          onChange={handleFileInput}
          aria-hidden="true"
        />

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: shouldReduce ? 1 : [0.92, 1.04, 1] }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileCheck2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{fileName}</p>
                <p className="text-xs text-primary mt-0.5">File parsed successfully</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive gap-1.5 mt-1"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
              >
                <XCircle className="h-3.5 w-3.5" />
                Remove file
              </Button>
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: shouldReduce ? 0 : [0, -3, 3, -3, 3, 0] }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.25 },
                x: { duration: 0.4, ease: "easeOut" },
              }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-semibold text-destructive">Upload failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 mt-1"
                onClick={(e) => { e.stopPropagation(); handleClear(); inputRef.current?.click(); }}
              >
                Try again
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                animate={
                  shouldReduce
                    ? undefined
                    : isDragging
                    ? { y: 0, scale: 1.08 }
                    : { y: [0, -3, 0] }
                }
                transition={
                  isDragging
                    ? { duration: 0.2, ease: "easeOut" }
                    : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                }
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                  isDragging ? "bg-primary/15" : "bg-muted/60"
                )}
              >
                <UploadCloud className={cn(
                  "h-6 w-6 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </motion.div>
              <div>
                <p className="text-sm font-semibold">
                  {isDragging ? "Drop to upload" : "Drop your VCF file here"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  or click to browse &mdash; max 5 MB · .vcf only
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
