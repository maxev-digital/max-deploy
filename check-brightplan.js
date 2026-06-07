const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.opportunity.findMany({
  where: { company: { contains: 'bright', mode: 'insensitive' } },
  select: { id: true, company: true, role: true, stage: true, jdText: true }
}).then(r => {
  console.log(JSON.stringify(r, null, 2));
  return p.$disconnect();
});
