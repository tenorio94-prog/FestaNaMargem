import type {
  ConsolidatedShoppingItem,
  IngredientCategory,
  IngredientUnit,
  ParsedWhatsAppRequest,
  Quote,
  QuoteFinancials,
  QuoteIngredient,
  SupportCostItem,
  TemplateIngredient,
} from '../types/catering';

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  acougue: 'Açougue e Proteínas',
  hortifruti: 'Hortifrúti e Frescos',
  padaria: 'Padaria, Massas e Doces',
  mercearia: 'Mercearia e Secos',
  bebidas: 'Bebidas e Gelo',
  descartaveis: 'Descartáveis e Apoio',
};

export const CATEGORY_ORDER: IngredientCategory[] = [
  'acougue',
  'hortifruti',
  'padaria',
  'mercearia',
  'bebidas',
  'descartaveis',
];

export const UNIT_LABELS: Record<IngredientUnit, string> = {
  kg: 'kg',
  un: 'un',
  L: 'L',
  pct: 'pct',
  cx: 'cx',
  fd: 'fardo',
  sc: 'saco',
};

export const STATUS_LABELS: Record<Quote['status'], string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  confirmado: 'Confirmado',
};

export function roundQuantity(value: number, unit: IngredientUnit): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (unit === 'kg' || unit === 'L') {
    // Round up to nearest 0.1 for weights/volumes
    return Math.ceil(value * 10 - 1e-9) / 10;
  }
  // Discrete packages/units/boxes/bags round up to whole numbers
  return Math.ceil(value - 1e-9);
}

export function calculateItemQuantity(
  item: Pick<TemplateIngredient, 'scalingMode' | 'baseQuantity' | 'unit'>,
  guests: number,
  hours: number
): number {
  const safeGuests = Math.max(0, guests);
  const safeHours = Math.max(0, hours);
  const base = Math.max(0, item.baseQuantity);

  let raw = 0;
  if (item.scalingMode === 'per_guest') {
    raw = base * safeGuests;
  } else if (item.scalingMode === 'per_guest_hour') {
    raw = base * safeGuests * safeHours;
  } else {
    raw = base;
  }

  return roundQuantity(raw, item.unit);
}

export function calculateItemCost(
  item: Pick<QuoteIngredient, 'scalingMode' | 'baseQuantity' | 'unit' | 'unitCost' | 'enabled'>,
  guests: number,
  hours: number
): number {
  if (!item.enabled) return 0;
  const qty = calculateItemQuantity(item, guests, hours);
  return roundCurrency(qty * Math.max(0, item.unitCost));
}

export function calculateSupportItemCost(item: SupportCostItem, hours: number): number {
  if (!item.enabled) return 0;
  const safeHours = Math.max(0, hours);
  const amount = Math.max(0, item.amount);
  return roundCurrency(item.mode === 'per_hour' ? amount * safeHours : amount);
}

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateQuoteFinancials(
  quote: Pick<
    Quote,
    'guests' | 'hours' | 'targetMarginPct' | 'manualFinalPrice' | 'ingredients' | 'supportCosts'
  >,
  minMarginFloorPct = 25
): QuoteFinancials {
  const ingredientsCost = roundCurrency(
    quote.ingredients.reduce(
      (sum, item) => sum + calculateItemCost(item, quote.guests, quote.hours),
      0
    )
  );

  const supportCost = roundCurrency(
    quote.supportCosts.reduce((sum, item) => sum + calculateSupportItemCost(item, quote.hours), 0)
  );

  const totalCost = roundCurrency(ingredientsCost + supportCost);

  // Clamp target margin to valid range [0, 85] to avoid division by zero
  const clampedTargetMargin = Math.min(85, Math.max(0, quote.targetMarginPct));
  const divisor = 1 - clampedTargetMargin / 100;
  const suggestedPrice =
    totalCost > 0 ? roundCurrency(Math.ceil((totalCost / divisor) / 5) * 5) : 0;

  const finalPrice =
    quote.manualFinalPrice !== null && Number.isFinite(quote.manualFinalPrice) && quote.manualFinalPrice >= 0
      ? roundCurrency(quote.manualFinalPrice)
      : suggestedPrice;

  const netProfit = roundCurrency(finalPrice - totalCost);
  const effectiveMarginPct =
    finalPrice > 0 ? Math.round((netProfit / finalPrice) * 1000) / 10 : 0;

  const safeGuests = Math.max(1, quote.guests);
  const pricePerGuest = roundCurrency(finalPrice / safeGuests);
  const costPerGuest = roundCurrency(totalCost / safeGuests);

  let marginHealth: QuoteFinancials['marginHealth'] = 'saudavel';
  if (effectiveMarginPct < minMarginFloorPct) {
    marginHealth = 'critica';
  } else if (effectiveMarginPct < minMarginFloorPct + 5) {
    marginHealth = 'atencao';
  }

  return {
    ingredientsCost,
    supportCost,
    totalCost,
    suggestedPrice,
    finalPrice,
    netProfit,
    effectiveMarginPct,
    pricePerGuest,
    costPerGuest,
    marginHealth,
  };
}

export function normalizeIngredientKey(name: string, unit: IngredientUnit): string {
  const normalizedName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return `${normalizedName}__${unit}`;
}

export function consolidateShoppingList(
  quotes: Quote[],
  selectedQuoteIds: string[],
  safetyBufferPct = 10
): ConsolidatedShoppingItem[] {
  const selectedSet = new Set(selectedQuoteIds);
  const includedQuotes = quotes.filter((q) => selectedSet.has(q.id));
  const bufferMultiplier = 1 + Math.max(0, safetyBufferPct) / 100;

  const map = new Map<string, ConsolidatedShoppingItem>();

  for (const quote of includedQuotes) {
    for (const ing of quote.ingredients) {
      if (!ing.enabled) continue;
      const qty = calculateItemQuantity(ing, quote.guests, quote.hours);
      if (qty <= 0) continue;

      const key = normalizeIngredientKey(ing.name, ing.unit);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          name: ing.name.trim(),
          category: ing.category,
          unit: ing.unit,
          rawQuantity: qty,
          quantityWithBuffer: qty,
          unitCost: ing.unitCost,
          estimatedCost: 0,
          breakdown: [
            {
              quoteId: quote.id,
              eventTitle: quote.eventTitle || quote.templateName,
              clientName: quote.clientName,
              eventDate: quote.eventDate,
              quantity: qty,
            },
          ],
        });
      } else {
        existing.rawQuantity = roundQuantity(existing.rawQuantity + qty, ing.unit);
        // Use the higher unit cost conservatively so shopping budget doesn't underestimate
        existing.unitCost = Math.max(existing.unitCost, ing.unitCost);
        const existingEntry = existing.breakdown.find((b) => b.quoteId === quote.id);
        if (existingEntry) {
          existingEntry.quantity = roundQuantity(existingEntry.quantity + qty, ing.unit);
        } else {
          existing.breakdown.push({
            quoteId: quote.id,
            eventTitle: quote.eventTitle || quote.templateName,
            clientName: quote.clientName,
            eventDate: quote.eventDate,
            quantity: qty,
          });
        }
      }
    }
  }

  const items = Array.from(map.values()).map((item) => {
    const withBuffer = roundQuantity(item.rawQuantity * bufferMultiplier, item.unit);
    return {
      ...item,
      quantityWithBuffer: withBuffer,
      estimatedCost: roundCurrency(withBuffer * item.unitCost),
    };
  });

  items.sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  return items;
}

export function getUpcomingWeekendRange(referenceDate = new Date()): {
  start: string;
  end: string;
  friday: string;
  saturday: string;
  sunday: string;
} {
  const base = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const day = base.getDay(); // 0=Sun, 5=Fri, 6=Sat

  let daysUntilFriday: number;
  if (day === 0) {
    // Sunday: treat this weekend (Fri-Sun) as active until Sunday ends
    daysUntilFriday = -2;
  } else if (day === 6) {
    daysUntilFriday = -1;
  } else {
    daysUntilFriday = 5 - day;
  }

  const fridayDate = new Date(base);
  fridayDate.setDate(base.getDate() + daysUntilFriday);

  const saturdayDate = new Date(fridayDate);
  saturdayDate.setDate(fridayDate.getDate() + 1);

  const sundayDate = new Date(fridayDate);
  sundayDate.setDate(fridayDate.getDate() + 2);

  return {
    start: toISODate(fridayDate),
    end: toISODate(sundayDate),
    friday: toISODate(fridayDate),
    saturday: toISODate(saturdayDate),
    sunday: toISODate(sundayDate),
  };
}

export function isDateInRange(isoDate: string, start: string, end: string): boolean {
  return isoDate >= start && isoDate <= end;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatQuantity(value: number, unit: IngredientUnit): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: unit === 'kg' || unit === 'L' ? (value % 1 === 0 ? 0 : 1) : 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${UNIT_LABELS[unit]}`;
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate || 'Data a definir';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

export function formatFullDateBR(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate || 'Data a definir';
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/**
 * Deterministic parser for quick Brazilian WhatsApp quote messages.
 * Extracts guest count, duration hours, template hint, date hints, and client name if present.
 */
export function parseWhatsAppSnippet(
  rawText: string,
  referenceDate = new Date()
): ParsedWhatsAppRequest {
  const result: ParsedWhatsAppRequest = {};
  if (!rawText.trim()) return result;

  const lower = rawText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Guests: "60 pessoas", "80 convidados", "para 50 adultos", "pra 45"
  const guestMatch =
    lower.match(/(\d{2,4})\s*(pessoas|convidados|adultos|pax|lugares)/) ||
    lower.match(/(?:para|pra)\s*(\d{2,4})\b/);
  if (guestMatch) {
    const parsed = parseInt(guestMatch[1], 10);
    if (parsed >= 5 && parsed <= 2000) result.guests = parsed;
  }

  // Hours: "4h", "5 horas", "3 hrs", "4 horas de festa"
  const hourMatch = lower.match(/(\d{1,2})\s*(h\b|hs\b|hr\b|hrs\b|hora|horas)/);
  if (hourMatch) {
    const parsed = parseInt(hourMatch[1], 10);
    if (parsed >= 1 && parsed <= 16) result.hours = parsed;
  }

  // Template hint
  if (/churrasc|picanha|costela|espeto/.test(lower)) {
    result.templateHint = 'tpl-churrasco';
  } else if (/infantil|crianca|aniversario de \d|salgadinho|pipoca|kids/.test(lower)) {
    result.templateHint = 'tpl-infantil';
  } else if (/coffee|cafe|corporativo|empresa|reuniao|workshop/.test(lower)) {
    result.templateHint = 'tpl-coffee';
  } else if (/crepe|massa|macarrao|rodizio/.test(lower)) {
    result.templateHint = 'tpl-crepes';
  } else if (/coquetel|finger|canape|bruschetta|casamento|noivado/.test(lower)) {
    result.templateHint = 'tpl-coquetel';
  }

  // Date hint: DD/MM or DD/MM/YYYY or "sexta" / "sabado" / "domingo"
  const explicitDate = rawText.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (explicitDate) {
    const day = parseInt(explicitDate[1], 10);
    const month = parseInt(explicitDate[2], 10);
    let year = explicitDate[3] ? parseInt(explicitDate[3], 10) : referenceDate.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      result.eventDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  } else {
    const weekend = getUpcomingWeekendRange(referenceDate);
    if (/\bsexta\b/.test(lower)) result.eventDate = weekend.friday;
    else if (/\bsabado\b/.test(lower)) result.eventDate = weekend.saturday;
    else if (/\bdomingo\b/.test(lower)) result.eventDate = weekend.sunday;
  }

  // Client name pattern: "Cliente: Maria", "Sou a Mariana", "Aqui é o Carlos"
  const nameMatch = rawText.match(
    /(?:cliente:\s*|sou (?:a |o )?|aqui (?:e|é) (?:a |o )?|meu nome (?:e|é) )([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i
  );
  if (nameMatch?.[1]) {
    const cleaned = nameMatch[1].trim();
    if (cleaned.length >= 2 && cleaned.length <= 40) {
      result.clientName = cleaned
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return result;
}
