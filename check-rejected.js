const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Rejected/closed opportunities
  const rejected = await p.opportunity.findMany({
    where: { stage: { in: ['rejected', 'withdrawn', 'closed'] } },
    select: { company: true, role: true, stage: true, notes: true, lastActivity: true, source: true },
    orderBy: { lastActivity: 'desc' },
    take: 30,
  });

  console.log(`\nRejected/Closed/Withdrawn: ${rejected.length} total\n`);
  console.log('Stage      | Last Activity | Source              | Company                     | Role');
  console.log('-----------|---------------|---------------------|-----------------------------|---------------------------');
  for (const r of rejected) {
    const stage  = (r.stage || '').padEnd(9);
    const date   = r.lastActivity ? r.lastActivity.toISOString().slice(0, 10) : 'unknown   ';
    const src    = (r.source || '').slice(0, 19).padEnd(19);
    const co     = (r.company || '').slice(0, 27).padEnd(27);
    const role   = (r.role || '').slice(0, 35);
    console.log(`${stage} | ${date}  | ${src} | ${co} | ${role}`);
    if (r.notes && r.notes.includes('[Auto-detected')) {
      const note = r.notes.split('\n').find(l => l.includes('[Auto-detected'));
      if (note) console.log(`           |               |                     | >> ${note.trim()}`);
    }
  }

  // Also show pipeline stage counts
  const counts = await p.opportunity.groupBy({
    by: ['stage'],
    _count: { _all: true },
    orderBy: { _count: { _all: 'desc' } },
  });
  console.log('\nFull pipeline stage counts:');
  for (const c of counts) console.log(`  ${(c.stage || 'null').padEnd(15)} : ${c._count._all}`);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
