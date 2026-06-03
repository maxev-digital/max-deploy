/**
 * Cover letter HTML builder — exact same template as smart-apply.js.
 * Generates a 1-page letter via @page CSS. Print to PDF from browser.
 */

export interface CoverLetterConfig {
  company:         string;
  role:            string;
  headerTitle:     string;  // e.g. "Forward Deployed Engineer · Anthropic"
  subjectText:     string;  // one-line subject
  intro:           string;  // opening paragraph (HTML allowed)
  bullets:         string[]; // 3-4 callout bullets (HTML allowed)
  closingLine:     string;  // e.g. "Available immediately, remote-first, open to Dallas on-site."
  showFdeFramework?: boolean; // adds 7-step methodology callout for FDE roles
  date?:           string;  // defaults to today
}

const CANDIDATE = {
  name:     'Will Austin',
  email:    'info@max-ev-holdings.com',
  phone:    '214-232-0222',
  location: 'Little Elm, TX',
  remote:   'Remote USA',
  github:   'github.com/maxev-digital',
  demo:     'maxevdigital.com',
};

const CSS = `<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#0F172A;--navy2:#1E293B;--navy3:#334155;
  --blue:#1E40AF;--blue2:#2563EB;--blue3:#3B82F6;
  --orange:#C2410C;--orange2:#EA580C;--orange3:#FB923C;
  --bg:#FFFFFF;--card:#F8FAFC;--card2:#F1F5F9;--border:rgba(0,0,0,0.08);
  --ink:#0F172A;--body:#334155;--muted:#64748B;
  --font-display:"Bebas Neue",sans-serif;
  --font-body:"Inter",-apple-system,sans-serif;
  --radius:4px
}
@page{size:letter;margin:0.28in 0.5in}
.page-break{page-break-after:always}
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
.callout{margin:6px 0;padding:6px 12px;background:var(--card);border:1px solid var(--border);border-left:3px solid var(--blue2);border-radius:0 var(--radius) var(--radius) 0;page-break-inside:avoid;break-inside:avoid}
.callout-label{font-size:6pt;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:var(--blue2);margin-bottom:4px}
.callout ul{list-style:none;padding:0}
.callout ul li{font-size:8.5pt;color:var(--body);line-height:1.30;padding-left:12px;position:relative;margin-bottom:2px}
.callout ul li::before{content:">";position:absolute;left:1px;color:var(--blue2);font-weight:700;font-size:10pt;line-height:1.2}
.callout.orange{border-left-color:var(--orange2)}
.callout.orange .callout-label{color:var(--orange2)}
.callout.orange ul li::before{color:var(--orange2)}
.closing{margin-top:6px}
.closing-line{font-size:9pt;color:var(--body);margin-bottom:10px}
.sig-name{font-family:var(--font-display);font-size:20pt;letter-spacing:0.05em;color:var(--navy);line-height:1;margin-bottom:3px}
.sig-title{font-size:7.5pt;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:var(--blue2)}
.doc-footer{margin-top:8px;padding-top:6px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.footer-left{font-size:7pt;color:var(--muted)}
.footer-right{font-size:7pt;color:var(--blue2);font-weight:700}
</style>`;

export function buildCoverLetterHtml(cfg: CoverLetterConfig): string {
  const date = cfg.date ?? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const bullets = cfg.bullets.map(b => `    <li>${b}</li>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
${CSS}
</head>
<body>
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
<div class="callout orange">
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
</body>
</html>`;
}
