"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseVCF } from "@/lib/vcf-parser";
import type { VCFVariant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UploadCloud, FileCheck2, XCircle } from "lucide-react";

interface VCFUploadProps {
  onParsed: (variants: VCFVariant[], patientId: string) => void;
  onClear:  () => void;
}

export function VCFUpload({ onParsed, onClear }: VCFUploadProps) {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  function processFile(file: File) {
    setError(null);

    if (!file.name.endsWith(".vcf")) {
      setError("Only .vcf files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text   = e.target?.result as string;
      const result = parseVCF(text);
      if (!result.success) {
        setError(result.error ?? "Failed to parse VCF file.");
        return;
      }
      if (result.variants.length === 0) {
        setError("No pharmacogenomic variants found in this file.");
        return;
      }
      setFileName(file.name);
      onParsed(result.variants, result.patientId);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleClear() {
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  }

  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-colors cursor-pointer",
        dragging  && "border-blue-400 bg-blue-50",
        fileName  && "border-green-400 bg-green-50",
        error     && "border-red-400 bg-red-50",
        !dragging && !fileName && !error && "border-muted-foreground/30 hover:border-muted-foreground/60"
      )}
      onClick={() => !fileName && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <input
          ref={inputRef}
          type="file"
          accept=".vcf"
          className="hidden"
          onChange={handleFileInput}
        />

        {fileName ? (
          <>
            <FileCheck2 className="h-10 w-10 text-green-600" />
            <p className="font-medium text-green-700">{fileName}</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
            >
              <XCircle className="h-4 w-4 mr-1" /> Remove file
            </Button>
          </>
        ) : (
          <>
            <UploadCloud className={cn("h-10 w-10", dragging ? "text-blue-500" : "text-muted-foreground")} />
            <div>
              <p className="font-medium">Drop your VCF file here</p>
              <p className="text-sm text-muted-foreground">or click to browse — max 5MB</p>
            </div>
            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
