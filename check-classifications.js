require('dotenv').config({ path: '/var/www/max-deploy/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const rows = await p.opportunity.groupBy({
    by: ['classification'],
    _count: { id: true },
    where: { fitScore: { gte: 70 }, stage: { notIn: ['archived', 'dead'] } },
    orderBy: { _count: { id: 'desc' } },
  });
  rows.forEach(r => console.log(`${r.classification ?? 'null'}: ${r._count.id}`));
  await p.$disconnect();
}
main().catch(console.error);
