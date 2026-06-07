const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const archived = await p.opportunity.findMany({
    where: { source: 'email_job_alert', stage: 'archived' },
    select: { company: true, role: true, stage: true, notes: true, createdAt: true },
  });
  console.log('\nArchived email_job_alert entries:', archived.length);
  for (const r of archived) console.log(' -', r.company, '|', r.role, '|', r.notes);

  const counts = await p.opportunity.groupBy({
    by: ['stage'],
    where: { source: 'email_job_alert' },
    _count: { _all: true },
  });
  console.log('\nAll email_job_alert by stage:');
  for (const c of counts) console.log(' ', c.stage, ':', c._count._all);

  // Check dedup worker existence
  const total = await p.opportunity.count({ where: { source: 'email_job_alert' } });
  console.log('\nTotal email_job_alert in DB:', total);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
