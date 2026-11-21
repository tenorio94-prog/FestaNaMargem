import React, { useState } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import type { BuffetProfile, Quote, QuoteFinancials } from '../types/catering';
import { formatBRL, formatFullDateBR } from '../utils/pricing';
import { buildWhatsAppProposalText, downloadProposalPdf } from '../utils/pdfExport';

interface ProposalPreviewModalProps {
  open: boolean;
  quote: Quote;
  financials: QuoteFinancials;
  profile: BuffetProfile;
  onClose: () => void;
  onMarkSent?: () => void;
}

export const ProposalPreviewModal: React.FC<ProposalPreviewModalProps> = ({
  open,
  quote,
  financials,
  profile,
  onClose,
  onMarkSent,
}) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const menuItems = quote.ingredients
    .filter((i) => i.enabled && i.showInMenu)
    .map((i) => i.clientLabel?.trim() || i.name);

  const supportItems = quote.supportCosts.filter((s) => s.enabled);

  const handleDownload = () => {
    downloadProposalPdf(quote, financials, profile);
    if (quote.status === 'rascunho' && onMarkSent) {
      onMarkSent();
    }
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
    if (quote.status === 'rascunho' && onMarkSent) {
      onMarkSent();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 backdrop-blur-[2px] p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-preview-title"
    >
      <div className="w-full max-w-2xl bg-white rounded-xl border border-neutral-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
          <div>
            <h2 id="proposal-preview-title" className="text-sm font-bold text-neutral-900">
              Prévia da Proposta para o Cliente
            </h2>
            <p className="text-xs text-neutral-500">
              Seus custos internos e margem de lucro ficam ocultos neste documento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar prévia da proposta"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Preview Surface */}
        <div className="overflow-y-auto p-4 sm:p-5 bg-[#F3F4F2]">
          <article className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
            {/* Brand Header */}
            <div className="bg-neutral-900 text-white px-5 py-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold tracking-tight">{profile.businessName}</h3>
                <p className="text-xs text-neutral-300 mt-0.5">
                  {[profile.ownerName, profile.phone, profile.city].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-mono font-semibold tracking-wide text-white">
                  PROPOSTA {quote.code}
                </p>
                <p className="text-xs text-neutral-300 mt-0.5">
                  Validade: {profile.proposalValidityDays} dias
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-neutral-900">
                  {quote.eventTitle || quote.templateName}
                </h4>
                <p className="text-sm text-neutral-600 mt-0.5">
                  Cliente: <strong className="font-semibold text-neutral-900">{quote.clientName || 'A confirmar'}</strong>
                  {quote.clientPhone ? ` · ${quote.clientPhone}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <div>
                  <p className="text-xs text-neutral-500">Data</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums mt-0.5">
                    {formatFullDateBR(quote.eventDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Horário / Duração</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums mt-0.5">
                    {quote.eventTime || 'A combinar'} ({quote.hours}h)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Convidados</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums mt-0.5">
                    {quote.guests} pessoas
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Local</p>
                  <p className="text-sm font-semibold text-neutral-900 truncate mt-0.5">
                    {quote.location || 'A definir'}
                  </p>
                </div>
              </div>

              <div>
                <h5 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-200">
                  O que está incluso no cardápio e serviço
                </h5>
                {menuItems.length === 0 ? (
                  <p className="text-sm text-neutral-500 mt-3">
                    Nenhum item marcado para exibição no cardápio.
                  </p>
                ) : (
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-neutral-700">
                    {menuItems.map((label, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-700 font-bold select-none">•</span>
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {supportItems.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-neutral-700 mb-1.5">
                    Equipe e estrutura inclusas
                  </h5>
                  <p className="text-sm text-neutral-600">
                    {supportItems.map((s) => s.name).join(' · ')}
                  </p>
                </div>
              )}

              {quote.notes.trim() && (
                <div>
                  <h5 className="text-xs font-bold text-neutral-700 mb-1">Observações combinadas</h5>
                  <p className="text-sm text-neutral-600 whitespace-pre-line">{quote.notes}</p>
                </div>
              )}

              {/* Investment box */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    Investimento total do evento
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                    {formatBRL(financials.finalPrice)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-semibold font-mono tabular-nums text-neutral-900">
                    {formatBRL(financials.pricePerGuest)} / convidado
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {quote.guests} convidados · {quote.hours}h de serviço
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100">
                <p className="text-xs font-semibold text-neutral-800">
                  Condições de pagamento e reserva
                </p>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  {profile.paymentTerms}
                </p>
              </div>
            </div>
          </article>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 border-t border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-neutral-800 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Resumo copiado!' : 'Copiar p/ WhatsApp'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Baixar Proposta em PDF
          </button>
        </div>
      </div>
    </div>
  );
};
