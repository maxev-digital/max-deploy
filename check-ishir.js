const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const ishir = await p.opportunity.findMany({
    where: { company: { contains: 'ishir', mode: 'insensitive' } },
    select: { id: true, company: true, role: true, stage: true, source: true, notes: true, createdAt: true, lastActivity: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('\nISHIR pipeline entries:', ishir.length);
  for (const r of ishir) {
    console.log(`  [${r.stage}] ${r.company} — ${r.role}`);
    console.log(`    source: ${r.source} | created: ${r.createdAt.toISOString().slice(0,10)}`);
    if (r.notes) console.log(`    notes: ${r.notes.slice(0, 200)}`);
  }

  const emails = await p.emailMessage.findMany({
    where: {
      OR: [
        { fromEmail: { contains: 'ishir', mode: 'insensitive' } },
        { subject: { contains: 'ishir', mode: 'insensitive' } },
        { bodyText: { contains: 'ishir', mode: 'insensitive' } },
      ],
    },
    select: { id: true, fromEmail: true, subject: true, receivedAt: true, snippet: true },
    orderBy: { receivedAt: 'desc' },
    take: 10,
  });
  console.log('\nISHIR-related emails in DB:', emails.length);
  for (const e of emails) {
    console.log(`  ${e.receivedAt.toISOString().slice(0,16)} | from: ${e.fromEmail}`);
    console.log(`  subject: ${e.subject}`);
    console.log(`  snippet: ${(e.snippet || '').slice(0, 120)}`);
    console.log();
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
