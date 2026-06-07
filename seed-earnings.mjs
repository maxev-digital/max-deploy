import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear existing contracts + invoices first
  await prisma.invoice.deleteMany();
  await prisma.contract.deleteMany();

  const now = new Date();

  // ── ACTIVE CONTRACTS ────────────────────────────────────────────────────────

  const roofWorks = await prisma.contract.create({ data: {
    client:       'Roof Works of Texas',
    projectName:  'Admin Panel + Storm Alert System + IVR Drip',
    rateType:     'monthly',
    rate:         2800,
    hoursPerWeek: 12,
    totalValue:   33600,
    startDate:    new Date('2025-01-15'),
    autoRenew:    true,
    renewalNoticeDays: 30,
    status:       'active',
    notes:        'Full-stack admin panel with storm area mapping, inspection reporting, estimate builder, and SMS IVR drip. Ongoing platform ops and feature development.',
  }});

  const casinoComp = await prisma.contract.create({ data: {
    client:       'CasinoComp',
    projectName:  'Career Job Board + Industry News Platform',
    rateType:     'monthly',
    rate:         3200,
    hoursPerWeek: 15,
    totalValue:   38400,
    startDate:    new Date('2025-11-01'),
    autoRenew:    true,
    renewalNoticeDays: 30,
    status:       'active',
    notes:        'Full platform build: job board, employer profiles, industry news (forked DFW Daily), and recruiter portal. Monthly retainer covers features, content ops, and outreach automation.',
  }});

  const paloma = await prisma.contract.create({ data: {
    client:       'Paloma Home Services',
    projectName:  'Lead Management + Admin Dashboard',
    rateType:     'monthly',
    rate:         1850,
    hoursPerWeek: 8,
    totalValue:   22200,
    startDate:    new Date('2025-09-01'),
    autoRenew:    false,
    status:       'active',
    notes:        'Custom admin dashboard for lead tracking, job scheduling, and customer follow-up automation. Property pin map with TCAD integration.',
  }});

  const oohada = await prisma.contract.create({ data: {
    client:       'OOHADA Media',
    projectName:  'OOH Lead Generation Platform',
    rateType:     'hourly',
    rate:         125,
    hoursPerWeek: 5,
    startDate:    new Date('2025-06-01'),
    autoRenew:    true,
    renewalNoticeDays: 14,
    status:       'active',
    notes:        'Ongoing platform maintenance, data pipeline ops, and feature development for the out-of-home advertising lead generation system.',
  }});

  // ── INVOICES ─────────────────────────────────────────────────────────────────

  const d = (daysAgo) => { const d = new Date(now); d.setDate(d.getDate() - daysAgo); return d; };

  // PAID — Roof Works (4 months of history)
  for (let i = 0; i < 4; i++) {
    const month = new Date(now); month.setMonth(month.getMonth() - (i + 1));
    const monthLabel = month.toLocaleString('default', { month: 'long', year: 'numeric' });
    await prisma.invoice.create({ data: {
      invoiceNumber: `INV-RW-2026-0${4 - i}`,
      contractId:    roofWorks.id,
      client:        'Roof Works of Texas',
      lineItems:     [{ description: `Platform Retainer — ${monthLabel}`, qty: 1, rate: 2800, total: 2800 }],
      subtotal:      2800, taxRate: 0, taxAmount: 0, total: 2800,
      status:        'paid',
      sentAt:        d((i + 1) * 30 + 5),
      viewedAt:      d((i + 1) * 30 + 3),
      paidAt:        d((i + 1) * 30),
      paymentMethod: 'ACH',
      dueDate:       d((i + 1) * 30 - 5),
    }});
  }

  // SENT (outstanding) — Roof Works current month
  await prisma.invoice.create({ data: {
    invoiceNumber: 'INV-RW-2026-05',
    contractId:    roofWorks.id,
    client:        'Roof Works of Texas',
    lineItems:     [{ description: 'Platform Retainer — June 2026', qty: 1, rate: 2800, total: 2800 }],
    subtotal:      2800, taxRate: 0, taxAmount: 0, total: 2800,
    status:        'sent',
    sentAt:        d(3),
    dueDate:       d(-27),
  }});

  // PAID — CasinoComp (3 months)
  for (let i = 0; i < 3; i++) {
    const month = new Date(now); month.setMonth(month.getMonth() - (i + 1));
    const monthLabel = month.toLocaleString('default', { month: 'long', year: 'numeric' });
    await prisma.invoice.create({ data: {
      invoiceNumber: `INV-CC-2026-0${3 - i}`,
      contractId:    casinoComp.id,
      client:        'CasinoComp',
      lineItems:     [{ description: `Platform Development Retainer — ${monthLabel}`, qty: 1, rate: 3200, total: 3200 }],
      subtotal:      3200, taxRate: 0, taxAmount: 0, total: 3200,
      status:        'paid',
      sentAt:        d((i + 1) * 30 + 5),
      viewedAt:      d((i + 1) * 30 + 2),
      paidAt:        d((i + 1) * 30),
      paymentMethod: 'Wire',
      dueDate:       d((i + 1) * 30 - 7),
    }});
  }

  // VIEWED (outstanding) — CasinoComp current
  await prisma.invoice.create({ data: {
    invoiceNumber: 'INV-CC-2026-04',
    contractId:    casinoComp.id,
    client:        'CasinoComp',
    lineItems:     [{ description: 'Platform Development Retainer — June 2026', qty: 1, rate: 3200, total: 3200 }],
    subtotal:      3200, taxRate: 0, taxAmount: 0, total: 3200,
    status:        'viewed',
    sentAt:        d(5),
    viewedAt:      d(2),
    dueDate:       d(-25),
  }});

  // PAID — Paloma (2 months)
  for (let i = 0; i < 2; i++) {
    const month = new Date(now); month.setMonth(month.getMonth() - (i + 1));
    const monthLabel = month.toLocaleString('default', { month: 'long', year: 'numeric' });
    await prisma.invoice.create({ data: {
      invoiceNumber: `INV-PH-2026-0${2 - i}`,
      contractId:    paloma.id,
      client:        'Paloma Home Services',
      lineItems:     [{ description: `Admin Platform Retainer — ${monthLabel}`, qty: 1, rate: 1850, total: 1850 }],
      subtotal:      1850, taxRate: 0, taxAmount: 0, total: 1850,
      status:        'paid',
      sentAt:        d((i + 1) * 30 + 4),
      paidAt:        d((i + 1) * 30 + 1),
      paymentMethod: 'Zelle',
      dueDate:       d((i + 1) * 30 - 10),
    }});
  }

  // SENT — Paloma current
  await prisma.invoice.create({ data: {
    invoiceNumber: 'INV-PH-2026-03',
    contractId:    paloma.id,
    client:        'Paloma Home Services',
    lineItems:     [{ description: 'Admin Platform Retainer — June 2026', qty: 1, rate: 1850, total: 1850 }],
    subtotal:      1850, taxRate: 0, taxAmount: 0, total: 1850,
    status:        'sent',
    sentAt:        d(2),
    dueDate:       d(-28),
  }});

  // PAID — OOHADA (time & materials, last 2 months)
  await prisma.invoice.create({ data: {
    invoiceNumber: 'INV-OOH-2026-01',
    contractId:    oohada.id,
    client:        'OOHADA Media',
    lineItems:     [{ description: 'Platform Development — April 2026 (22 hrs @ $125)', qty: 22, rate: 125, total: 2750 }],
    subtotal:      2750, taxRate: 0, taxAmount: 0, total: 2750,
    status:        'paid',
    sentAt:        d(62),
    paidAt:        d(55),
    paymentMethod: 'ACH',
    dueDate:       d(50),
  }});
  await prisma.invoice.create({ data: {
    invoiceNumber: 'INV-OOH-2026-02',
    contractId:    oohada.id,
    client:        'OOHADA Media',
    lineItems:     [{ description: 'Platform Development — May 2026 (19 hrs @ $125)', qty: 19, rate: 125, total: 2375 }],
    subtotal:      2375, taxRate: 0, taxAmount: 0, total: 2375,
    status:        'paid',
    sentAt:        d(32),
    paidAt:        d(25),
    paymentMethod: 'ACH',
    dueDate:       d(22),
  }});

  // SENT — OOHADA current
  await prisma.invoice.create({ data: {
    invoiceNumber: 'INV-OOH-2026-03',
    contractId:    oohada.id,
    client:        'OOHADA Media',
    lineItems:     [{ description: 'Platform Development — June 2026 (partial, 8 hrs @ $125)', qty: 8, rate: 125, total: 1000 }],
    subtotal:      1000, taxRate: 0, taxAmount: 0, total: 1000,
    status:        'sent',
    sentAt:        d(1),
    dueDate:       d(-14),
  }});

  const contracts = await prisma.contract.count();
  const invoices  = await prisma.invoice.count();
  const mrr = [2800, 3200, 1850, Math.round((125 * 5 * 52) / 12)].reduce((a, b) => a + b, 0);
  console.log(`Seeded: ${contracts} contracts, ${invoices} invoices`);
  console.log(`MRR: $${mrr.toLocaleString()}/mo | Projected Annual: $${(mrr * 12).toLocaleString()}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
