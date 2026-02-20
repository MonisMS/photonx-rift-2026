import { describe, it, expect } from "vitest";
import { validateRequest } from "@/lib/validator";

// ─── Valid Requests ───────────────────────────────────────────────────────────

describe("Validator — Valid Requests", () => {
  it("accepts a fully valid request", () => {
    const result = validateRequest({
      patientId: "PATIENT_001",
      variants: [
        { gene: "CYP2D6", starAllele: "*4", rsid: "rs3892097" },
      ],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(true);
    expect(result.variants).toHaveLength(1);
    expect(result.drugs).toEqual(["CODEINE"]);
    expect(result.patientId).toBe("PATIENT_001");
  });

  it("accepts all 6 core drugs", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
      drugs: [
        "CODEINE", "WARFARIN", "CLOPIDOGREL",
        "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL",
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.drugs).toHaveLength(6);
  });

  it("trims patientId whitespace", () => {
    const result = validateRequest({
      patientId: "  PAT_001  ",
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(true);
    expect(result.patientId).toBe("PAT_001");
  });

  it("accepts variants with letter-suffix star alleles (*3A, *2A, *1a)", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [
        { gene: "TPMT", starAllele: "*3A", rsid: "rs1800460" },
        { gene: "DPYD", starAllele: "*2A", rsid: "rs3918290" },
        { gene: "SLCO1B1", starAllele: "*1a", rsid: "rs4149056" },
      ],
      drugs: ["AZATHIOPRINE"],
    });
    expect(result.valid).toBe(true);
    expect(result.variants).toHaveLength(3);
  });

  it("accepts copy-number alleles (*2xN)", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [
        { gene: "CYP2D6", starAllele: "*2xN", rsid: "rs1234567" },
      ],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(true);
  });
});

// ─── Invalid PatientId ────────────────────────────────────────────────────────

describe("Validator — PatientId Validation", () => {
  it("rejects missing patientId", () => {
    const result = validateRequest({
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("patient ID");
  });

  it("rejects empty string patientId", () => {
    const result = validateRequest({
      patientId: "",
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects whitespace-only patientId", () => {
    const result = validateRequest({
      patientId: "   ",
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects numeric patientId", () => {
    const result = validateRequest({
      patientId: 12345,
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
  });
});

// ─── Invalid Variants ─────────────────────────────────────────────────────────

describe("Validator — Variant Validation", () => {
  it("rejects missing variants array", () => {
    const result = validateRequest({
      patientId: "TEST",
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("No variants");
  });

  it("rejects empty variants array", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects variants with unsupported gene", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [
        { gene: "CYP3A4", starAllele: "*22", rsid: "rs35599367" },
      ],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("No variants or sequenced genes");
  });

  it("rejects variants with invalid star allele format", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [
        { gene: "CYP2D6", starAllele: "bad_allele", rsid: "rs3892097" },
      ],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects variants with invalid rsid format", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [
        { gene: "CYP2D6", starAllele: "*4", rsid: "not_an_rsid" },
      ],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
  });

  it("filters out invalid variants but keeps valid ones", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [
        { gene: "CYP2D6", starAllele: "*4", rsid: "rs3892097" },     // valid
        { gene: "INVALID", starAllele: "*1", rsid: "rs1234567" },     // bad gene
        { gene: "CYP2C19", starAllele: "bad", rsid: "rs4244285" },   // bad allele
        { gene: "CYP2C9", starAllele: "*2", rsid: "rs1799853" },     // valid
      ],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(true);
    expect(result.variants).toHaveLength(2);
  });

  it("rejects null variants", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [null, undefined],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects variants that are plain strings", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: ["CYP2D6", "*4"],
      drugs: ["CODEINE"],
    });
    expect(result.valid).toBe(false);
  });
});

// ─── Invalid Drugs ────────────────────────────────────────────────────────────

describe("Validator — Drug Validation", () => {
  it("rejects missing drugs array", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("No drugs");
  });

  it("rejects empty drugs array", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
      drugs: [],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects unsupported drugs", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
      drugs: ["ASPIRIN"],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("No supported drugs");
  });

  it("normalizes lowercase drug names to uppercase", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
      drugs: ["codeine"],
    });
    expect(result.valid).toBe(true);
    expect(result.drugs).toEqual(["CODEINE"]);
  });

  it("filters unsupported drugs but keeps core drugs", () => {
    const result = validateRequest({
      patientId: "TEST",
      variants: [{ gene: "CYP2D6", starAllele: "*1", rsid: "rs3892097" }],
      drugs: ["CODEINE", "ASPIRIN", "WARFARIN"],
    });
    expect(result.valid).toBe(true);
    expect(result.drugs).toEqual(["CODEINE", "WARFARIN"]);
  });
});

// ─── Malformed Body ───────────────────────────────────────────────────────────

describe("Validator — Malformed Request Body", () => {
  it("rejects null body", () => {
    const result = validateRequest(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid request body");
  });

  it("rejects undefined body", () => {
    const result = validateRequest(undefined);
    expect(result.valid).toBe(false);
  });

  it("rejects string body", () => {
    const result = validateRequest("not an object");
    expect(result.valid).toBe(false);
  });

  it("rejects number body", () => {
    const result = validateRequest(42);
    expect(result.valid).toBe(false);
  });

  it("rejects empty object", () => {
    const result = validateRequest({});
    expect(result.valid).toBe(false);
  });
});
