import React, { useMemo, useState } from 'react';
import {
  ShoppingBasket,
  Plus,
  Search,
  FileText,
  Copy,
  Trash2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import type { BuffetProfile, CateringTemplate, Quote, QuoteStatus } from '../types/catering';
import {
  STATUS_LABELS,
  calculateQuoteFinancials,
  formatBRL,
  formatDateBR,
  getUpcomingWeekendRange,
  isDateInRange,
} from '../utils/pricing';

interface QuotesListViewProps {
  quotes: Quote[];
  templates: CateringTemplate[];
  profile: BuffetProfile;
  onCreateNew: (templateId?: string) => void;
  onEditQuote: (quoteId: string) => void;
  onDuplicateQuote: (quoteId: string) => void;
  onDeleteQuote: (quoteId: string) => void;
  onQuickStatusChange: (quoteId: string, status: QuoteStatus) => void;
  onOpenProposal: (quote: Quote) => void;
  onOpenWeekendShopping: () => void;
}

const STATUS_STYLE: Record<QuoteStatus, string> = {
  rascunho: 'text-neutral-600',
  enviado: 'text-amber-700',
  confirmado: 'text-emerald-700',
};

export const QuotesListView: React.FC<QuotesListViewProps> = ({
  quotes,
  templates,
  profile,
  onCreateNew,
  onEditQuote,
  onDuplicateQuote,
  onDeleteQuote,
  onQuickStatusChange,
  onOpenProposal,
  onOpenWeekendShopping,
}) => {
  const [statusFilter, setStatusFilter] = useState<'todos' | QuoteStatus>('todos');
  const [search, setSearch] = useState('');

  const weekend = useMemo(() => getUpcomingWeekendRange(), []);

  const weekendSummary = useMemo(() => {
    const confirmedWeekend = quotes.filter(
      (q) => q.status === 'confirmado' && isDateInRange(q.eventDate, weekend.start, weekend.end)
    );
    const totalGuests = confirmedWeekend.reduce((sum, q) => sum + q.guests, 0);
    const totals = confirmedWeekend.reduce(
      (acc, q) => {
        const fin = calculateQuoteFinancials(q, profile.minMarginFloorPct);
        acc.revenue += fin.finalPrice;
        acc.profit += fin.netProfit;
        acc.ingredients += fin.ingredientsCost;
        return acc;
      },
      { revenue: 0, profit: 0, ingredients: 0 }
    );
    return {
      count: confirmedWeekend.length,
      totalGuests,
      ...totals,
    };
  }, [quotes, weekend, profile.minMarginFloorPct]);

  const filteredQuotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...quotes]
      .filter((item) => (statusFilter === 'todos' ? true : item.status === statusFilter))
      .filter((item) => {
        if (!q) return true;
        return (
          item.clientName.toLowerCase().includes(q) ||
          item.eventTitle.toLowerCase().includes(q) ||
          item.templateName.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [quotes, statusFilter, search]);

  const counts = useMemo(
    () => ({
      todos: quotes.length,
      confirmado: quotes.filter((q) => q.status === 'confirmado').length,
      enviado: quotes.filter((q) => q.status === 'enviado').length,
      rascunho: quotes.filter((q) => q.status === 'rascunho').length,
    }),
    [quotes]
  );

  return (
    <div className="space-y-6">
      {/* Weekend One-Tap Shopping Banner + KPI Strip */}
      <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              Fim de semana em pauta · {formatDateBR(weekend.friday)} a {formatDateBR(weekend.sunday)}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mt-1">
              {weekendSummary.count === 0
                ? 'Nenhum evento confirmado para este fim de semana'
                : `${weekendSummary.count} ${
                    weekendSummary.count === 1 ? 'festa confirmada' : 'festas confirmadas'
                  } para ${weekendSummary.totalGuests} convidados`}
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              Na quarta ou quinta-feira, consolide todos os insumos em uma lista única com margem de segurança.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenWeekendShopping}
              className="min-h-[46px] px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <ShoppingBasket className="w-4 h-4" />
              Gerar Compras do FDS
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 border-t border-neutral-200 bg-neutral-50/70">
          <div className="px-5 py-3.5">
            <p className="text-xs text-neutral-500">Faturamento confirmado (FDS)</p>
            <p className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
              {formatBRL(weekendSummary.revenue)}
            </p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-xs text-neutral-500">Compra estimada de insumos</p>
            <p className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
              {formatBRL(weekendSummary.ingredients)}
            </p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-xs text-neutral-500">Lucro líquido travado (FDS)</p>
            <p className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
              {formatBRL(weekendSummary.profit)}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Start from Day-1 Templates */}
      <section aria-labelledby="quick-templates-heading">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 id="quick-templates-heading" className="text-sm font-bold text-neutral-900">
            Cotar rápido a partir de um template pronto
          </h2>
          <span className="text-xs text-neutral-500 hidden sm:inline">
            Sem cadastro frio — abra e ajuste em segundos
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {templates.slice(0, 5).map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onCreateNew(tpl.id)}
              className="text-left p-3.5 bg-white border border-neutral-200 rounded-xl hover:border-neutral-400 hover:bg-neutral-50/70 transition-colors flex flex-col justify-between min-h-[88px] group"
            >
              <span className="text-sm font-semibold text-neutral-900 group-hover:text-emerald-800 transition-colors leading-snug">
                {tpl.shortTag}
              </span>
              <span className="text-xs text-neutral-500 mt-2 font-mono tabular-nums">
                {tpl.defaultGuests}p · {tpl.defaultHours}h · {tpl.defaultTargetMarginPct}%
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Quotes Ledger */}
      <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Interactive Status Filter Controls */}
          <div
            className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg overflow-x-auto"
            role="tablist"
            aria-label="Filtrar orçamentos por status"
          >
            {(
              [
                ['todos', `Todos (${counts.todos})`],
                ['confirmado', `Confirmados (${counts.confirmado})`],
                ['enviado', `Enviados (${counts.enviado})`],
                ['rascunho', `Rascunhos (${counts.rascunho})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={statusFilter === key}
                onClick={() => setStatusFilter(key)}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === key
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="quotes-search" className="sr-only">
              Buscar orçamento por cliente ou evento
            </label>
            <input
              id="quotes-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, festa ou código..."
              className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>

        {filteredQuotes.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-neutral-900">
              Nenhum orçamento encontrado com esses filtros.
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Crie um novo orçamento com margem travada ou limpe o filtro de busca.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {(search || statusFilter !== 'todos') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('todos');
                  }}
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  Limpar filtros
                </button>
              )}
              <button
                type="button"
                onClick={() => onCreateNew()}
                className="min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo orçamento
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200" data-testid="quotes-list">
            {filteredQuotes.map((quote) => {
              const fin = calculateQuoteFinancials(quote, profile.minMarginFloorPct);
              const isWeekend = isDateInRange(quote.eventDate, weekend.start, weekend.end);
              const marginColor =
                fin.marginHealth === 'critica'
                  ? 'text-red-700'
                  : fin.marginHealth === 'atencao'
                  ? 'text-amber-700'
                  : 'text-emerald-700';

              return (
                <li
                  key={quote.id}
                  className="p-4 sm:px-5 sm:py-4 hover:bg-neutral-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <button
                        type="button"
                        onClick={() => onEditQuote(quote.id)}
                        className="text-left text-base font-bold text-neutral-900 hover:text-emerald-800 transition-colors truncate"
                      >
                        {quote.eventTitle || quote.templateName}
                      </button>
                      <span className="text-xs font-mono text-neutral-400">{quote.code}</span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600">
                      <span className={`font-semibold ${STATUS_STYLE[quote.status]}`}>
                        {STATUS_LABELS[quote.status]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-neutral-800">
                        {quote.clientName || 'Cliente sem nome'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {formatDateBR(quote.eventDate)}
                        {isWeekend ? ' (Este FDS)' : ''}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {quote.guests} convidados · {quote.hours}h
                      </span>
                    </div>
                  </div>

                  {/* Right Financial Summary & Actions */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-4 sm:gap-6 shrink-0">
                    <div className="flex items-center gap-5">
                      <div className="text-left sm:text-right">
                        <p className="text-[11px] text-neutral-500">Valor final</p>
                        <p className="text-sm font-bold font-mono tabular-nums text-neutral-900">
                          {formatBRL(fin.finalPrice)}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-neutral-500">
                          {formatBRL(fin.pricePerGuest)}/p
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-[11px] text-neutral-500">Margem líquida</p>
                        <p className={`text-sm font-bold font-mono tabular-nums ${marginColor}`}>
                          {fin.effectiveMarginPct.toFixed(1)}%
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-neutral-600">
                          {formatBRL(fin.netProfit)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {quote.status !== 'confirmado' && (
                        <button
                          type="button"
                          onClick={() => onQuickStatusChange(quote.id, 'confirmado')}
                          aria-label={`Confirmar evento ${quote.eventTitle}`}
                          title="Confirmar para lista de compras"
                          className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditQuote(quote.id)}
                        className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenProposal(quote)}
                        aria-label={`Ver proposta PDF de ${quote.eventTitle}`}
                        title="Ver proposta em PDF"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateQuote(quote.id)}
                        aria-label={`Duplicar orçamento ${quote.eventTitle}`}
                        title="Duplicar orçamento"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteQuote(quote.id)}
                        aria-label={`Excluir orçamento ${quote.eventTitle}`}
                        title="Excluir orçamento"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
