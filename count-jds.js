require('dotenv').config({ path: '/var/www/max-deploy/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const c80  = await p.opportunity.count({ where: { jdText: { not: null }, fitScore: { gte: 80 } } });
  const c70  = await p.opportunity.count({ where: { jdText: { not: null }, fitScore: { gte: 70 } } });
  const c60  = await p.opportunity.count({ where: { jdText: { not: null }, fitScore: { gte: 60 } } });
  const cAct = await p.opportunity.count({ where: { jdText: { not: null }, stage: { notIn: ['archived','dead'] } } });
  const cAll = await p.opportunity.count({ where: { jdText: { not: null } } });
  console.log('fitScore>=80:', c80);
  console.log('fitScore>=70:', c70);
  console.log('fitScore>=60:', c60);
  console.log('active (non-archived/dead):', cAct);
  console.log('total with JD:', cAll);
  await p.$disconnect();
}
main().catch(console.error);
