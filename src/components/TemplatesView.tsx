import React, { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, Check, Save, ArrowRight } from 'lucide-react';
import type {
  CateringTemplate,
  IngredientCategory,
  IngredientUnit,
  ScalingMode,
  TemplateIngredient,
} from '../types/catering';
import { CATEGORY_LABELS, CATEGORY_ORDER, UNIT_LABELS } from '../utils/pricing';

interface TemplatesViewProps {
  templates: CateringTemplate[];
  onSaveTemplate: (template: CateringTemplate) => void;
  onCreateTemplate: (template: CateringTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onStartQuoteFromTemplate: (templateId: string) => void;
}

const UNITS: IngredientUnit[] = ['kg', 'un', 'L', 'pct', 'cx', 'fd', 'sc'];

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onSaveTemplate,
  onCreateTemplate,
  onDeleteTemplate,
  onStartQuoteFromTemplate,
}) => {
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id || '');
  const selected = templates.find((t) => t.id === selectedId) || templates[0];

  const [draft, setDraft] = useState<CateringTemplate>(selected);
  const [savedToast, setSavedToast] = useState(false);

  // Add ingredient inline form
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<IngredientCategory>('acougue');
  const [newUnit, setNewUnit] = useState<IngredientUnit>('kg');
  const [newScale, setNewScale] = useState<ScalingMode>('per_guest');
  const [newQty, setNewQty] = useState('0.1');
  const [newCost, setNewCost] = useState('30');

  useEffect(() => {
    if (selected) {
      setDraft(selected);
      setSavedToast(false);
    }
  }, [selected?.id]);

  if (!draft) return null;

  const handleSave = () => {
    onSaveTemplate(draft);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2200);
  };

  const handleDuplicate = () => {
    const copy: CateringTemplate = {
      ...draft,
      id: `tpl-${Date.now()}`,
      name: `${draft.name} (Cópia)`,
      shortTag: `${draft.shortTag} II`,
    };
    onCreateTemplate(copy);
    setSelectedId(copy.id);
  };

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    const qtyNum = parseFloat(newQty.replace(',', '.'));
    const costNum = parseFloat(newCost.replace(',', '.'));
    if (!trimmed || !Number.isFinite(qtyNum) || qtyNum <= 0 || !Number.isFinite(costNum)) return;

    const item: TemplateIngredient = {
      id: `ing-${Date.now()}`,
      name: trimmed,
      category: newCat,
      unit: newUnit,
      scalingMode: newScale,
      baseQuantity: qtyNum,
      unitCost: Math.max(0, costNum),
      clientLabel: trimmed,
      showInMenu: true,
    };

    setDraft((prev) => ({ ...prev, ingredients: [...prev.ingredients, item] }));
    setNewName('');
  };

  const updateIngredient = (id: string, patch: Partial<TemplateIngredient>) => {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  };

  const removeIngredient = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((i) => i.id !== id),
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      {/* Left Template Selector */}
      <aside className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Templates prontos</h2>
            <p className="text-xs text-neutral-500">{templates.length} fichas técnicas</p>
          </div>
          <button
            type="button"
            onClick={handleDuplicate}
            aria-label="Duplicar template selecionado"
            title="Duplicar template atual"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        <nav className="divide-y divide-neutral-200" aria-label="Lista de templates de cardápio">
          {templates.map((tpl) => {
            const active = tpl.id === draft.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedId(tpl.id)}
                className={`w-full text-left px-4 py-3.5 transition-colors flex flex-col gap-0.5 ${
                  active ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <span className="text-sm font-semibold leading-snug">{tpl.name}</span>
                <span
                  className={`text-xs font-mono tabular-nums ${
                    active ? 'text-neutral-300' : 'text-neutral-500'
                  }`}
                >
                  {tpl.ingredients.length} insumos · Margem {tpl.defaultTargetMarginPct}%
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right Template Editor */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">{draft.name}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Atualize preços de insumos ou consumo por convidado — vale para todos os novos orçamentos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onStartQuoteFromTemplate(draft.id)}
              className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              Cotar com este template
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              {savedToast ? (
                <>
                  <Check className="w-4 h-4" />
                  Template salvo!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar alterações
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Template Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="sm:col-span-2">
              <label htmlFor="tpl-name" className="block text-xs font-medium text-neutral-700 mb-1">
                Nome do template
              </label>
              <input
                id="tpl-name"
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-neutral-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="tpl-guests" className="block text-xs font-medium text-neutral-700 mb-1">
                Convidados padrão
              </label>
              <input
                id="tpl-guests"
                type="number"
                min={5}
                value={draft.defaultGuests}
                onChange={(e) =>
                  setDraft({ ...draft, defaultGuests: Math.max(5, Number(e.target.value) || 50) })
                }
                className="w-full min-h-[42px] px-3 py-2 text-sm font-mono tabular-nums border border-neutral-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="tpl-margin" className="block text-xs font-medium text-neutral-700 mb-1">
                Margem padrão (%)
              </label>
              <input
                id="tpl-margin"
                type="number"
                min={10}
                max={75}
                value={draft.defaultTargetMarginPct}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    defaultTargetMarginPct: Math.min(
                      75,
                      Math.max(10, Number(e.target.value) || 35)
                    ),
                  })
                }
                className="w-full min-h-[42px] px-3 py-2 text-sm font-mono tabular-nums border border-neutral-300 rounded-lg"
              />
            </div>
          </div>

          {/* Ingredients Table */}
          <div>
            <h4 className="text-sm font-bold text-neutral-900 mb-2.5">
              Ficha técnica de insumos ({draft.ingredients.length})
            </h4>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-neutral-200">
                {draft.ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900">{ing.name}</p>
                      <p className="text-xs text-neutral-500">
                        {CATEGORY_LABELS[ing.category]} ·{' '}
                        {ing.scalingMode === 'per_guest'
                          ? 'Por convidado'
                          : ing.scalingMode === 'per_guest_hour'
                          ? 'Por convidado × hora'
                          : 'Fixo'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label htmlFor={`tpl-qty-${ing.id}`} className="sr-only">
                        Consumo base de {ing.name}
                      </label>
                      <input
                        id={`tpl-qty-${ing.id}`}
                        type="number"
                        step="any"
                        min="0"
                        value={ing.baseQuantity}
                        onChange={(e) =>
                          updateIngredient(ing.id, {
                            baseQuantity: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-20 min-h-[38px] px-2 py-1 text-xs text-right font-mono tabular-nums border border-neutral-200 rounded-md"
                      />
                      <span className="text-xs text-neutral-500 w-7">{UNIT_LABELS[ing.unit]}</span>

                      <span className="text-xs text-neutral-500">R$</span>
                      <label htmlFor={`tpl-cost-${ing.id}`} className="sr-only">
                        Preço unitário de {ing.name}
                      </label>
                      <input
                        id={`tpl-cost-${ing.id}`}
                        type="number"
                        step="0.1"
                        min="0"
                        value={ing.unitCost}
                        onChange={(e) =>
                          updateIngredient(ing.id, {
                            unitCost: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-24 min-h-[38px] px-2 py-1 text-xs text-right font-mono tabular-nums border border-neutral-200 rounded-md"
                      />

                      <button
                        type="button"
                        onClick={() => removeIngredient(ing.id)}
                        aria-label={`Remover ${ing.name} do template`}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new ingredient row */}
              <form
                onSubmit={handleAddIngredient}
                className="p-3.5 bg-neutral-50 border-t border-neutral-200 grid grid-cols-2 sm:grid-cols-12 gap-2 items-end"
              >
                <div className="col-span-2 sm:col-span-4">
                  <label htmlFor="add-tpl-ing-name" className="block text-[11px] font-medium text-neutral-600 mb-1">
                    Novo insumo no template
                  </label>
                  <input
                    id="add-tpl-ing-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex.: Queijo Coalho"
                    className="w-full min-h-[38px] px-2.5 py-1 text-xs bg-white border border-neutral-300 rounded-md"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label htmlFor="add-tpl-ing-cat" className="block text-[11px] font-medium text-neutral-600 mb-1">
                    Setor
                  </label>
                  <select
                    id="add-tpl-ing-cat"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value as IngredientCategory)}
                    className="w-full min-h-[38px] px-2 py-1 text-xs bg-white border border-neutral-300 rounded-md"
                  >
                    {CATEGORY_ORDER.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c].split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label htmlFor="add-tpl-ing-scale" className="block text-[11px] font-medium text-neutral-600 mb-1">
                    Regra
                  </label>
                  <select
                    id="add-tpl-ing-scale"
                    value={newScale}
                    onChange={(e) => setNewScale(e.target.value as ScalingMode)}
                    className="w-full min-h-[38px] px-2 py-1 text-xs bg-white border border-neutral-300 rounded-md"
                  >
                    <option value="per_guest">/pessoa</option>
                    <option value="per_guest_hour">/p×hora</option>
                    <option value="fixed">Fixo</option>
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-1">
                  <label htmlFor="add-tpl-ing-qty" className="block text-[11px] font-medium text-neutral-600 mb-1">
                    Qtd
                  </label>
                  <input
                    id="add-tpl-ing-qty"
                    type="number"
                    step="any"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="w-full min-h-[38px] px-2 py-1 text-xs font-mono bg-white border border-neutral-300 rounded-md"
                  />
                </div>
                <div className="col-span-1 sm:col-span-1">
                  <label htmlFor="add-tpl-ing-unit" className="block text-[11px] font-medium text-neutral-600 mb-1">
                    Un.
                  </label>
                  <select
                    id="add-tpl-ing-unit"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as IngredientUnit)}
                    className="w-full min-h-[38px] px-1.5 py-1 text-xs bg-white border border-neutral-300 rounded-md"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {UNIT_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-1">
                  <label htmlFor="add-tpl-ing-cost" className="block text-[11px] font-medium text-neutral-600 mb-1">
                    R$
                  </label>
                  <input
                    id="add-tpl-ing-cost"
                    type="number"
                    step="0.1"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full min-h-[38px] px-2 py-1 text-xs font-mono bg-white border border-neutral-300 rounded-md"
                  />
                </div>
                <div className="col-span-1 sm:col-span-1">
                  <button
                    type="submit"
                    aria-label="Adicionar insumo ao template"
                    className="w-full min-h-[38px] px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {templates.length > 1 && (
            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const next = templates.find((t) => t.id !== draft.id);
                  onDeleteTemplate(draft.id);
                  if (next) setSelectedId(next.id);
                }}
                className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir este template
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
