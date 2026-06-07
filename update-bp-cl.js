const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.opportunity.update({
  where: { id: 'cmq07qewc0000jyuw7e4qzb6s' },
  data: { coverLetterUrl: '/cover-letters/cmq07qewc0000jyuw7e4qzb6s.pdf' }
}).then(r => { console.log('Updated:', r.coverLetterUrl); return p.$disconnect(); });
