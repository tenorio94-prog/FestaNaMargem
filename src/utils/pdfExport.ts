import { jsPDF } from 'jspdf';
import type {
  BuffetProfile,
  ConsolidatedShoppingItem,
  Quote,
  QuoteFinancials,
} from '../types/catering';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatBRL,
  formatDateBR,
  formatFullDateBR,
  formatQuantity,
} from './pricing';

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Generates a clean, client-ready PDF proposal.
 * Intentionally NEVER includes internal unit costs, support breakdowns, or profit margins.
 */
export function downloadProposalPdf(
  quote: Quote,
  financials: QuoteFinancials,
  profile: BuffetProfile
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Top Header Band
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(profile.businessName || 'Proposta de Buffet', margin, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(209, 213, 219);
  doc.text(
    [profile.ownerName, profile.phone, profile.city].filter(Boolean).join('  •  '),
    margin,
    22
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`PROPOSTA ${quote.code}`, pageWidth - margin, 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(209, 213, 219);
  doc.text(`Validade: ${profile.proposalValidityDays} dias`, pageWidth - margin, 22, {
    align: 'right',
  });

  y = 46;

  // Event & Client Summary
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(quote.eventTitle || quote.templateName, margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text(
    `Cliente: ${quote.clientName || 'A confirmar'}${quote.clientPhone ? `  •  ${quote.clientPhone}` : ''}`,
    margin,
    y
  );
  y += 9;

  // Specs Grid Box
  doc.setFillColor(247, 247, 245);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  const colW = contentWidth / 4;
  const specs = [
    { label: 'Data do Evento', value: formatFullDateBR(quote.eventDate) },
    { label: 'Horário / Duração', value: `${quote.eventTime || 'A combinar'} (${quote.hours}h)` },
    { label: 'Convidados', value: `${quote.guests} pessoas` },
    { label: 'Local', value: quote.location || 'A definir' },
  ];

  specs.forEach((spec, idx) => {
    const x = margin + 4 + idx * colW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(spec.label, x, y + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    const clipped = doc.splitTextToSize(spec.value, colW - 6)[0] || spec.value;
    doc.text(clipped, x, y + 15);
  });

  y += 32;

  // Included Menu Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(17, 24, 39);
  doc.text('O que está incluso no cardápio e serviço', margin, y);
  y += 4;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  const menuItems = quote.ingredients
    .filter((i) => i.enabled && i.showInMenu)
    .map((i) => i.clientLabel?.trim() || i.name);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);

  for (const label of menuItems) {
    if (y > 235) {
      doc.addPage();
      y = 22;
    }
    const lines = doc.splitTextToSize(`•  ${label}`, contentWidth - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 5.2 + 1.2;
  }

  // Team & Support mentions (names only, never costs!)
  const enabledSupport = quote.supportCosts.filter((s) => s.enabled);
  if (enabledSupport.length > 0) {
    y += 4;
    if (y > 230) {
      doc.addPage();
      y = 22;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(17, 24, 39);
    doc.text('Equipe e estrutura inclusas', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    const supportSummary = enabledSupport.map((s) => s.name).join('  •  ');
    const supportLines = doc.splitTextToSize(supportSummary, contentWidth);
    doc.text(supportLines, margin, y);
    y += supportLines.length * 5 + 4;
  }

  // Notes if any
  if (quote.notes.trim()) {
    y += 2;
    if (y > 235) {
      doc.addPage();
      y = 22;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text('Observações combinadas', margin, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(75, 85, 99);
    const noteLines = doc.splitTextToSize(quote.notes.trim(), contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 4;
  }

  // Investment Highlight Box
  if (y > 235) {
    doc.addPage();
    y = 24;
  }
  y += 4;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, contentWidth, 28, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text('INVESTIMENTO TOTAL DO EVENTO', margin + 6, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(17, 24, 39);
  doc.text(formatBRL(financials.finalPrice), margin + 6, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(55, 65, 81);
  doc.text(
    `Equivalente a ${formatBRL(financials.pricePerGuest)} por convidado`,
    pageWidth - margin - 6,
    y + 13,
    { align: 'right' }
  );
  doc.text(
    `${quote.guests} convidados • ${quote.hours}h de serviço`,
    pageWidth - margin - 6,
    y + 20,
    { align: 'right' }
  );

  y += 38;

  // Payment Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  doc.text('Condições de pagamento e reserva', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  const termsLines = doc.splitTextToSize(profile.paymentTerms, contentWidth);
  doc.text(termsLines, margin, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `${profile.businessName} • Para confirmar sua data, responda pelo WhatsApp ${profile.phone}`,
    pageWidth / 2,
    286,
    { align: 'center' }
  );

  const fileSlug = sanitizeFileName(
    `proposta-${quote.code}-${quote.clientName || quote.eventTitle}`
  );
  doc.save(`${fileSlug || 'proposta-buffet'}.pdf`);
}

/**
 * Generates a printable/downloadable consolidated shopping list PDF grouped by market aisle.
 */
export function downloadShoppingListPdf(
  items: ConsolidatedShoppingItem[],
  includedQuotes: Quote[],
  safetyBufferPct: number,
  profile: BuffetProfile
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39);
  doc.text('Lista de Compras Consolidada', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(
    `${profile.businessName} • Margem de segurança: +${safetyBufferPct}% • ${includedQuotes.length} evento(s)`,
    margin,
    y + 6
  );

  const totalCost = items.reduce((sum, i) => sum + i.estimatedCost, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61);
  doc.text(`Estimativa: ${formatBRL(totalCost)}`, pageWidth - margin, y + 4, { align: 'right' });

  y += 14;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Events included
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text('EVENTOS NESTE LOTE:', margin, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  const eventsLine = includedQuotes
    .map((q) => `${q.eventTitle} (${formatDateBR(q.eventDate)}, ${q.guests}p)`)
    .join('  |  ');
  const eventLines = doc.splitTextToSize(eventsLine, contentWidth);
  doc.text(eventLines, margin, y);
  y += eventLines.length * 4.8 + 5;

  for (const cat of CATEGORY_ORDER) {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length === 0) continue;

    if (y > 265) {
      doc.addPage();
      y = 18;
    }

    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    doc.text(CATEGORY_LABELS[cat], margin + 3, y + 5);
    y += 10;

    for (const item of catItems) {
      if (y > 274) {
        doc.addPage();
        y = 18;
      }

      // Checkbox square
      doc.setDrawColor(156, 163, 175);
      doc.rect(margin + 1, y - 3.3, 3.6, 3.6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(17, 24, 39);
      doc.text(item.name, margin + 7, y);

      doc.setFont('helvetica', 'bold');
      doc.text(formatQuantity(item.quantityWithBuffer, item.unit), pageWidth - margin - 28, y, {
        align: 'right',
      });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(formatBRL(item.estimatedCost), pageWidth - margin, y, { align: 'right' });

      y += 4.3;
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const breakdownText = item.breakdown
        .map((b) => `${b.clientName || b.eventTitle}: ${formatQuantity(b.quantity, item.unit)}`)
        .join(' · ');
      const bLines = doc.splitTextToSize(breakdownText, contentWidth - 10);
      doc.text(bLines, margin + 7, y);
      y += bLines.length * 3.8 + 3;
    }
  }

  doc.save(`lista-compras-fds-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function buildWhatsAppProposalText(
  quote: Quote,
  financials: QuoteFinancials,
  profile: BuffetProfile
): string {
  const menuLines = quote.ingredients
    .filter((i) => i.enabled && i.showInMenu)
    .map((i) => `• ${i.clientLabel?.trim() || i.name}`)
    .join('\n');

  const teamLines = quote.supportCosts
    .filter((s) => s.enabled)
    .map((s) => s.name)
    .join(', ');

  return [
    `Olá${quote.clientName ? `, ${quote.clientName}` : ''}! Segue o orçamento da *${profile.businessName}* (${quote.code}):`,
    '',
    `*${quote.eventTitle || quote.templateName}*`,
    `Data: ${formatDateBR(quote.eventDate)} às ${quote.eventTime || 'a combinar'}`,
    `Formato: ${quote.guests} convidados • ${quote.hours}h de serviço`,
    quote.location ? `Local: ${quote.location}` : null,
    '',
    '*Cardápio incluso:*',
    menuLines,
    teamLines ? `\n*Estrutura inclusa:* ${teamLines}` : null,
    '',
    `*Investimento total:* ${formatBRL(financials.finalPrice)} (${formatBRL(financials.pricePerGuest)} por convidado)`,
    `Condições: ${profile.paymentTerms}`,
    `Validade da proposta: ${profile.proposalValidityDays} dias.`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function buildWhatsAppShoppingText(
  items: ConsolidatedShoppingItem[],
  includedQuotes: Quote[],
  safetyBufferPct: number
): string {
  const totalCost = items.reduce((sum, i) => sum + i.estimatedCost, 0);
  const header = [
    `*LISTA DE COMPRAS CONSOLIDADA (+${safetyBufferPct}% segurança)*`,
    `Eventos (${includedQuotes.length}): ${includedQuotes
      .map((q) => `${q.eventTitle} (${formatDateBR(q.eventDate)})`)
      .join(' | ')}`,
    `Estimativa total: ${formatBRL(totalCost)}`,
    '',
  ];

  const body: string[] = [];
  for (const cat of CATEGORY_ORDER) {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length === 0) continue;
    body.push(`*${CATEGORY_LABELS[cat]}*`);
    for (const item of catItems) {
      body.push(
        `[ ] ${item.name} — *${formatQuantity(item.quantityWithBuffer, item.unit)}* (est. ${formatBRL(item.estimatedCost)})`
      );
    }
    body.push('');
  }

  return [...header, ...body].join('\n').trim();
}
