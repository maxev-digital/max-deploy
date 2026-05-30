import { spawn }       from 'child_process';
import { writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import path             from 'path';

const CHROMIUM   = 'chromium-browser';
// Snap Chromium maps /tmp → its own sandbox; actual writes go here
const SNAP_TMP   = '/tmp/snap-private-tmp/snap.chromium/tmp';
const OUT_DIR    = path.join(process.cwd(), 'public', 'cover-letters');

export async function generateCoverLetterPdf(
  html: string,
  opportunityId: string
): Promise<string | null> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const slug     = opportunityId.replace(/[^a-z0-9]/gi, '');
  // Chromium sees these as /tmp/... but writes to SNAP_TMP/...
  const htmlName = `cl-${slug}.html`;
  const pdfName  = `cl-${slug}.pdf`;
  const htmlSnap = path.join(SNAP_TMP, htmlName);
  const pdfSnap  = path.join(SNAP_TMP, pdfName);
  const outPdf   = path.join(OUT_DIR, `${opportunityId}.pdf`);

  // Write HTML where snap Chromium can read it
  if (!existsSync(SNAP_TMP)) mkdirSync(SNAP_TMP, { recursive: true });
  writeFileSync(htmlSnap, html, 'utf8');

  return new Promise((resolve) => {
    const proc = spawn(CHROMIUM, [
      '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--run-all-compositor-stages-before-draw',
      `--print-to-pdf=/tmp/${pdfName}`, // chromium sees /tmp, writes to snap sandbox
      `file:///tmp/${htmlName}`,
    ]);

    const timer = setTimeout(() => { proc.kill(); resolve(null); }, 30000);

    proc.on('close', () => {
      clearTimeout(timer);
      if (existsSync(pdfSnap)) {
        copyFileSync(pdfSnap, outPdf);
        resolve(`/cover-letters/${opportunityId}.pdf`);
      } else {
        resolve(null);
      }
    });

    proc.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}
