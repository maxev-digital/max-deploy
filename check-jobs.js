const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const rows = await p.opportunity.findMany({
    where: { source: 'email_job_alert', createdAt: { gte: since } },
    select: { id: true, company: true, role: true, stage: true, fitScore: true, notes: true, createdAt: true },
    orderBy: { fitScore: 'desc' },
  });

  console.log(`\nTotal: ${rows.length} jobs added in last 3h\n`);
  console.log('FitScore | Stage  | Company                          | Role');
  console.log('---------|--------|----------------------------------|----------------------------------');
  for (const r of rows) {
    const score = r.fitScore != null ? String(r.fitScore).padStart(3) + '%' : ' N/A ';
    const stage = (r.stage || '').padEnd(6);
    const co    = (r.company || '').slice(0, 32).padEnd(32);
    const role  = (r.role || '').slice(0, 40);
    console.log(`   ${score}  | ${stage} | ${co} | ${role}`);
    if (r.notes) console.log(`           |        | ${r.notes.slice(0, 70)}`);
  }

  // Check for same-company duplicates across ALL email_job_alert entries
  const all = await p.opportunity.findMany({
    where: { source: 'email_job_alert' },
    select: { company: true, role: true, stage: true, fitScore: true },
    orderBy: { company: 'asc' },
  });

  const byCompany = {};
  for (const r of all) {
    const key = r.company.toLowerCase().trim();
    if (!byCompany[key]) byCompany[key] = [];
    byCompany[key].push(r);
  }

  const dupes = Object.entries(byCompany).filter(([, v]) => v.length > 1);
  if (dupes.length) {
    console.log(`\n\nCompanies with multiple listings (${dupes.length} companies):`);
    for (const [co, listings] of dupes) {
      console.log(`\n  ${co} (${listings.length} listings):`);
      for (const l of listings) {
        console.log(`    - [${l.stage}] ${l.role} ${l.fitScore != null ? '(' + l.fitScore + '%)' : ''}`);
      }
    }
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
