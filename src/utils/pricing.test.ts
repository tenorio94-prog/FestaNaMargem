import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateItemQuantity,
  calculateQuoteFinancials,
  consolidateShoppingList,
  parseWhatsAppSnippet,
  getUpcomingWeekendRange,
} from './pricing';
import type { Quote } from '../types/catering';

test('calculateItemQuantity handles per_guest, per_guest_hour, and fixed scaling with proper rounding', () => {
  assert.equal(
    calculateItemQuantity({ scalingMode: 'per_guest', baseQuantity: 0.25, unit: 'kg' }, 60, 4),
    15
  );
  assert.equal(
    calculateItemQuantity({ scalingMode: 'per_guest_hour', baseQuantity: 0.25, unit: 'L' }, 50, 4),
    50
  );
  assert.equal(
    calculateItemQuantity({ scalingMode: 'per_guest', baseQuantity: 0.12, unit: 'pct' }, 50, 4),
    6
  );
  assert.equal(
    calculateItemQuantity({ scalingMode: 'fixed', baseQuantity: 3, unit: 'sc' }, 80, 5),
    3
  );
});

test('calculateQuoteFinancials locks margin cleanly and detects margin below floor on manual override', () => {
  const sampleQuote: Pick<
    Quote,
    'guests' | 'hours' | 'targetMarginPct' | 'manualFinalPrice' | 'ingredients' | 'supportCosts'
  > = {
    guests: 50,
    hours: 4,
    targetMarginPct: 35,
    manualFinalPrice: null,
    ingredients: [
      {
        id: 'i1',
        name: 'Picanha',
        category: 'acougue',
        unit: 'kg',
        scalingMode: 'per_guest',
        baseQuantity: 0.2,
        unitCost: 70,
        showInMenu: true,
        enabled: true,
      },
      {
        id: 'i2',
        name: 'Item desativado',
        category: 'mercearia',
        unit: 'un',
        scalingMode: 'fixed',
        baseQuantity: 10,
        unitCost: 50,
        showInMenu: false,
        enabled: false,
      },
    ],
    supportCosts: [
      { id: 's1', name: 'Churrasqueiro', mode: 'per_hour', amount: 75, enabled: true },
      { id: 's2', name: 'Frete', mode: 'fixed', amount: 100, enabled: true },
    ],
  };

  // Ingredients: 50 * 0.2 = 10 kg * 70 = 700
  // Support: 4 * 75 + 100 = 400
  // Total cost = 1100
  // Target margin 35% => 1100 / 0.65 = 1692.30 => rounded up to nearest R$5 = 1695
  const locked = calculateQuoteFinancials(sampleQuote, 25);
  assert.equal(locked.ingredientsCost, 700);
  assert.equal(locked.supportCost, 400);
  assert.equal(locked.totalCost, 1100);
  assert.equal(locked.suggestedPrice, 1695);
  assert.equal(locked.finalPrice, 1695);
  assert.equal(locked.netProfit, 595);
  assert.equal(locked.marginHealth, 'saudavel');

  // Manual discount down to R$ 1300 => profit 200 => margin ~15.4% (< 25% floor => critica)
  const discounted = calculateQuoteFinancials({ ...sampleQuote, manualFinalPrice: 1300 }, 25);
  assert.equal(discounted.finalPrice, 1300);
  assert.equal(discounted.netProfit, 200);
  assert.equal(discounted.marginHealth, 'critica');
});

test('consolidateShoppingList merges matching ingredients across weekend quotes and applies buffer', () => {
  const quoteA: Quote = {
    id: 'q1',
    code: 'ORC-101',
    clientName: 'Marcos',
    clientPhone: '',
    eventTitle: 'Churrasco Marcos',
    eventDate: '2026-11-21',
    eventTime: '13:00',
    location: 'Moema',
    templateId: 'tpl-churrasco',
    templateName: 'Churrasco',
    guests: 40,
    hours: 4,
    status: 'confirmado',
    targetMarginPct: 35,
    manualFinalPrice: null,
    notes: '',
    createdAt: '',
    updatedAt: '',
    supportCosts: [],
    ingredients: [
      {
        id: '1',
        name: 'Carvão Vegetal 5kg',
        category: 'descartaveis',
        unit: 'sc',
        scalingMode: 'fixed',
        baseQuantity: 4,
        unitCost: 24,
        showInMenu: false,
        enabled: true,
      },
      {
        id: '2',
        name: 'Refrigerante 2L',
        category: 'bebidas',
        unit: 'un',
        scalingMode: 'per_guest',
        baseQuantity: 0.25,
        unitCost: 9.5,
        showInMenu: true,
        enabled: true,
      },
    ],
  };

  const quoteB: Quote = {
    ...quoteA,
    id: 'q2',
    code: 'ORC-102',
    clientName: 'Júlia',
    eventTitle: 'Infantil Júlia',
    guests: 60,
    ingredients: [
      {
        id: '3',
        name: 'refrigerante 2l', // different casing should still merge
        category: 'bebidas',
        unit: 'un',
        scalingMode: 'per_guest',
        baseQuantity: 0.25,
        unitCost: 10,
        showInMenu: true,
        enabled: true,
      },
    ],
  };

  const list = consolidateShoppingList([quoteA, quoteB], ['q1', 'q2'], 10);
  assert.equal(list.length, 2);

  const soda = list.find((i) => i.name.toLowerCase().includes('refrigerante'));
  assert.ok(soda);
  // QuoteA: 40*0.25=10; QuoteB: 60*0.25=15; raw=25; +10% buffer = 27.5 -> ceil = 28 un
  assert.equal(soda.rawQuantity, 25);
  assert.equal(soda.quantityWithBuffer, 28);
  assert.equal(soda.unitCost, 10); // conservative higher unit cost
  assert.equal(soda.breakdown.length, 2);
});

test('parseWhatsAppSnippet extracts guests, hours, template hint, and weekend date', () => {
  const ref = new Date(2026, 10, 18); // Wednesday 2026-11-18
  const weekend = getUpcomingWeekendRange(ref);
  assert.equal(weekend.saturday, '2026-11-21');

  const parsed = parseWhatsAppSnippet(
    'Oi! Sou a Mariana Silva, queria orçamento de churrasco para 60 pessoas 4 horas no sábado',
    ref
  );
  assert.equal(parsed.guests, 60);
  assert.equal(parsed.hours, 4);
  assert.equal(parsed.templateHint, 'tpl-churrasco');
  assert.equal(parsed.eventDate, '2026-11-21');
  assert.equal(parsed.clientName, 'Mariana Silva');
});
