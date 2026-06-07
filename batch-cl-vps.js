#!/usr/bin/env node
/**
 * batch-cl-vps.js — Run on VPS to bulk-generate cover letters.
 * Usage: node batch-cl-vps.js [limit]   (default: 10)
 *
 * Queries top N apply_now opps without a CL, generates via Claude Sonnet,
 * builds HTML, saves to DB, renders PDF via chromium, updates coverLetterUrl.
 * Outputs a JSON summary to stdout for the local merge script.
 */

require('dotenv').config({ path: '/var/www/max-deploy/.env' });
const { PrismaClient }  = require('@prisma/client');
const Anthropic         = require('@anthropic-ai/sdk').default;
const { PDFDocument }   = require('pdf-lib');
const { spawnSync }     = require('child_process');
const { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } = require('fs');
const path              = require('path');

const RESUME_PDF = '/var/www/max-deploy/public/will-austin-fde-resume.pdf';

async function mergePdfs(clPath, resumePath, outPath) {
  const clBytes  = readFileSync(clPath);
  const resBytes = readFileSync(resumePath);
  const clDoc    = await PDFDocument.load(clBytes);
  const resDoc   = await PDFDocument.load(resBytes);
  const merged   = await PDFDocument.create();
  const clPages  = await merged.copyPages(clDoc,  clDoc.getPageIndices());
  const resPages = await merged.copyPages(resDoc, resDoc.getPageIndices());
  clPages.forEach(p  => merged.addPage(p));
  resPages.forEach(p => merged.addPage(p));
  writeFileSync(outPath, await merged.save());
}

const prisma    = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const LIMIT     = parseInt(process.argv[2] || '10', 10);

// ─── Candidate ───────────────────────────────────────────────────────────────
const CANDIDATE = {
  name:     'Will Austin',
  email:    'info@max-ev-holdings.com',
  phone:    '214-232-0222',
  location: 'Frisco, TX',
  remote:   'Remote USA',
  github:   'github.com/maxev-digital',
  demo:     'maxevdigital.com',
};

// ─── Profile (matches draft-cover-letter.ts) ─────────────────────────────────
const PROFILE = `
Name: Will Austin
Contact: 214-232-0222 | info@max-ev-holdings.com | Frisco, TX | github.com/maxev-digital

Methodology:
I design every system by first mapping the business problem to the right ratio of
deterministic automation vs. agentic intelligence. Fixed-logic automation (scheduled workers,
rule-based routing, queues, webhooks) handles predictable, high-volume, cost-sensitive tasks
where reliability and auditability matter. Agentic capabilities (Claude API, MCP protocol,
multi-model routing, dynamic tool use) are applied selectively only where judgment, ambiguity,
or complex reasoning creates measurable value over fixed logic.

Engagement Process (7 steps, every client):
1. Discovery & Business Alignment: structured session to surface the real problem,
   success criteria, and operational constraints (not just the stated requirements)
2. Rapid Scoping: smallest viable first deployment; bias for shipping over perfection
3. Architecture & Context Setup: decide deterministic vs. agentic per workflow component
4. Agentic Build: Claude API, MCP, Zod-validated output schemas, HITL checkpoints
5. Stakeholder Validation: working software in front of real users, same day or next day
6. Production Deployment: real data, never staging; full observability on AI flows
7. Continuous Iteration: driven by actual usage metrics and defined success criteria

Background:
12 years in general management and P&L ownership across multi-location operations.
Systems leadership in commercial construction: seven-figure project delivery, competitive
proposals, multi-stakeholder coordination. 100+ client engagements across 30+ years.
This operational context informs how technical solutions get scoped, communicated,
and measured against business outcomes.

Stack: Python, TypeScript, Next.js, PostgreSQL, Claude/Anthropic API, MCP protocol,
multi-model routing, Docker, VPS, Twilio, REST API design, 50+ AI endpoints in production
`.trim();

const FDE_KEYWORDS = [
  'FDE', 'Forward Deployed', 'Applied AI', 'Solutions Engineer', 'Solutions Architect',
  'AI Platform', 'Technical Specialist', 'Technical Lead', 'Implementation', 'Customer Engineer',
  'Client Engineer', 'Deployment', 'Field Engineer',
];

// ─── Prompt builder (matches draft-cover-letter.ts) ──────────────────────────
function buildPrompt(opp) {
  const isFde = FDE_KEYWORDS.some(kw =>
    opp.role.toLowerCase().includes(kw.toLowerCase()) ||
    (opp.classification || '').includes('FDE')
  );

  const fdeFramework = isFde ? `\nThis is a client-facing or forward-deployed role. The hiring manager wants to see that
you understand the client engagement motion end-to-end — not just the technical build.
Show that you have a practiced process for running customer deployments from discovery
to production.\n` : '';

  return `You are writing a targeted cover letter for Will Austin applying to a specific job.${fdeFramework}

CANDIDATE PROFILE:
${PROFILE}

JOB:
Company: ${opp.company}
Role: ${opp.role}
${opp.salaryMin ? `Salary: $${opp.salaryMin.toLocaleString()}${opp.salaryMax ? `--$${opp.salaryMax.toLocaleString()}` : '+'}` : ''}
Job Description:
${(opp.jdText || '').slice(0, 4000)}
${opp.companyResearch ? `\nCOMPANY RESEARCH:\n${opp.companyResearch}\n` : ''}

Generate a cover letter for Will Austin applying to the role above.

THE LETTER'S ONE JOB: Show the hiring manager that you understand their specific challenge
and have a practiced, named process for solving it.

ABSOLUTE PROHIBITIONS:
1. NO PAST WORK: Never use "I built," "I developed," "I implemented," "I deployed," or
   "I shipped" as the main verb of a bullet. Every bullet describes what you WOULD DO.
2. NO CREDENTIAL COUNTS: Do not mention any numbers (platforms, endpoints, engagements)
   anywhere except the single closing line.
3. NO SELF-DESCRIPTION in the intro: The intro is about THEM.
4. FIRST PERSON ONLY: I, my, me. Never "Will," "he," or "his."
5. NO AI GIVEAWAYS: No double dash (--) or em dash anywhere. No ** markdown bold.
   Only <strong> HTML tags inside bullets.

STRUCTURE:
intro (3 sentences MAX):
  Sentence 1: Warm, specific opener connected to this company or role.
  Sentence 2: The core problem this role exists to solve.
  Sentence 3: What success looks like 90 days in.

bullets (3 only):
  Bullet 1 label: "Discovery & Problem Framing" — START WITH "In the first session..."
  Bullet 2 label: "Architecture Approach" — START WITH "For this deployment..." or "The architecture question here is..."
  Bullet 3 label: "Delivery & Validation" — START WITH "The first release..." or "Success criteria defined in session one..."

closingLine (2-3 sentences):
  Sentence 1: Brief credibility anchor, no counts.
  Sentence 2: Genuine interest in this specific company or role.
  Sentence 3: Availability and location. Direct and short.

Return ONLY valid JSON, no other text:
{
  "headerTitle": "<Role Title> - <Company>",
  "subjectText": "<Role> — <Company>",
  "intro": "<3 sentences>",
  "bullets": [
    "<strong>Discovery & Problem Framing:</strong> <2 sentences>",
    "<strong>Architecture Approach:</strong> <2 sentences>",
    "<strong>Delivery & Validation:</strong> <2 sentences>"
  ],
  "closingLine": "<2-3 sentences>"
}`;
}

// ─── HTML builder (matches cover-letter.ts) ───────────────────────────────────
const CSS = `<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#0F172A;--navy2:#1E293B;--navy3:#334155;
  --blue:#1E40AF;--blue2:#2563EB;--blue3:#3B82F6;
  --orange:#C2410C;--orange2:#EA580C;--orange3:#FB923C;
  --bg:#FFFFFF;--card:#F8FAFC;--card2:#F1F5F9;--border:rgba(0,0,0,0.08);
  --ink:#0F172A;--body:#334155;--muted:#64748B;
  --font-display:"Bebas Neue",sans-serif;
  --font-body:"Inter",-apple-system,sans-serif;--radius:4px
}
@page{size:letter;margin:0.28in 0.5in}
body{font-family:var(--font-body);font-size:9.5pt;line-height:1.52;color:var(--ink);background:var(--bg);max-width:8.5in;margin:0 auto;padding:0.28in 0.38in}
.header{background:var(--navy);margin:-0.32in -0.38in 18px;padding:18px 24px 16px;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid var(--blue2)}
.header .name{font-family:var(--font-display);font-size:32pt;letter-spacing:0.06em;line-height:1;color:#FFF}
.header .title{font-size:7.5pt;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#94A3B8;margin-top:5px}
.header-right{text-align:right}
.header-right .contact-line{font-size:8pt;color:#94A3B8;line-height:1.75}
.meta{margin-bottom:6px}
.meta-date{font-size:8.5pt;color:var(--muted);margin-bottom:6px}
.recipient-block{font-size:8.8pt;color:var(--body);line-height:1.6}
.recipient-block .company{font-weight:700;color:var(--ink);font-size:10pt}
.subject{margin-bottom:6px;padding:5px 14px;background:var(--card2);border-left:3px solid var(--blue2);border-radius:0 var(--radius) var(--radius) 0}
.subject-label{font-size:6pt;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--blue2);margin-bottom:2px}
.subject-text{font-size:9.5pt;font-weight:700;color:var(--ink)}
.body-text{font-size:9pt;color:var(--body);line-height:1.48;margin-bottom:6px}
.body-text strong{color:var(--ink);font-weight:700}
.callout{margin:6px 0;padding:6px 12px;background:var(--card);border:1px solid var(--border);border-left:3px solid var(--orange2);border-radius:0 var(--radius) var(--radius) 0;page-break-inside:avoid}
.callout-label{font-size:6pt;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:var(--orange2);margin-bottom:4px}
.callout ul{list-style:none;padding:0}
.callout ul li{font-size:8.5pt;color:var(--body);line-height:1.30;padding-left:12px;position:relative;margin-bottom:2px}
.callout ul li::before{content:">";position:absolute;left:1px;color:var(--orange2);font-weight:700;font-size:10pt;line-height:1.2}
.closing{margin-top:6px}
.closing-line{font-size:9pt;color:var(--body);margin-bottom:6px}
.sig-name{font-family:var(--font-display);font-size:20pt;letter-spacing:0.05em;color:var(--navy);line-height:1;margin-bottom:3px}
.sig-title{font-size:7.5pt;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:var(--blue2)}
.doc-footer{margin-top:8px;padding-top:6px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.footer-left{font-size:7pt;color:var(--muted)}
.footer-right{font-size:7pt;color:var(--blue2);font-weight:700}
</style>`;

function buildHtml(cfg) {
  const date    = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const bullets = cfg.bullets.map(b => `    <li>${b}</li>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
${CSS}</head><body>
<div class="header">
  <div><div class="name">${CANDIDATE.name}</div><div class="title">${cfg.headerTitle}</div></div>
  <div class="header-right">
    <div class="contact-line">${CANDIDATE.phone}</div>
    <div class="contact-line">${CANDIDATE.email}</div>
    <div class="contact-line">${CANDIDATE.location} &nbsp;&middot;&nbsp; ${CANDIDATE.remote} &nbsp;&middot;&nbsp; ${CANDIDATE.github}</div>
  </div>
</div>
<div class="meta">
  <div class="meta-date">${date}</div>
  <div class="recipient-block"><div class="company">${cfg.company}</div>Hiring Team<br/>${cfg.role}</div>
</div>
<div class="subject"><div class="subject-label">Re: Application</div><div class="subject-text">${cfg.subjectText}</div></div>
<p class="body-text">${cfg.intro}</p>
<div class="callout">
  <div class="callout-label">Direct alignment &mdash; ${cfg.role}</div>
  <ul>
${bullets}
  </ul>
</div>
<div class="closing">
  <div class="closing-line">${cfg.closingLine}</div>
  <div class="sig-name">${CANDIDATE.name}</div>
  <div class="sig-title">${cfg.headerTitle}</div>
</div>
<div class="doc-footer">
  <div class="footer-left">${CANDIDATE.name} &nbsp;&middot;&nbsp; ${CANDIDATE.phone} &nbsp;&middot;&nbsp; ${CANDIDATE.email} &nbsp;&middot;&nbsp; ${CANDIDATE.location} &nbsp;&middot;&nbsp; ${CANDIDATE.github}</div>
  <div class="footer-right">${CANDIDATE.demo}</div>
</div>
</body></html>`;
}

// ─── PDF via chromium ─────────────────────────────────────────────────────────
function generateClPdf(oppId) {
  const pdfName   = `${oppId}.pdf`;
  const snapTmp   = `/root/snap/chromium/common/${pdfName}`;
  const outDir    = '/var/www/max-deploy/public/cover-letters';
  const outPdf    = path.join(outDir, pdfName);
  const renderUrl = `http://localhost:3200/api/render/${oppId}`;

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  try { require('fs').unlinkSync(snapTmp); } catch {}

  spawnSync('chromium-browser', [
    '--headless=new', '--no-sandbox', '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', '--disable-gpu',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    `--print-to-pdf=${snapTmp}`,
    renderUrl,
  ], { timeout: 45000 });

  if (existsSync(snapTmp)) {
    copyFileSync(snapTmp, outPdf);
    return outPdf;
  }
  return null;
}

// ─── Slug from company + role ─────────────────────────────────────────────────
function makeSlug(company, role) {
  return `${company}-${role}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opps = await prisma.opportunity.findMany({
    where: {
      recommendedAction: 'apply_now',
      coverLetterUrl:    null,
      jdText:            { not: null },
      stage:             { notIn: ['dead', 'archived'] },
    },
    orderBy: { fitScore: 'desc' },
    take: LIMIT,
  });

  console.error(`Found ${opps.length} opps to process (limit ${LIMIT})`);

  const results = [];

  for (const opp of opps) {
    console.error(`\n[${results.length + 1}/${opps.length}] ${opp.company} — ${opp.role} (score: ${opp.fitScore})`);
    const existing = (opp.analysisJson || {});

    try {
      // 1. Mark pending
      await prisma.opportunity.update({
        where: { id: opp.id },
        data:  { analysisJson: { ...existing, clStatus: 'pending' } },
      });

      // 2. Call Claude
      const msg = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 1500,
        messages:   [{ role: 'user', content: buildPrompt({
          ...opp,
          companyResearch: existing.companyResearch || null,
        }) }],
      });

      const raw = msg.content[0].text.trim();
      const cfg = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));

      // 3. Build HTML
      const html = buildHtml({ company: opp.company, role: opp.role, ...cfg });

      // 4. Save HTML to DB
      await prisma.opportunity.update({
        where: { id: opp.id },
        data:  { analysisJson: { ...existing, coverLetterHtml: html, coverLetterConfig: cfg, clStatus: 'generating' } },
      });

      // 5. Generate CL PDF
      const clPdfPath = generateClPdf(opp.id);
      console.error(`   CL PDF: ${clPdfPath ? 'ok' : 'FAILED (html saved)'}`);

      // 6. Merge CL + resume into application PDF
      let appUrl = null;
      if (clPdfPath && existsSync(RESUME_PDF)) {
        const appPdfPath = path.join('/var/www/max-deploy/public/cover-letters', `${opp.id}-app.pdf`);
        await mergePdfs(clPdfPath, RESUME_PDF, appPdfPath);
        appUrl = `/cover-letters/${opp.id}-app.pdf`;
        console.error(`   App PDF: ${appUrl}`);
      }

      const clStatus = appUrl ? 'ready' : clPdfPath ? 'cl_only' : 'html_only';
      const finalUrl = appUrl || (clPdfPath ? `/cover-letters/${opp.id}.pdf` : `/cover-letter/${opp.id}`);

      // 7. Update DB
      await prisma.opportunity.update({
        where: { id: opp.id },
        data: {
          coverLetterUrl: finalUrl,
          analysisJson:   { ...existing, coverLetterHtml: html, coverLetterConfig: cfg, clStatus },
        },
      });

      results.push({
        id:      opp.id,
        company: opp.company,
        role:    opp.role,
        score:   opp.fitScore,
        slug:    makeSlug(opp.company, opp.role),
        appUrl,
        clPdfPath,
        status:  clStatus,
      });

    } catch (e) {
      console.error(`   ERROR: ${e.message}`);
      await prisma.opportunity.update({
        where: { id: opp.id },
        data:  { analysisJson: { ...existing, clStatus: 'failed' } },
      }).catch(() => {});
      results.push({ id: opp.id, company: opp.company, role: opp.role, score: opp.fitScore, status: 'failed', error: e.message });
    }
  }

  await prisma.$disconnect();

  // Output JSON summary to stdout for local merge script
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
