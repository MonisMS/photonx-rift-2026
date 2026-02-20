# Sample VCF Files

This folder contains example `.vcf` files used to validate PharmaGuard deployments and for inclusion in the RIFT 2026 GitHub app report.

Available samples:

- `sample_all_normal.vcf` — All 6 genes as *1 (normal) → all drugs Safe.
- `sample_codeine_pm.vcf` — CYP2D6 poor metabolizer → CODEINE Ineffective.
- `sample_codeine_toxic.vcf` — CYP2D6 ultra-rapid risk → CODEINE Toxic.
- `sample_multi_risk.vcf` — Multiple risk variants across genes → mix of Adjust Dosage and Toxic.
- `sample_mixed_coverage.vcf` — Mixed allele coverage → tests partial genotype handling.
- `sample_urm.vcf` — Ultra-rapid metabolizer case.
- `sample_worst_case.vcf` — Worst-case risk variants across all supported genes.

Use these files in your deployed instance to:

- Verify the CPIC risk engine behaves deterministically.
- Capture screenshots for your GitHub app report.
- Demonstrate end-to-end flows in the LinkedIn demo video.
