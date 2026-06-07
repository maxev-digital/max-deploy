const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const toInbox = [
  'cmpsfnb7h005xjyvtbtyt8nxf',  // Anthropic — Forward Deployed Engineer Applied AI (98)
  'cmpsfnat9002ujyvtrx4drmbb',  // Anthropic — Applied AI Engineer (95)
  'cmpsfnff700ugjyvtx11f8e6s',  // Vercel — Forward-Deployed Engineer (95)
  'cmpsfnj9n01k9jyvtwf66vvx7',  // Scale AI — Senior Staff Frontier Agents Engineer (92)
  'cmpshuzuj0006jyuxyzfw0jsl',  // A.Team — Senior Independent Software Developer (92)
  'cmpxnq9e70075jy67cn5ojzgw',  // Unknown — Lead AI Engineer & Technical Architect (92)
];

const toApplied = [
  'cmpy95sa7000ljydui2fey7y5',  // Aimpoint Digital (95) — already applied, recruiter following up
];

async function main() {
  const r1 = await p.opportunity.updateMany({
    where: { id: { in: toInbox } },
    data: { stage: 'inbox', lastActivity: new Date() },
  });
  console.log('Moved to inbox:', r1.count);

  const r2 = await p.opportunity.updateMany({
    where: { id: { in: toApplied } },
    data: { stage: 'applied', lastActivity: new Date() },
  });
  console.log('Moved to applied:', r2.count);

  // Confirm
  const opps = await p.opportunity.findMany({
    where: { id: { in: [...toInbox, ...toApplied] } },
    select: { company: true, role: true, fitScore: true, stage: true },
    orderBy: { fitScore: 'desc' },
  });
  opps.forEach(o => console.log(o.fitScore + ' | ' + o.stage + ' | ' + o.company + ' — ' + o.role.trim()));

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
