const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.opportunity.findUnique({
  where: { id: 'cmq07qewc0000jyuw7e4qzb6s' },
  select: { fitScore: true, classification: true, recommendedAction: true, analysisJson: true }
}).then(r => {
  console.log(JSON.stringify(r, null, 2));
  return p.$disconnect();
});
