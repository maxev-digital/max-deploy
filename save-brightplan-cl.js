const { PrismaClient } = require('@prisma/client');
const { spawnSync } = require('child_process');
const { existsSync, mkdirSync, copyFileSync } = require('fs');
const path = require('path');

const p = new PrismaClient();
const OPP_ID = 'cmq07qewc0000jyuw7e4qzb6s';

const CSS = `<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#0F172A;--blue2:#2563EB;--orange2:#EA580C;
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

const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
${CSS}
</head>
<body>
<div class="header">
  <div><div class="name">Will Austin</div><div class="title">Applied AI Engineer &middot; BrightPlan</div></div>
  <div class="header-right">
    <div class="contact-line">214-232-0222</div>
    <div class="contact-line">info@max-ev-holdings.com</div>
    <div class="contact-line">Frisco, TX &nbsp;&middot;&nbsp; Remote USA &nbsp;&middot;&nbsp; github.com/maxev-digital</div>
  </div>
</div>
<div class="meta">
  <div class="meta-date">${date}</div>
  <div class="recipient-block"><div class="company">BrightPlan</div>Hiring Team<br/>Applied AI Engineer</div>
</div>
<div class="subject"><div class="subject-label">Re: Application</div><div class="subject-text">Applied AI Engineer &mdash; BrightPlan &middot; $125&ndash;155K</div></div>
<p class="body-text">BrightPlan&rsquo;s &ldquo;Just Ask&rdquo; launched in August 2024 as a generative overlay on your patented Financial Wellness Coach. Reading the JD alongside what you already have in production, my best inference is that this role is about building on top of and extending that layer &mdash; better retrieval from structured financial data, stronger response grounding for fiduciary compliance, and tooling to iterate on prompt quality at scale. I could be reading the scope wrong, but that&rsquo;s the build I designed against.</p>
<p class="body-text">I built a working prototype of that same pattern &mdash; a RAG layer that grounds responses in retrieved knowledge and structured user context, with a prompt evaluation layer for iterating on quality. It won&rsquo;t reflect the complexity of your existing platform, but it reflects how I&rsquo;d approach the integration layer on day one. The architecture is in the portfolio on GitHub.</p>
<div class="callout">
  <div class="callout-label">Direct alignment &mdash; Applied AI Engineer</div>
  <ul>
    <li><strong>Python + FastAPI backend:</strong> Build and maintain Python-based API services backing production AI workflows &mdash; prompt construction, structured output enforcement, response validation, and routing logic at the API boundary integrated directly against Anthropic&rsquo;s Claude API.</li>
    <li><strong>RAG + pgvector:</strong> Designed the retrieval architecture in the prototype above &mdash; document chunking strategy, embedding pipeline, semantic search over a financial document corpus, and context injection into Claude prompts for grounded responses.</li>
    <li><strong>Prompt evaluation + fiduciary grounding:</strong> Current system runs evaluation loops tied to quality thresholds, flagging responses that fall below accuracy benchmarks before reaching users. For a product with fiduciary obligations, that&rsquo;s not a nice-to-have &mdash; every response needs to be traceable back to a retrieved source, not generated from model weights alone.</li>
    <li><strong>Claude Code as primary tooling:</strong> I use Claude Code CLI on every engagement &mdash; plan mode, full business and technical context upfront, review every proposal, own every implementation decision. BrightPlan explicitly lists this as a requirement; it&rsquo;s how I&rsquo;ve shipped everything in my portfolio.</li>
  </ul>
</div>
<div class="closing">
  <p class="closing-line">I bring 12 years of general management and P&amp;L experience before moving into technical work. That background means I scope AI features against actual business outcomes &mdash; something that matters when building tools that affect real employees&rsquo; financial decisions.</p>
  <p class="closing-line">Based in Frisco, TX, fully remote, and available immediately.</p>
  <div class="sig-name">Will Austin</div>
  <div class="sig-title">Applied AI Engineer &middot; BrightPlan</div>
</div>
<div class="doc-footer">
  <div class="footer-left">Will Austin &nbsp;&middot;&nbsp; 214-232-0222 &nbsp;&middot;&nbsp; info@max-ev-holdings.com &nbsp;&middot;&nbsp; Frisco, TX &nbsp;&middot;&nbsp; github.com/maxev-digital</div>
  <div class="footer-right">maxevdigital.com</div>
</div>
</body>
</html>`;

async function main() {
  // 1. Save HTML to DB
  const existing = await p.opportunity.findUnique({ where: { id: OPP_ID }, select: { analysisJson: true } });
  const prev = (existing?.analysisJson ?? {});
  await p.opportunity.update({
    where: { id: OPP_ID },
    data: { analysisJson: { ...prev, coverLetterHtml: html } },
  });
  console.log('HTML saved to DB');

  // 2. Generate PDF via chromium (same pattern as generate-pdf.ts)
  const pdfName = `${OPP_ID}.pdf`;
  const outDir  = path.join(process.cwd(), 'public', 'cover-letters');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const snapHome = `/root/snap/chromium/common`;
  const tmpPdf   = path.join(snapHome, pdfName);
  const outPdf   = path.join(outDir, pdfName);
  const renderUrl = `http://localhost:3200/api/render/${OPP_ID}`;

  const result = spawnSync('chromium-browser', [
    '--headless=new', '--no-sandbox', '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', '--disable-gpu',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    `--print-to-pdf=${tmpPdf}`,
    renderUrl,
  ], { timeout: 45000 });

  if (result.error) { console.error('Chromium error:', result.error.message); }

  if (existsSync(tmpPdf)) {
    copyFileSync(tmpPdf, outPdf);
    await p.opportunity.update({
      where: { id: OPP_ID },
      data: { coverLetterUrl: `/cover-letters/${pdfName}` },
    });
    console.log('PDF saved:', outPdf);
  } else {
    console.log('Chromium ran but PDF not found — check render URL manually');
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
