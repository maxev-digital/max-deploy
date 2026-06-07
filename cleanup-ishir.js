const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const all = await p.opportunity.findMany({
    where: { company: { contains: 'ishir', mode: 'insensitive' } },
    orderBy: { createdAt: 'asc' },
  });

  // Keep the one that's actually at 'interview' stage with the right role
  const keeper = all.find(r => r.stage === 'interview') ?? all[0];
  console.log(`Keeping: [${keeper.stage}] ${keeper.company} — ${keeper.role} (id: ${keeper.id})`);

  const toDelete = all.filter(r => r.id !== keeper.id);
  console.log(`Deleting ${toDelete.length} duplicates:`);
  for (const r of toDelete) {
    console.log(`  [${r.stage}] ${r.role}`);
  }

  if (toDelete.length > 0) {
    await p.opportunity.updateMany({
      where: { id: { in: toDelete.map(r => r.id) } },
      data: { stage: 'dead' },
    });
    console.log('Done — marked as dead.');
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
