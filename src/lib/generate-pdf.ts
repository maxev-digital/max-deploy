import { spawn }       from 'child_process';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import path             from 'path';

const CHROMIUM = 'chromium-browser';
// Snap Chromium writes to its own sandboxed /tmp
const SNAP_TMP = '/tmp/snap-private-tmp/snap.chromium/tmp';
const OUT_DIR  = path.join(process.cwd(), 'public', 'cover-letters');

export async function generateCoverLetterPdf(
  opportunityId: string
): Promise<string | null> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  if (!existsSync(SNAP_TMP)) mkdirSync(SNAP_TMP, { recursive: true });

  const pdfName = `cl-${opportunityId}.pdf`;
  const pdfSnap = path.join(SNAP_TMP, pdfName);
  const outPdf  = path.join(OUT_DIR, `${opportunityId}.pdf`);

  // Use localhost HTTP so Chromium can load Google Fonts (blocked on file://)
  const renderUrl = `http://localhost:3200/api/render/${opportunityId}`;

  return new Promise((resolve) => {
    const proc = spawn(CHROMIUM, [
      '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=5000', // wait up to 5s for fonts/resources
      `--print-to-pdf=/tmp/${pdfName}`,
      renderUrl,
    ]);

    const timer = setTimeout(() => { proc.kill(); resolve(null); }, 45000);

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
