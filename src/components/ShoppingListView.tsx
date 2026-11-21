import React, { useMemo, useState, useEffect } from 'react';
import { Copy, Check, Download, RotateCcw, Calendar, ShoppingBasket } from 'lucide-react';
import type { BuffetProfile, Quote } from '../types/catering';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  consolidateShoppingList,
  formatBRL,
  formatDateBR,
  formatQuantity,
  getUpcomingWeekendRange,
  isDateInRange,
} from '../utils/pricing';
import { buildWhatsAppShoppingText, downloadShoppingListPdf } from '../utils/pdfExport';

interface ShoppingListViewProps {
  quotes: Quote[];
  profile: BuffetProfile;
  checkedKeys: string[];
  onToggleChecked: (key: string) => void;
  onClearChecked: () => void;
  onNavigateToQuotes: () => void;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  quotes,
  profile,
  checkedKeys,
  onToggleChecked,
  onClearChecked,
  onNavigateToQuotes,
}) => {
  const weekend = useMemo(() => getUpcomingWeekendRange(), []);

  const weekendConfirmedIds = useMemo(
    () =>
      quotes
        .filter(
          (q) => q.status === 'confirmado' && isDateInRange(q.eventDate, weekend.start, weekend.end)
        )
        .map((q) => q.id),
    [quotes, weekend]
  );

  const allConfirmedIds = useMemo(
    () => quotes.filter((q) => q.status === 'confirmado').map((q) => q.id),
    [quotes]
  );

  const [batchPreset, setBatchPreset] = useState<'weekend' | 'all_confirmed' | 'custom'>('weekend');
  const [customIds, setCustomIds] = useState<string[]>(weekendConfirmedIds);
  const [safetyBufferPct, setSafetyBufferPct] = useState<number>(profile.defaultSafetyBufferPct);
  const [copied, setCopied] = useState(false);

  // Keep weekend selection in sync when new quotes get confirmed
  useEffect(() => {
    if (batchPreset === 'weekend') {
      setCustomIds(weekendConfirmedIds);
    } else if (batchPreset === 'all_confirmed') {
      setCustomIds(allConfirmedIds);
    }
  }, [batchPreset, weekendConfirmedIds, allConfirmedIds]);

  const activeIds =
    batchPreset === 'weekend'
      ? weekendConfirmedIds
      : batchPreset === 'all_confirmed'
      ? allConfirmedIds
      : customIds;

  const includedQuotes = useMemo(() => {
    const set = new Set(activeIds);
    return quotes
      .filter((q) => set.has(q.id))
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [quotes, activeIds]);

  const shoppingItems = useMemo(
    () => consolidateShoppingList(quotes, activeIds, safetyBufferPct),
    [quotes, activeIds, safetyBufferPct]
  );

  const checkedSet = useMemo(() => new Set(checkedKeys), [checkedKeys]);

  const totals = useMemo(() => {
    const estimated = shoppingItems.reduce((sum, i) => sum + i.estimatedCost, 0);
    const boughtCount = shoppingItems.filter((i) => checkedSet.has(i.key)).length;
    const totalGuests = includedQuotes.reduce((sum, q) => sum + q.guests, 0);
    return {
      estimated,
      boughtCount,
      totalItems: shoppingItems.length,
      totalGuests,
    };
  }, [shoppingItems, checkedSet, includedQuotes]);

  const handleToggleEventInBatch = (quoteId: string) => {
    setBatchPreset('custom');
    setCustomIds((prev) => {
      const base =
        batchPreset === 'weekend'
          ? weekendConfirmedIds
          : batchPreset === 'all_confirmed'
          ? allConfirmedIds
          : prev;
      return base.includes(quoteId) ? base.filter((id) => id !== quoteId) : [...base, quoteId];
    });
  };

  const handleCopyWhatsApp = async () => {
    const text = buildWhatsAppShoppingText(shoppingItems, includedQuotes, safetyBufferPct);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadPdf = () => {
    downloadShoppingListPdf(shoppingItems, includedQuotes, safetyBufferPct, profile);
  };

  const selectableQuotes = useMemo(
    () => [...quotes].sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [quotes]
  );

  return (
    <div className="space-y-6">
      {/* Batch Controls & Summary */}
      <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              Consolidado semanal · {formatDateBR(weekend.friday)} a {formatDateBR(weekend.sunday)}
            </p>
            <h2 className="text-xl font-bold text-neutral-900 mt-0.5">
              Lista de compras consolidada
            </h2>
            <p className="text-sm text-neutral-600 mt-0.5">
              Insumos repetidos entre festas são somados automaticamente por corredor de mercado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              disabled={shoppingItems.length === 0}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" />
                  Lista copiada!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar p/ WhatsApp
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={shoppingItems.length === 0}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              Baixar PDF de Compras
            </button>
          </div>
        </div>

        {/* Preset & Safety Buffer Toolbar */}
        <div className="p-4 sm:px-6 bg-neutral-50/70 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-neutral-200/70 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setBatchPreset('weekend')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                batchPreset === 'weekend'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Este FDS confirmados ({weekendConfirmedIds.length})
            </button>
            <button
              type="button"
              onClick={() => setBatchPreset('all_confirmed')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                batchPreset === 'all_confirmed'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos confirmados ({allConfirmedIds.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-600 whitespace-nowrap">
              Quebra / segurança:
            </span>
            <div className="flex items-center gap-1 p-1 bg-neutral-200/70 rounded-lg">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setSafetyBufferPct(pct)}
                  className={`min-h-[34px] px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap ${
                    safetyBufferPct === pct
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Event Checkboxes included in batch */}
        <div className="p-4 sm:px-6 border-b border-neutral-200">
          <p className="text-xs font-semibold text-neutral-700 mb-2.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            Eventos somados neste lote (toque para incluir ou remover):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectableQuotes.map((q) => {
              const selected = activeIds.includes(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleToggleEventInBatch(q.id)}
                  aria-pressed={selected}
                  className={`min-h-[40px] px-3 py-1.5 text-xs rounded-lg border transition-colors text-left flex items-center gap-2 ${
                    selected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selected
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3" />}
                  </span>
                  <span className="truncate max-w-[200px]">{q.eventTitle || q.templateName}</span>
                  <span className="font-mono tabular-nums text-[11px] opacity-75 whitespace-nowrap">
                    {formatDateBR(q.eventDate)} · {q.guests}p
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200">
          <div className="px-5 py-3.5">
            <p className="text-xs text-neutral-500">Eventos / convidados no lote</p>
            <p className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
              {includedQuotes.length} festas · {totals.totalGuests} pessoas
            </p>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">Progresso no mercado</p>
              <p
                className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-0.5"
                data-testid="shopping-progress"
              >
                {totals.boughtCount} de {totals.totalItems} comprados
              </p>
            </div>
            {totals.boughtCount > 0 && (
              <button
                type="button"
                onClick={onClearChecked}
                className="min-h-[38px] px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
          </div>
          <div className="px-5 py-3.5">
            <p className="text-xs text-neutral-500">
              Estimativa de compras (+{safetyBufferPct}% quebra)
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
              {formatBRL(totals.estimated)}
            </p>
          </div>
        </div>
      </section>

      {/* Consolidated Checklist by Market Aisle */}
      {shoppingItems.length === 0 ? (
        <section className="bg-white border border-neutral-200 rounded-xl p-10 text-center">
          <ShoppingBasket className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900 mt-3">
            Nenhum evento selecionado para compra
          </h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
            Marque um ou mais eventos acima ou confirme um orçamento na agenda para gerar sua lista consolidada.
          </p>
          <button
            type="button"
            onClick={onNavigateToQuotes}
            className="mt-4 min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg"
          >
            Ver orçamentos
          </button>
        </section>
      ) : (
        <div className="space-y-4" data-testid="shopping-categories">
          {CATEGORY_ORDER.map((category) => {
            const catItems = shoppingItems.filter((i) => i.category === category);
            if (catItems.length === 0) return null;
            const catCost = catItems.reduce((sum, i) => sum + i.estimatedCost, 0);

            return (
              <section
                key={category}
                className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
              >
                <div className="px-4 sm:px-5 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-neutral-900">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-neutral-600">
                    {catItems.length} {catItems.length === 1 ? 'item' : 'itens'} ·{' '}
                    {formatBRL(catCost)}
                  </span>
                </div>

                <ul className="divide-y divide-neutral-200">
                  {catItems.map((item) => {
                    const checked = checkedSet.has(item.key);
                    const isMerged = item.breakdown.length > 1;

                    return (
                      <li key={item.key}>
                        <label
                          className={`min-h-[60px] px-4 sm:px-5 py-3 flex items-start sm:items-center justify-between gap-4 cursor-pointer transition-colors ${
                            checked ? 'bg-neutral-50/90' : 'bg-white hover:bg-neutral-50/50'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleChecked(item.key)}
                              aria-label={`Marcar ${item.name} como comprado`}
                              className="mt-1 w-5 h-5 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-semibold ${
                                  checked ? 'text-neutral-400 line-through' : 'text-neutral-900'
                                }`}
                              >
                                {item.name}
                              </p>
                              <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                                {isMerged && (
                                  <span className="font-semibold text-emerald-700">
                                    Soma de {item.breakdown.length} festas ·{' '}
                                  </span>
                                )}
                                {item.breakdown
                                  .map(
                                    (b) =>
                                      `${b.clientName || b.eventTitle}: ${formatQuantity(
                                        b.quantity,
                                        item.unit
                                      )}`
                                  )
                                  .join(' · ')}
                                {safetyBufferPct > 0 && (
                                  <span className="text-neutral-400">
                                    {' '}
                                    (+{safetyBufferPct}% segurança)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={`text-base font-bold font-mono tabular-nums ${
                                checked ? 'text-neutral-400 line-through' : 'text-neutral-900'
                              }`}
                            >
                              {formatQuantity(item.quantityWithBuffer, item.unit)}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-neutral-500">
                              est. {formatBRL(item.estimatedCost)}
                            </p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
