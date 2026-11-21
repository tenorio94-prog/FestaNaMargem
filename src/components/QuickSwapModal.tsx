import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Plus } from 'lucide-react';
import type {
  IngredientCategory,
  IngredientUnit,
  QuoteIngredient,
  ScalingMode,
} from '../types/catering';
import { CATEGORY_LABELS, CATEGORY_ORDER, UNIT_LABELS } from '../utils/pricing';

interface QuickSwapModalProps {
  open: boolean;
  existingIngredients: QuoteIngredient[];
  onClose: () => void;
  onAddCustomItem: (item: QuoteIngredient) => void;
  onSwapItem: (targetId: string, replacement: QuoteIngredient) => void;
}

const UNITS: IngredientUnit[] = ['kg', 'un', 'L', 'pct', 'cx', 'fd', 'sc'];

export const QuickSwapModal: React.FC<QuickSwapModalProps> = ({
  open,
  existingIngredients,
  onClose,
  onAddCustomItem,
  onSwapItem,
}) => {
  const [mode, setMode] = useState<'add' | 'swap'>('add');
  const [targetId, setTargetId] = useState<string>('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<IngredientCategory>('acougue');
  const [unit, setUnit] = useState<IngredientUnit>('kg');
  const [scalingMode, setScalingMode] = useState<ScalingMode>('per_guest');
  const [baseQuantity, setBaseQuantity] = useState('0.15');
  const [unitCost, setUnitCost] = useState('45');
  const [clientLabel, setClientLabel] = useState('');
  const [showInMenu, setShowInMenu] = useState(true);
  const [error, setError] = useState('');

  const activeIngredients = existingIngredients.filter((i) => i.enabled);

  useEffect(() => {
    if (!open) return;
    setError('');
    setName('');
    setClientLabel('');
    setShowInMenu(true);
    if (mode === 'swap' && activeIngredients.length > 0 && !targetId) {
      const first = activeIngredients[0];
      setTargetId(first.id);
      setCategory(first.category);
      setUnit(first.unit);
      setScalingMode(first.scalingMode);
      setBaseQuantity(String(first.baseQuantity));
      setUnitCost(String(first.unitCost));
    }
  }, [open, mode]);

  if (!open) return null;

  const handleSelectTarget = (id: string) => {
    setTargetId(id);
    const found = existingIngredients.find((i) => i.id === id);
    if (found) {
      setCategory(found.category);
      setUnit(found.unit);
      setScalingMode(found.scalingMode);
      setBaseQuantity(String(found.baseQuantity));
      setUnitCost(String(found.unitCost));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const qtyNum = parseFloat(baseQuantity.replace(',', '.'));
    const costNum = parseFloat(unitCost.replace(',', '.'));

    if (!trimmedName) {
      setError('Informe o nome do item ou insumo.');
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError('Informe uma quantidade válida maior que zero.');
      return;
    }
    if (!Number.isFinite(costNum) || costNum < 0) {
      setError('Informe um custo unitário válido.');
      return;
    }

    const original = mode === 'swap' ? existingIngredients.find((i) => i.id === targetId) : undefined;
    if (mode === 'swap' && !original) {
      setError('Selecione qual item do cardápio deseja trocar.');
      return;
    }

    const newItem: QuoteIngredient = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      category,
      unit,
      scalingMode,
      baseQuantity: qtyNum,
      unitCost: costNum,
      clientLabel: clientLabel.trim() || trimmedName,
      showInMenu,
      enabled: true,
      isCustom: true,
      swappedFrom: original ? original.name : undefined,
    };

    if (mode === 'swap' && original) {
      onSwapItem(original.id, newItem);
    } else {
      onAddCustomItem(newItem);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/50 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-swap-title"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl border border-neutral-200 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div>
            <h2 id="quick-swap-title" className="text-base font-bold text-neutral-900">
              Item avulso ou troca rápida
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Personalize sem travar a cotação — o custo e a margem recalculam na hora.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de item avulso"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('add');
                setError('');
              }}
              className={`min-h-[40px] px-3 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                mode === 'add'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar item avulso
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('swap');
                setError('');
                if (activeIngredients.length > 0) {
                  handleSelectTarget(targetId || activeIngredients[0].id);
                }
              }}
              disabled={activeIngredients.length === 0}
              className={`min-h-[40px] px-3 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-40 ${
                mode === 'swap'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Trocar item do template
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {mode === 'swap' && (
            <div>
              <label
                htmlFor="swap-target"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Substituir qual item atual?
              </label>
              <select
                id="swap-target"
                value={targetId}
                onChange={(e) => handleSelectTarget(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {activeIngredients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.baseQuantity} {UNIT_LABELS[item.unit]})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="quick-item-name"
              className="block text-xs font-medium text-neutral-700 mb-1.5"
            >
              {mode === 'swap' ? 'Novo item substituto' : 'Nome do insumo ou adicional'}
            </label>
            <input
              id="quick-item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                mode === 'swap'
                  ? 'Ex.: Costela Bovina no Bafo'
                  : 'Ex.: Ilha de Açaí 10L, Queijo Coalho, Cerveja'
              }
              className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="quick-item-category"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Setor de compra
              </label>
              <select
                id="quick-item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as IngredientCategory)}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {CATEGORY_ORDER.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="quick-item-scaling"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Como calcula a quantidade?
              </label>
              <select
                id="quick-item-scaling"
                value={scalingMode}
                onChange={(e) => {
                  const nextScale = e.target.value as ScalingMode;
                  setScalingMode(nextScale);
                  if (mode === 'add' && nextScale === 'fixed' && unit === 'kg') {
                    setUnit('un');
                  }
                }}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="per_guest">Por convidado</option>
                <option value="per_guest_hour">Por convidado × hora</option>
                <option value="fixed">Quantidade fixa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="quick-item-qty"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                {scalingMode === 'fixed'
                  ? 'Qtd. total'
                  : scalingMode === 'per_guest'
                  ? 'Qtd. / pessoa'
                  : 'Qtd. / p×h'}
              </label>
              <input
                id="quick-item-qty"
                type="number"
                step="any"
                min="0.01"
                value={baseQuantity}
                onChange={(e) => setBaseQuantity(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label
                htmlFor="quick-item-unit"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Unidade
              </label>
              <select
                id="quick-item-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as IngredientUnit)}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="quick-item-cost"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Custo (R$ / {UNIT_LABELS[unit]})
              </label>
              <input
                id="quick-item-cost"
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="quick-item-client-label"
              className="block text-xs font-medium text-neutral-700 mb-1.5"
            >
              Como aparece na proposta PDF (opcional)
            </label>
            <input
              id="quick-item-client-label"
              type="text"
              value={clientLabel}
              onChange={(e) => setClientLabel(e.target.value)}
              placeholder="Deixe vazio para usar o nome acima"
              className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-neutral-700 cursor-pointer min-h-[40px]">
            <input
              type="checkbox"
              checked={showInMenu}
              onChange={(e) => setShowInMenu(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            Exibir este item no cardápio da proposta PDF para o cliente
          </label>

          {error && (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              {mode === 'swap' ? 'Confirmar troca' : 'Adicionar ao orçamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
