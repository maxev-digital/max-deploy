/**
 * retro-merge.js — One-off: merge existing CL PDFs with resume for the 10
 * already generated, update coverLetterUrl in DB to the application bundle.
 */
require('dotenv').config({ path: '/var/www/max-deploy/.env' });
const { PrismaClient } = require('@prisma/client');
const { PDFDocument }  = require('pdf-lib');
const { existsSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');

const prisma     = new PrismaClient();
const RESUME_PDF = '/var/www/max-deploy/public/will-austin-fde-resume.pdf';
const CL_DIR     = '/var/www/max-deploy/public/cover-letters';

async function mergePdfs(clPath, resumePath, outPath) {
  const clDoc  = await PDFDocument.load(readFileSync(clPath));
  const resDoc = await PDFDocument.load(readFileSync(resumePath));
  const merged = await PDFDocument.create();
  (await merged.copyPages(clDoc,  clDoc.getPageIndices())).forEach(p => merged.addPage(p));
  (await merged.copyPages(resDoc, resDoc.getPageIndices())).forEach(p => merged.addPage(p));
  writeFileSync(outPath, await merged.save());
}

async function main() {
  // Find all opps that have a CL PDF but no -app.pdf yet
  const opps = await prisma.opportunity.findMany({
    where: {
      coverLetterUrl: { contains: '/cover-letters/' },
      NOT: { coverLetterUrl: { contains: '-app.pdf' } },
    },
    select: { id: true, company: true, role: true, fitScore: true, coverLetterUrl: true },
    orderBy: { fitScore: 'desc' },
  });

  console.log(`Found ${opps.length} CLs to retrofit with resume merge\n`);

  for (const opp of opps) {
    const clPath  = path.join(CL_DIR, `${opp.id}.pdf`);
    const appPath = path.join(CL_DIR, `${opp.id}-app.pdf`);

    if (!existsSync(clPath)) {
      console.log(`SKIP ${opp.company} — CL PDF not found on disk`);
      continue;
    }

    try {
      await mergePdfs(clPath, RESUME_PDF, appPath);
      await prisma.opportunity.update({
        where: { id: opp.id },
        data:  { coverLetterUrl: `/cover-letters/${opp.id}-app.pdf` },
      });
      console.log(`OK   ${opp.fitScore} | ${opp.company} — ${opp.role.trim()}`);
    } catch (e) {
      console.log(`FAIL ${opp.company}: ${e.message}`);
    }
  }

  await prisma.$disconnect();
  console.log('\nDone.');
}
main().catch(e => { console.error(e); process.exit(1); });
