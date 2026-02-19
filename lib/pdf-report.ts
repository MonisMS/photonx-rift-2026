import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisResult, RiskLabel } from "@/lib/types";

// ─── Partial result type (explanation may not exist yet) ─────────────────────

type PartialResult = Omit<AnalysisResult, "llm_generated_explanation"> & {
  llm_generated_explanation?: AnalysisResult["llm_generated_explanation"];
};

// ─── Risk label → color mapping (RGB) ────────────────────────────────────────

const RISK_COLORS: Record<RiskLabel, [number, number, number]> = {
  "Safe":          [16, 185, 129],   // emerald
  "Adjust Dosage": [245, 158, 11],   // amber
  "Toxic":         [239, 68, 68],    // red
  "Ineffective":   [249, 115, 22],   // orange
  "Unknown":       [156, 163, 175],  // gray
};

// ─── Main export ─────────────────────────────────────────────────────────────

export function generatePDFReport(
  results: PartialResult[],
  patientId: string,
  variantCount: number,
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  // ── Header bar ──
  doc.setFillColor(15, 118, 110); // teal-700
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PharmaGuard", margin, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Pharmacogenomic Risk Report", margin, 18);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, 24);

  y = 36;

  // ── Patient info ──
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Information", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Patient ID: ${patientId}`, margin, y);
  doc.text(`Variants Detected: ${variantCount}`, margin + 70, y);
  doc.text(`Drugs Analyzed: ${results.length}`, margin + 130, y);
  y += 4;
  doc.text(`Timestamp: ${results[0]?.timestamp ?? new Date().toISOString()}`, margin, y);
  y += 8;

  // ── Summary table ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Risk Summary", margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Drug", "Gene", "Diplotype", "Phenotype", "Risk", "Confidence"]],
    body: results.map((r) => [
      r.drug,
      r.pharmacogenomic_profile.primary_gene,
      r.pharmacogenomic_profile.diplotype,
      r.pharmacogenomic_profile.phenotype,
      r.risk_assessment.risk_label,
      `${Math.round(r.risk_assessment.confidence_score * 100)}%`,
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      2: { font: "courier" },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 4) {
        const label = data.cell.raw as RiskLabel;
        const color = RISK_COLORS[label];
        if (color) {
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Per-drug detail sections ──
  for (const r of results) {
    // Check if we need a new page (need ~60mm for a drug section)
    if (y > 240) {
      doc.addPage();
      y = margin;
    }

    const riskColor = RISK_COLORS[r.risk_assessment.risk_label] ?? [100, 100, 100];

    // Drug header strip
    doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${r.drug}  —  ${r.risk_assessment.risk_label}`, margin + 3, y + 5);
    y += 10;

    // Gene profile
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Gene: ${r.pharmacogenomic_profile.primary_gene}`, margin, y);
    doc.text(`Diplotype: ${r.pharmacogenomic_profile.diplotype}`, margin + 40, y);
    doc.text(`Phenotype: ${r.pharmacogenomic_profile.phenotype}`, margin + 85, y);
    doc.text(`Confidence: ${Math.round(r.risk_assessment.confidence_score * 100)}%`, margin + 125, y);
    y += 5;

    // Detected variants
    if (r.pharmacogenomic_profile.detected_variants.length > 0) {
      const variantStr = r.pharmacogenomic_profile.detected_variants
        .map((v) => `${v.rsid} (${v.star_allele})`)
        .join(", ");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text(`Variants: ${variantStr}`, margin, y);
      y += 4;
    }

    // Clinical recommendation
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text("Clinical Recommendation:", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const actionLines = doc.splitTextToSize(
      r.clinical_recommendation.action,
      pageWidth - margin * 2,
    );
    doc.text(actionLines, margin, y);
    y += actionLines.length * 3.5 + 1;

    // Alternatives
    if (r.clinical_recommendation.alternative_drugs?.length) {
      doc.setFontSize(7.5);
      doc.text(
        `Alternatives: ${r.clinical_recommendation.alternative_drugs.join(", ")}`,
        margin,
        y,
      );
      y += 4;
    }

    // Guideline reference
    if (r.clinical_recommendation.guideline_reference) {
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text(r.clinical_recommendation.guideline_reference, margin, y);
      y += 4;
    }

    // AI explanation (if available)
    const explanation = r.llm_generated_explanation;
    if (explanation) {
      if (y > 250) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 118, 110);
      doc.text("AI Clinical Explanation", margin, y);
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(7.5);

      const summaryLines = doc.splitTextToSize(explanation.summary, pageWidth - margin * 2);
      doc.text(summaryLines, margin, y);
      y += summaryLines.length * 3 + 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("Mechanism:", margin, y);
      y += 3;
      doc.setFont("helvetica", "normal");
      const mechLines = doc.splitTextToSize(explanation.mechanism, pageWidth - margin * 2);
      doc.text(mechLines, margin, y);
      y += mechLines.length * 3 + 2;

      doc.setFont("helvetica", "bold");
      doc.text("Recommendation:", margin, y);
      y += 3;
      doc.setFont("helvetica", "normal");
      const recLines = doc.splitTextToSize(explanation.recommendation, pageWidth - margin * 2);
      doc.text(recLines, margin, y);
      y += recLines.length * 3 + 2;

      if (explanation.citations) {
        doc.setFont("helvetica", "bold");
        doc.text("Citations:", margin, y);
        y += 3;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        const citLines = doc.splitTextToSize(explanation.citations, pageWidth - margin * 2);
        doc.text(citLines, margin, y);
        y += citLines.length * 2.5 + 2;
      }
    }

    y += 4;
  }

  // ── Footer disclaimer ──
  if (y > 260) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "italic");
  const disclaimer = doc.splitTextToSize(
    "DISCLAIMER: This report is generated by PharmaGuard for clinical decision support and educational purposes only. " +
    "Risk classifications are based on CPIC Tier 1A guidelines. AI-generated explanations are supplementary and should not replace clinical judgment. " +
    "Always confirm pharmacogenomic findings with a qualified clinician before making prescribing decisions. " +
    "Genetic data was parsed locally in the browser and was not uploaded to any server.",
    pageWidth - margin * 2,
  );
  doc.text(disclaimer, margin, y);

  // ── Save ──
  doc.save(`PharmaGuard-${patientId}-${Date.now()}.pdf`);
}
