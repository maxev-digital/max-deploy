const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Find the ISHIR interview opportunity
  const ishir = await p.opportunity.findFirst({
    where: {
      company: { contains: 'ishir', mode: 'insensitive' },
      stage: 'interview',
    },
  });

  if (!ishir) {
    console.log('No ISHIR interview opportunity found.');
    await p.$disconnect();
    return;
  }

  console.log(`Found ISHIR: ${ishir.company} — ${ishir.role} (${ishir.id})`);

  // Check if event already exists for this opportunity
  const existing = await p.calendarEvent.findFirst({
    where: { opportunityId: ishir.id },
  });

  if (existing) {
    console.log(`Calendar event already exists: "${existing.title}" @ ${existing.startAt}`);
    await p.$disconnect();
    return;
  }

  // Monday 2026-06-08 7:30 AM CST = 12:30 PM UTC (CDT offset is -5, so +5h)
  // June 8 is a Monday in 2026
  const event = await p.calendarEvent.create({
    data: {
      title:        'ISHIR — Technical Interview (2nd Round)',
      startAt:      new Date('2026-06-08T12:30:00.000Z'), // 7:30 AM CST
      endAt:        new Date('2026-06-08T15:30:00.000Z'), // 10:30 AM CST
      allDay:       false,
      type:         'interview',
      source:       'manual_backfill',
      opportunityId: ishir.id,
    },
  });

  console.log(`Created: "${event.title}" @ ${event.startAt.toISOString()} – ${event.endAt?.toISOString()}`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
