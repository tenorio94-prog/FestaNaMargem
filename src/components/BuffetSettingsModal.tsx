import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { BuffetProfile } from '../types/catering';

interface BuffetSettingsModalProps {
  open: boolean;
  profile: BuffetProfile;
  onClose: () => void;
  onSave: (profile: BuffetProfile) => void;
}

export const BuffetSettingsModal: React.FC<BuffetSettingsModalProps> = ({
  open,
  profile,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<BuffetProfile>(profile);

  useEffect(() => {
    if (open) setForm(profile);
  }, [open, profile]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      businessName: form.businessName.trim() || 'Meu Buffet',
      defaultMarginPct: Math.min(75, Math.max(10, Number(form.defaultMarginPct) || 35)),
      minMarginFloorPct: Math.min(60, Math.max(5, Number(form.minMarginFloorPct) || 25)),
      defaultSafetyBufferPct: Math.min(30, Math.max(0, Number(form.defaultSafetyBufferPct) || 10)),
      proposalValidityDays: Math.min(60, Math.max(1, Number(form.proposalValidityDays) || 7)),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/50 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buffet-settings-title"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl border border-neutral-200 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div>
            <h2 id="buffet-settings-title" className="text-base font-bold text-neutral-900">
              Dados do meu buffet e regras de margem
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Aparecem no cabeçalho da proposta PDF e travam seu piso de lucro.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações do buffet"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cfg-business" className="block text-xs font-medium text-neutral-700 mb-1">
                Nome do buffet
              </label>
              <input
                id="cfg-business"
                type="text"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="w-full min-h-[44px] px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label htmlFor="cfg-owner" className="block text-xs font-medium text-neutral-700 mb-1">
                Responsável
              </label>
              <input
                id="cfg-owner"
                type="text"
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                className="w-full min-h-[44px] px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cfg-phone" className="block text-xs font-medium text-neutral-700 mb-1">
                WhatsApp comercial
              </label>
              <input
                id="cfg-phone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full min-h-[44px] px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label htmlFor="cfg-city" className="block text-xs font-medium text-neutral-700 mb-1">
                Cidade / Região
              </label>
              <input
                id="cfg-city"
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full min-h-[44px] px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-neutral-100">
            <div>
              <label htmlFor="cfg-margin" className="block text-xs font-medium text-neutral-700 mb-1">
                Margem padrão (%)
              </label>
              <input
                id="cfg-margin"
                type="number"
                min={10}
                max={75}
                value={form.defaultMarginPct}
                onChange={(e) => setForm({ ...form, defaultMarginPct: Number(e.target.value) })}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label htmlFor="cfg-floor" className="block text-xs font-medium text-neutral-700 mb-1">
                Piso de alerta (%)
              </label>
              <input
                id="cfg-floor"
                type="number"
                min={5}
                max={60}
                value={form.minMarginFloorPct}
                onChange={(e) => setForm({ ...form, minMarginFloorPct: Number(e.target.value) })}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label htmlFor="cfg-buffer" className="block text-xs font-medium text-neutral-700 mb-1">
                Quebra compras (%)
              </label>
              <input
                id="cfg-buffer"
                type="number"
                min={0}
                max={30}
                value={form.defaultSafetyBufferPct}
                onChange={(e) =>
                  setForm({ ...form, defaultSafetyBufferPct: Number(e.target.value) })
                }
                className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cfg-terms" className="block text-xs font-medium text-neutral-700 mb-1">
              Condições de pagamento padrão (no PDF)
            </label>
            <textarea
              id="cfg-terms"
              rows={2}
              value={form.paymentTerms}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800"
            >
              Salvar configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
