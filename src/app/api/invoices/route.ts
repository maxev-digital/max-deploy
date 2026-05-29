import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

async function nextInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  return `INV-${String(count + 1).padStart(4, '0')}`;
}

export async function GET() {
  await requireAuth();
  const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();

  const now = new Date();
  const status = body.dueDate && new Date(body.dueDate) < now ? 'overdue' : 'draft';

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await nextInvoiceNumber(),
      client:        body.client,
      contractId:    body.contractId || null,
      lineItems:     body.lineItems ?? [],
      subtotal:      Number(body.subtotal),
      taxRate:       Number(body.taxRate ?? 0),
      taxAmount:     Number(body.taxAmount ?? 0),
      total:         Number(body.total),
      dueDate:       body.dueDate ? new Date(body.dueDate) : null,
      status,
      notes:         body.notes || null,
    },
  });
  return NextResponse.json({ invoice }, { status: 201 });
}
