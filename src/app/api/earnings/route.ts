import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  await requireAuth();

  const [contracts, invoices] = await Promise.all([
    prisma.contract.findMany({ where: { status: 'active' }, include: { invoices: true } }),
    prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  const mrr = contracts.reduce((sum, c) => {
    if (c.rateType === 'hourly') return sum + (c.rate * (c.hoursPerWeek ?? 0) * 52) / 12;
    if (c.rateType === 'monthly') return sum + c.rate;
    if (c.rateType === 'weekly') return sum + c.rate * 4.33;
    return sum;
  }, 0);

  const capacityUsed = contracts.reduce((sum, c) => sum + (c.hoursPerWeek ?? 0), 0);
  const ceiling = 40;

  const contractBreakdown = contracts.map(c => ({
    client: c.client,
    monthly: c.rateType === 'hourly'
      ? (c.rate * (c.hoursPerWeek ?? 0) * 52) / 12
      : c.rateType === 'monthly' ? c.rate
      : c.rateType === 'weekly' ? c.rate * 4.33 : 0,
    rateType: c.rateType,
    hoursPerWeek: c.hoursPerWeek,
  }));

  const outstanding   = invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status));
  const outstandingAR = outstanding.reduce((s, i) => s + i.total, 0);
  const overdueAR     = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0);

  const taxReserve = mrr * 0.28;

  const now = new Date();
  const agingBuckets = [
    { label: 'Current (0-30d)', min: 0, max: 30, color: '#14B8AD' },
    { label: '31-60 days',      min: 31, max: 60, color: '#D08E14' },
    { label: '61+ days',        min: 61, max: Infinity, color: '#E05252' },
  ];

  const arAging = agingBuckets.map(({ label, min, max, color }) => {
    const amount = outstanding.reduce((s, inv) => {
      if (!inv.dueDate) return s;
      const days = (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24);
      if (days >= min && days < max) return s + inv.total;
      return s;
    }, 0);
    return { label, amount, color };
  }).filter(b => b.amount > 0);

  const recentPayments = invoices
    .filter(i => i.status === 'paid' && i.paidAt)
    .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())
    .slice(0, 5)
    .map(i => ({ client: i.client, amount: i.total, paidAt: i.paidAt!.toISOString(), invoiceNumber: i.invoiceNumber }));

  return NextResponse.json({
    mrr: Math.round(mrr),
    projectedAnnual: Math.round(mrr * 12),
    outstandingAR,
    overdueAR,
    taxReserve: Math.round(taxReserve),
    capacityUsed,
    ceiling,
    contractBreakdown,
    arAging,
    recentPayments,
  });
}
