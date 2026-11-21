import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Plus,
  FileText,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  Trash2,
  ClipboardPaste,
  Save,
  CheckCircle2,
} from 'lucide-react';
import type {
  BuffetProfile,
  CateringTemplate,
  Quote,
  QuoteIngredient,
  QuoteStatus,
  SupportCostItem,
} from '../types/catering';
import {
  STATUS_LABELS,
  UNIT_LABELS,
  calculateItemCost,
  calculateItemQuantity,
  calculateQuoteFinancials,
  calculateSupportItemCost,
  formatBRL,
  formatQuantity,
  parseWhatsAppSnippet,
} from '../utils/pricing';
import { buildWhatsAppProposalText } from '../utils/pdfExport';
import { QuickSwapModal } from './QuickSwapModal';

interface QuoteEditorViewProps {
  initialQuote: Quote;
  isNew: boolean;
  templates: CateringTemplate[];
  profile: BuffetProfile;
  onSave: (quote: Quote, goBack?: boolean) => void;
  onCancel: () => void;
  onOpenProposal: (quote: Quote) => void;
}

export const QuoteEditorView: React.FC<QuoteEditorViewProps> = ({
  initialQuote,
  isNew,
  templates,
  profile,
  onSave,
  onCancel,
  onOpenProposal,
}) => {
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [showQuickSwap, setShowQuickSwap] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(isNew);
  const [pasteText, setPasteText] = useState(initialQuote.whatsappRawText || '');
  const [pasteFeedback, setPasteFeedback] = useState('');
  const [copiedWa, setCopiedWa] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Support cost inline adder
  const [addingSupport, setAddingSupport] = useState(false);
  const [newSupportName, setNewSupportName] = useState('');
  const [newSupportAmount, setNewSupportAmount] = useState('');
  const [newSupportMode, setNewSupportMode] = useState<'fixed' | 'per_hour'>('fixed');

  const financials = useMemo(
    () => calculateQuoteFinancials(quote, profile.minMarginFloorPct),
    [quote, profile.minMarginFloorPct]
  );

  const handleApplyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setQuote((prev) => ({
      ...prev,
      templateId: tpl.id,
      templateName: tpl.name,
      eventTitle:
        !prev.eventTitle || prev.eventTitle === prev.templateName ? tpl.name : prev.eventTitle,
      hours: prev.hours || tpl.defaultHours,
      targetMarginPct: tpl.defaultTargetMarginPct,
      manualFinalPrice: null,
      ingredients: tpl.ingredients.map((item) => ({ ...item, enabled: true })),
      supportCosts: tpl.supportCosts.map((item) => ({ ...item })),
    }));
  };

  const handleParseWhatsApp = () => {
    if (!pasteText.trim()) return;
    const parsed = parseWhatsAppSnippet(pasteText);
    const changes: string[] = [];

    let next: Quote = { ...quote, whatsappRawText: pasteText };

    if (parsed.templateHint) {
      const tpl = templates.find((t) => t.id === parsed.templateHint);
      if (tpl) {
        if (tpl.id !== next.templateId) {
          next = {
            ...next,
            templateId: tpl.id,
            templateName: tpl.name,
            eventTitle:
              !next.eventTitle || next.eventTitle === next.templateName
                ? tpl.name
                : next.eventTitle,
            targetMarginPct: tpl.defaultTargetMarginPct,
            manualFinalPrice: null,
            ingredients: tpl.ingredients.map((item) => ({ ...item, enabled: true })),
            supportCosts: tpl.supportCosts.map((item) => ({ ...item })),
          };
        }
        changes.push(`Template: ${tpl.shortTag}`);
      }
    }

    if (parsed.guests) {
      next.guests = parsed.guests;
      changes.push(`${parsed.guests} convidados`);
    }
    if (parsed.hours) {
      next.hours = parsed.hours;
      changes.push(`${parsed.hours}h`);
    }
    if (parsed.eventDate) {
      next.eventDate = parsed.eventDate;
      changes.push(`Data: ${parsed.eventDate.split('-').reverse().join('/')}`);
    }
    if (parsed.clientName && !next.clientName.trim()) {
      next.clientName = parsed.clientName;
      changes.push(`Cliente: ${parsed.clientName}`);
      if (!next.eventTitle || next.eventTitle === next.templateName) {
        const activeTpl = templates.find((t) => t.id === next.templateId);
        next.eventTitle = `${activeTpl?.shortTag || next.templateName} — ${parsed.clientName}`;
      }
    }

    setQuote(next);
    setPasteFeedback(
      changes.length > 0
        ? `Preenchido automaticamente: ${changes.join(' · ')}`
        : 'Não identificamos números no texto. Ajuste os campos abaixo manualmente.'
    );
  };

  const updateIngredient = (id: string, patch: Partial<QuoteIngredient>) => {
    setQuote((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const removeCustomIngredient = (id: string) => {
    setQuote((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((item) => item.id !== id),
    }));
  };

  const handleAddCustomItem = (item: QuoteIngredient) => {
    setQuote((prev) => ({
      ...prev,
      ingredients: [item, ...prev.ingredients],
    }));
  };

  const handleSwapItem = (targetId: string, replacement: QuoteIngredient) => {
    setQuote((prev) => {
      const nextIngredients: QuoteIngredient[] = [];
      for (const item of prev.ingredients) {
        if (item.id === targetId) {
          nextIngredients.push({ ...item, enabled: false });
          nextIngredients.push(replacement);
        } else {
          nextIngredients.push(item);
        }
      }
      return { ...prev, ingredients: nextIngredients };
    });
  };

  const updateSupport = (id: string, patch: Partial<SupportCostItem>) => {
    setQuote((prev) => ({
      ...prev,
      supportCosts: prev.supportCosts.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleAddSupport = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSupportName.trim();
    const amountNum = parseFloat(newSupportAmount.replace(',', '.'));
    if (!trimmed || !Number.isFinite(amountNum) || amountNum < 0) return;

    const item: SupportCostItem = {
      id: `sup-${Date.now()}`,
      name: trimmed,
      mode: newSupportMode,
      amount: amountNum,
      enabled: true,
    };
    setQuote((prev) => ({ ...prev, supportCosts: [...prev.supportCosts, item] }));
    setNewSupportName('');
    setNewSupportAmount('');
    setAddingSupport(false);
  };

  const validateAndPersist = (statusOverride?: QuoteStatus, goBack = false): Quote | null => {
    if (!quote.clientName.trim()) {
      setValidationError('Informe o nome do cliente antes de salvar o orçamento.');
      return null;
    }
    if (quote.guests < 1 || quote.hours < 1) {
      setValidationError('Convidados e duração (horas) devem ser maiores que zero.');
      return null;
    }
    setValidationError('');
    const updated: Quote = {
      ...quote,
      status: statusOverride ?? quote.status,
      updatedAt: new Date().toISOString(),
    };
    setQuote(updated);
    onSave(updated, goBack);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
    return updated;
  };

  const handleCopyWhatsApp = async () => {
    const text = buildWhatsAppProposalText(quote, financials, profile);
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
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2000);
  };

  const activeIngredientsCount = quote.ingredients.filter((i) => i.enabled).length;

  return (
    <div className="space-y-5">
      {/* Editor Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div>
            <p className="text-xs font-mono text-neutral-500">
              {quote.code} · {quote.templateName}
            </p>
            <h2 className="text-lg font-bold text-neutral-900 leading-tight">
              {isNew ? 'Novo orçamento rápido' : quote.eventTitle || 'Editar orçamento'}
            </h2>
          </div>
        </div>

        {/* Status Segmented Switch */}
        <div
          className="flex items-center gap-1 p-1 bg-neutral-200/70 rounded-lg"
          role="group"
          aria-label="Status do orçamento"
        >
          {(['rascunho', 'enviado', 'confirmado'] as QuoteStatus[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setQuote((prev) => ({ ...prev, status: st }))}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                quote.status === st
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {STATUS_LABELS[st]}
            </button>
          ))}
        </div>
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-800 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {validationError}
        </div>
      )}

      {/* Main 2-column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left Column: Inputs, Ingredients & Support */}
        <div className="space-y-5 min-w-0">
          {/* WhatsApp Paste Parser */}
          <section className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-neutral-600" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Colar pedido do WhatsApp (opcional)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteBox((v) => !v)}
                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 min-h-[36px] px-2"
              >
                {showPasteBox ? 'Ocultar' : 'Abrir'}
              </button>
            </div>

            {showPasteBox && (
              <div className="mt-3 space-y-2.5">
                <label htmlFor="wa-paste" className="sr-only">
                  Mensagem recebida no WhatsApp
                </label>
                <textarea
                  id="wa-paste"
                  rows={2}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder='Cole a mensagem do cliente, ex.: "Oi, sou a Mariana, queria orçamento de churrasco para 60 pessoas 4 horas no sábado"'
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-neutral-500">
                    {pasteFeedback || 'Identifica automaticamente convidados, horas, data e template.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleParseWhatsApp}
                    className="min-h-[40px] px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Preencher campos do texto
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Template & Event Basic Details */}
          <section className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">1. Dados do evento e escala</h3>
              <div className="flex items-center gap-2">
                <label htmlFor="tpl-select" className="text-xs text-neutral-500">
                  Template base:
                </label>
                <select
                  id="tpl-select"
                  value={quote.templateId}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="min-h-[38px] px-2.5 py-1 text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="quote-client"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Nome do cliente *
                </label>
                <input
                  id="quote-client"
                  type="text"
                  value={quote.clientName}
                  onChange={(e) => setQuote({ ...quote, clientName: e.target.value })}
                  placeholder="Ex.: Mariana Souza"
                  className="w-full min-h-[44px] px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor="quote-phone"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  WhatsApp do cliente
                </label>
                <input
                  id="quote-phone"
                  type="tel"
                  value={quote.clientPhone}
                  onChange={(e) => setQuote({ ...quote, clientPhone: e.target.value })}
                  placeholder="(11) 99999-0000"
                  className="w-full min-h-[44px] px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="quote-title"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Título do evento (aparece na proposta)
                </label>
                <input
                  id="quote-title"
                  type="text"
                  value={quote.eventTitle}
                  onChange={(e) => setQuote({ ...quote, eventTitle: e.target.value })}
                  placeholder="Ex.: Churrasco Aniversário Mariana"
                  className="w-full min-h-[44px] px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor="quote-date"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Data do evento
                </label>
                <input
                  id="quote-date"
                  type="date"
                  value={quote.eventDate}
                  onChange={(e) => setQuote({ ...quote, eventDate: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="quote-time"
                    className="block text-xs font-medium text-neutral-700 mb-1"
                  >
                    Horário
                  </label>
                  <input
                    id="quote-time"
                    type="time"
                    value={quote.eventTime}
                    onChange={(e) => setQuote({ ...quote, eventTime: e.target.value })}
                    className="w-full min-h-[44px] px-2.5 py-2 text-sm font-mono tabular-nums border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="quote-location"
                    className="block text-xs font-medium text-neutral-700 mb-1"
                  >
                    Bairro / Local
                  </label>
                  <input
                    id="quote-location"
                    type="text"
                    value={quote.location}
                    onChange={(e) => setQuote({ ...quote, location: e.target.value })}
                    placeholder="Ex.: Moema"
                    className="w-full min-h-[44px] px-2.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Guest Count + Hours Fast Steppers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-neutral-100">
              <div>
                <label
                  htmlFor="quote-guests"
                  className="block text-xs font-medium text-neutral-700 mb-1.5"
                >
                  Número de convidados
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Diminuir 5 convidados"
                    onClick={() =>
                      setQuote((p) => ({ ...p, guests: Math.max(5, p.guests - 5) }))
                    }
                    className="min-h-[44px] min-w-[44px] px-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
                  >
                    −5
                  </button>
                  <input
                    id="quote-guests"
                    type="number"
                    min={1}
                    max={2000}
                    value={quote.guests}
                    onChange={(e) =>
                      setQuote({ ...quote, guests: Math.max(1, parseInt(e.target.value, 10) || 0) })
                    }
                    className="flex-1 min-w-0 min-h-[44px] px-3 py-2 text-center text-base font-bold font-mono tabular-nums border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    type="button"
                    aria-label="Aumentar 5 convidados"
                    onClick={() => setQuote((p) => ({ ...p, guests: p.guests + 5 }))}
                    className="min-h-[44px] min-w-[44px] px-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
                  >
                    +5
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="quote-hours"
                  className="block text-xs font-medium text-neutral-700 mb-1.5"
                >
                  Duração do evento (horas)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Diminuir 1 hora"
                    onClick={() => setQuote((p) => ({ ...p, hours: Math.max(1, p.hours - 1) }))}
                    className="min-h-[44px] min-w-[44px] px-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
                  >
                    −1h
                  </button>
                  <input
                    id="quote-hours"
                    type="number"
                    min={1}
                    max={16}
                    value={quote.hours}
                    onChange={(e) =>
                      setQuote({ ...quote, hours: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                    className="flex-1 min-w-0 min-h-[44px] px-3 py-2 text-center text-base font-bold font-mono tabular-nums border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    type="button"
                    aria-label="Aumentar 1 hora"
                    onClick={() => setQuote((p) => ({ ...p, hours: Math.min(16, p.hours + 1) }))}
                    className="min-h-[44px] min-w-[44px] px-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
                  >
                    +1h
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Ingredients & Quick Swap Section */}
          <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  2. Insumos calculados ({activeIngredientsCount} ativos)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Ajuste quantidades, custos ou troque itens sem sair da cotação.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickSwap(true)}
                className="min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                + Item avulso / troca rápida
              </button>
            </div>

            <div className="divide-y divide-neutral-200" data-testid="ingredients-table">
              {quote.ingredients.map((item) => {
                const computedQty = calculateItemQuantity(item, quote.guests, quote.hours);
                const lineCost = calculateItemCost(item, quote.guests, quote.hours);
                const scaleSuffix =
                  item.scalingMode === 'per_guest'
                    ? '/p'
                    : item.scalingMode === 'per_guest_hour'
                    ? '/p·h'
                    : 'fixo';

                return (
                  <div
                    key={item.id}
                    className={`px-4 py-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      item.enabled ? 'bg-white' : 'bg-neutral-50/90 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => updateIngredient(item.id, { enabled: e.target.checked })}
                        aria-label={`Incluir ${item.name} no orçamento`}
                        className="mt-1 w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 shrink-0"
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            item.enabled ? 'text-neutral-900' : 'text-neutral-500 line-through'
                          }`}
                        >
                          {item.name}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          <span className="font-mono tabular-nums font-medium text-neutral-700">
                            {formatQuantity(computedQty, item.unit)}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span>{scaleSuffix}</span>
                          {item.swappedFrom && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="text-emerald-700 font-medium">
                                Troca de {item.swappedFrom}
                              </span>
                            </>
                          )}
                          {item.isCustom && !item.swappedFrom && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="text-emerald-700 font-medium">Item avulso</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pl-7 sm:pl-0 shrink-0">
                      <div className="flex items-center gap-1">
                        <label htmlFor={`qty-${item.id}`} className="sr-only">
                          Consumo base de {item.name}
                        </label>
                        <input
                          id={`qty-${item.id}`}
                          type="number"
                          step="any"
                          min="0"
                          disabled={!item.enabled}
                          value={item.baseQuantity}
                          onChange={(e) =>
                            updateIngredient(item.id, {
                              baseQuantity: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          title="Consumo base"
                          className="w-16 min-h-[38px] px-2 py-1 text-xs text-right font-mono tabular-nums border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-100"
                        />
                        <span className="text-[11px] text-neutral-500 w-7">
                          {UNIT_LABELS[item.unit]}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-neutral-500">R$</span>
                        <label htmlFor={`cost-${item.id}`} className="sr-only">
                          Preço unitário de {item.name}
                        </label>
                        <input
                          id={`cost-${item.id}`}
                          type="number"
                          step="0.1"
                          min="0"
                          disabled={!item.enabled}
                          value={item.unitCost}
                          onChange={(e) =>
                            updateIngredient(item.id, {
                              unitCost: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          title="Custo unitário em R$"
                          className="w-20 min-h-[38px] px-2 py-1 text-xs text-right font-mono tabular-nums border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-100"
                        />
                      </div>

                      <div className="w-24 text-right font-mono tabular-nums text-sm font-semibold text-neutral-900">
                        {formatBRL(lineCost)}
                      </div>

                      {item.isCustom ? (
                        <button
                          type="button"
                          onClick={() => removeCustomIngredient(item.id)}
                          aria-label={`Remover item avulso ${item.name}`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="w-9 hidden sm:inline-block" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Support Costs Section */}
          <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  3. Custos de apoio (equipe, frete, gás/louça)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Entram no custo real para garantir que sua margem nunca seja corroída.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddingSupport((v) => !v)}
                className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Custo de apoio
              </button>
            </div>

            {addingSupport && (
              <form
                onSubmit={handleAddSupport}
                className="p-4 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-end gap-2.5"
              >
                <div className="flex-1 min-w-[180px]">
                  <label htmlFor="new-sup-name" className="block text-xs font-medium text-neutral-700 mb-1">
                    Descrição
                  </label>
                  <input
                    id="new-sup-name"
                    type="text"
                    value={newSupportName}
                    onChange={(e) => setNewSupportName(e.target.value)}
                    placeholder="Ex.: Garçom extra, estacionamento"
                    className="w-full min-h-[40px] px-3 py-1.5 text-sm bg-white border border-neutral-300 rounded-lg"
                  />
                </div>
                <div className="w-32">
                  <label htmlFor="new-sup-mode" className="block text-xs font-medium text-neutral-700 mb-1">
                    Tipo
                  </label>
                  <select
                    id="new-sup-mode"
                    value={newSupportMode}
                    onChange={(e) => setNewSupportMode(e.target.value as 'fixed' | 'per_hour')}
                    className="w-full min-h-[40px] px-2 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg"
                  >
                    <option value="fixed">Valor fixo</option>
                    <option value="per_hour">Por hora</option>
                  </select>
                </div>
                <div className="w-28">
                  <label htmlFor="new-sup-amount" className="block text-xs font-medium text-neutral-700 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    id="new-sup-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newSupportAmount}
                    onChange={(e) => setNewSupportAmount(e.target.value)}
                    placeholder="150"
                    className="w-full min-h-[40px] px-2.5 py-1.5 text-sm font-mono tabular-nums bg-white border border-neutral-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800"
                >
                  Adicionar
                </button>
              </form>
            )}

            <div className="divide-y divide-neutral-200">
              {quote.supportCosts.map((sup) => {
                const sub = calculateSupportItemCost(sup, quote.hours);
                return (
                  <div
                    key={sup.id}
                    className={`px-4 py-3 sm:px-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                      sup.enabled ? 'bg-white' : 'bg-neutral-50/90 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={sup.enabled}
                        onChange={(e) => updateSupport(sup.id, { enabled: e.target.checked })}
                        aria-label={`Incluir custo de apoio ${sup.name}`}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">{sup.name}</p>
                        <p className="text-xs text-neutral-500">
                          {sup.mode === 'per_hour'
                            ? `${formatBRL(sup.amount)}/h × ${quote.hours}h`
                            : 'Custo fixo do evento'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 pl-7 sm:pl-0 shrink-0">
                      <span className="text-xs text-neutral-500">R$</span>
                      <label htmlFor={`sup-val-${sup.id}`} className="sr-only">
                        Valor de {sup.name}
                      </label>
                      <input
                        id={`sup-val-${sup.id}`}
                        type="number"
                        step="1"
                        min="0"
                        disabled={!sup.enabled}
                        value={sup.amount}
                        onChange={(e) =>
                          updateSupport(sup.id, {
                            amount: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-24 min-h-[38px] px-2.5 py-1 text-xs text-right font-mono tabular-nums border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                      <div className="w-24 text-right font-mono tabular-nums text-sm font-semibold text-neutral-900">
                        {formatBRL(sub)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notes */}
          <section className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5">
            <label htmlFor="quote-notes" className="block text-sm font-bold text-neutral-900 mb-2">
              4. Observações combinadas (aparecem na proposta)
            </label>
            <textarea
              id="quote-notes"
              rows={3}
              value={quote.notes}
              onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
              placeholder="Ex.: Ponto da carne, restrições alimentares, horário de chegada da equipe..."
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </section>
        </div>

        {/* Right Column: Sticky Margin Lock Panel */}
        <aside className="lg:sticky lg:top-[76px] bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold">Painel de Margem Travada</h3>
            </div>
            <span className="text-xs font-mono tabular-nums text-neutral-300">
              Piso {profile.minMarginFloorPct}%
            </span>
          </div>

          <div className="p-4 space-y-3.5">
            {/* Cost Breakdown */}
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-neutral-600">
                <dt>Custo de insumos</dt>
                <dd className="font-mono tabular-nums font-medium text-neutral-900">
                  {formatBRL(financials.ingredientsCost)}
                </dd>
              </div>
              <div className="flex items-center justify-between text-neutral-600">
                <dt>Equipe e apoio</dt>
                <dd className="font-mono tabular-nums font-medium text-neutral-900">
                  {formatBRL(financials.supportCost)}
                </dd>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200 font-semibold text-neutral-900">
                <dt>Custo total real</dt>
                <dd className="font-mono tabular-nums">{formatBRL(financials.totalCost)}</dd>
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <dt>Custo por convidado</dt>
                <dd className="font-mono tabular-nums">{formatBRL(financials.costPerGuest)}</dd>
              </div>
            </dl>

            {/* Target Margin Lock Control */}
            <div className="pt-3 border-t border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="target-margin-input" className="text-xs font-bold text-neutral-800">
                  Margem líquida desejada
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="target-margin-input"
                    type="number"
                    min={5}
                    max={75}
                    value={quote.targetMarginPct}
                    onChange={(e) =>
                      setQuote({
                        ...quote,
                        targetMarginPct: Math.min(75, Math.max(0, Number(e.target.value) || 0)),
                        manualFinalPrice: null,
                      })
                    }
                    className="w-16 min-h-[34px] px-2 py-1 text-right text-sm font-bold font-mono tabular-nums border border-neutral-300 rounded-md"
                  />
                  <span className="text-xs font-semibold text-neutral-600">%</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[30, 35, 40, 45].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() =>
                      setQuote({ ...quote, targetMarginPct: pct, manualFinalPrice: null })
                    }
                    className={`min-h-[34px] text-xs font-mono font-semibold rounded-md border transition-colors ${
                      quote.targetMarginPct === pct && quote.manualFinalPrice === null
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Manual Negotiated Price */}
            <div className="pt-3 border-t border-neutral-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="manual-price-input" className="text-xs font-medium text-neutral-700">
                  Preço negociado (opcional)
                </label>
                {quote.manualFinalPrice !== null && (
                  <button
                    type="button"
                    onClick={() => setQuote({ ...quote, manualFinalPrice: null })}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Voltar ao sugerido
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">
                  R$
                </span>
                <input
                  id="manual-price-input"
                  type="number"
                  step="5"
                  min="0"
                  placeholder={String(financials.suggestedPrice)}
                  value={quote.manualFinalPrice === null ? '' : quote.manualFinalPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuote({
                      ...quote,
                      manualFinalPrice: val === '' ? null : Math.max(0, parseFloat(val) || 0),
                    });
                  }}
                  className="w-full min-h-[38px] pl-9 pr-3 py-1.5 text-sm font-mono tabular-nums border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* Final Result Box */}
            <div
              data-testid="margin-summary"
              className={`p-3.5 rounded-xl border ${
                financials.marginHealth === 'critica'
                  ? 'bg-red-50 border-red-200'
                  : financials.marginHealth === 'atencao'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50/70 border-emerald-200'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-neutral-700">Preço final cliente</span>
                <span className="text-xs font-mono tabular-nums text-neutral-600">
                  {formatBRL(financials.pricePerGuest)} / convidado
                </span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                {formatBRL(financials.finalPrice)}
              </p>

              <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-700">Seu lucro líquido</span>
                <span
                  className={`font-bold font-mono tabular-nums ${
                    financials.marginHealth === 'critica'
                      ? 'text-red-700'
                      : financials.marginHealth === 'atencao'
                      ? 'text-amber-800'
                      : 'text-emerald-800'
                  }`}
                >
                  {formatBRL(financials.netProfit)} ({financials.effectiveMarginPct.toFixed(1)}%)
                </span>
              </div>

              {financials.marginHealth === 'critica' && (
                <p className="mt-1.5 text-xs font-semibold text-red-800 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Margem abaixo do seu piso de {profile.minMarginFloorPct}%. Revise o desconto ou troque insumos.
                </p>
              )}
              {financials.marginHealth === 'atencao' && (
                <p className="mt-1.5 text-xs font-medium text-amber-800">
                  Margem justa — perto do piso mínimo de {profile.minMarginFloorPct}%.
                </p>
              )}
              {financials.marginHealth === 'saudavel' && (
                <p className="mt-1.5 text-xs font-medium text-emerald-800">
                  Margem travada dentro da meta saudável.
                </p>
              )}
            </div>

            {/* Primary Actions */}
            <div className="space-y-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  const saved = validateAndPersist(undefined, false);
                  if (saved) onOpenProposal(saved);
                }}
                className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Gerar Proposta em PDF
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => validateAndPersist(undefined, false)}
                  className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {savedNotice ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      Salvo!
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Salvar
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedWa ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      WhatsApp
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => validateAndPersist('confirmado', true)}
                className="w-full min-h-[40px] px-4 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Salvar e Confirmar p/ Compras
              </button>
            </div>
          </div>
        </aside>
      </div>

      <QuickSwapModal
        open={showQuickSwap}
        existingIngredients={quote.ingredients}
        onClose={() => setShowQuickSwap(false)}
        onAddCustomItem={handleAddCustomItem}
        onSwapItem={handleSwapItem}
      />
    </div>
  );
};
