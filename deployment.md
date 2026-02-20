# PharmaGuard Deployment Guide

This guide covers how to deploy PharmaGuard for the RIFT 2026 submission and for your own environments.

- Primary target: Vercel (recommended for Next.js)
- Alternative: Irini (Kubernetes-style app platform)

---

## 1. Prerequisites

- Node.js 22+
- pnpm installed (`corepack enable` recommended)
- Access to Gemini API (Google AI Studio)
- Optional: OpenRouter + OpenAI keys for fallback models

Clone and install:

```bash
git clone https://github.com/MonisMS/photonx-rift-2026
cd photonx-rift-2026
pnpm install
cp .env.example .env.local
# Fill in at least GOOGLE_API_KEY_1
```

Use the sample VCF files in `public/samples/` to verify the deployment after it is live.

---

## 2. Vercel Deployment (Recommended)

1. Push this repo to your own GitHub account (or fork it).
2. Go to https://vercel.com → **New Project** → import the repo.
3. Framework preset: **Next.js**.
4. Root directory: project root (where `next.config.ts` and `app/` live).
5. Build & output settings (Vercel defaults):
   - Build command: `pnpm build`
   - Install command: `pnpm install`
   - Output directory: `.vercel/output` (handled automatically by Next 16 on Vercel).
6. Add environment variables in Vercel → **Settings → Environment Variables**:
   - `GOOGLE_API_KEY_1` (required)
   - `GOOGLE_API_KEY_2..4` (optional)
   - `OPENROUTER_API_KEY` (optional)
   - `OPENAI_API_KEY` (optional, but recommended)
7. Click **Deploy**.

After deployment:

- Open the Vercel URL.
- Upload `public/samples/sample_all_normal.vcf` and run analysis.
- Confirm you get valid risk cards and (if keys are set) AI explanations.

---

## 3. Irini Deployment

Use `irini.example` in the repo as a starting point for your Irini configuration.

### 3.1 Build container image

```bash
# From project root
pnpm install
pnpm build

# Example Dockerfile build (if Irini uses images from your registry)
# docker build -t your-registry.example.com/pharmaguard:latest .
# docker push your-registry.example.com/pharmaguard:latest
```

### 3.2 Configure Irini

1. Copy `irini.example` to the format required by your Irini environment (e.g. `irini.yaml` in your repo or via the Irini UI).
2. Update:
   - `image.repository` and `image.tag` to point to your container.
   - `service.name` and `ingress.host` to your chosen service name and domain.
   - `env` section with real API keys (matching `.env.example`).
3. Apply the configuration via Irini (UI or CLI).

### 3.3 Verify the deployment

Once Irini exposes the service URL:

1. Open the URL in a browser.
2. Upload one of the bundled VCF samples from `public/samples/`:
   - `sample_all_normal.vcf`
   - `sample_multi_risk.vcf`
   - `sample_worst_case.vcf`
3. Enter a test Patient ID (e.g. `TEST_PATIENT_001`).
4. Select one or more drugs (e.g. `CODEINE, WARFARIN, SIMVASTATIN`).
5. Click **Run Clinical Risk Analysis** and confirm results render.

---

## 4. Post-Deployment Checks (for GitHub / RIFT Report)

For your GitHub app report / RIFT submission, confirm that the deployed instance:

- Accepts `.vcf` upload and parses successfully.
- Shows deterministic CPIC risk outputs for the sample files in `public/samples/`.
- Returns JSON that matches the schema described in README.md.
- Provides clear failure messages when API keys are missing or rate-limited.

When writing the report, reference concrete examples from the sample VCFs, such as:

- `sample_codeine_pm.vcf` → CODEINE classified as **Ineffective**.
- `sample_multi_risk.vcf` → multiple drugs with **Adjust Dosage** or **Toxic** labels.

This demonstrates that your deployment is correct and clinically meaningful using the included test data.
