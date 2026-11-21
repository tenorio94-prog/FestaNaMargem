import React, { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  PlusCircle,
  ShoppingBasket,
  ChefHat,
  SlidersHorizontal,
  Plus,
} from 'lucide-react';
import type { BuffetProfile, CateringTemplate, Quote, QuoteStatus } from './types/catering';
import { createQuoteFromTemplate } from './data/seedData';
import {
  loadBuffetProfile,
  loadCheckedShoppingKeys,
  loadQuotes,
  loadTemplates,
  saveBuffetProfile,
  saveCheckedShoppingKeys,
  saveQuotes,
  saveTemplates,
} from './utils/storage';
import { calculateQuoteFinancials } from './utils/pricing';
import { QuotesListView } from './components/QuotesListView';
import { QuoteEditorView } from './components/QuoteEditorView';
import { ShoppingListView } from './components/ShoppingListView';
import { TemplatesView } from './components/TemplatesView';
import { ProposalPreviewModal } from './components/ProposalPreviewModal';
import { BuffetSettingsModal } from './components/BuffetSettingsModal';

type AppTab = 'orcamentos' | 'cotar' | 'compras' | 'templates';

export default function App() {
  const [quotes, setQuotes] = useState<Quote[]>(() => loadQuotes());
  const [templates, setTemplates] = useState<CateringTemplate[]>(() => loadTemplates());
  const [profile, setProfile] = useState<BuffetProfile>(() => loadBuffetProfile());
  const [checkedShoppingKeys, setCheckedShoppingKeys] = useState<string[]>(() =>
    loadCheckedShoppingKeys()
  );

  const [activeTab, setActiveTab] = useState<AppTab>('orcamentos');
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [editingIsNew, setEditingIsNew] = useState(false);

  const [proposalQuote, setProposalQuote] = useState<Quote | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const nextCodeNumber = useMemo(() => {
    const maxNum = quotes.reduce((max, q) => {
      const match = q.code.match(/(\d+)/);
      const num = match ? parseInt(match[1], 10) : 100;
      return Math.max(max, num);
    }, 100);
    return maxNum + 1;
  }, [quotes]);

  const persistQuotes = (next: Quote[]) => {
    setQuotes(next);
    saveQuotes(next);
  };

  const handleStartNewQuote = (templateId?: string) => {
    const tpl = templates.find((t) => t.id === templateId) || templates[0];
    const fresh = createQuoteFromTemplate(
      tpl,
      { targetMarginPct: tpl.defaultTargetMarginPct || profile.defaultMarginPct },
      nextCodeNumber
    );
    setEditingQuote(fresh);
    setEditingIsNew(true);
    setActiveTab('cotar');
  };

  const handleOpenEditQuote = (quoteId: string) => {
    const found = quotes.find((q) => q.id === quoteId);
    if (!found) return;
    setEditingQuote(found);
    setEditingIsNew(false);
    setActiveTab('cotar');
  };

  const handleSaveQuote = (saved: Quote, goBack = false) => {
    const exists = quotes.some((q) => q.id === saved.id);
    const next = exists
      ? quotes.map((q) => (q.id === saved.id ? saved : q))
      : [saved, ...quotes];
    persistQuotes(next);
    setEditingQuote(saved);
    setEditingIsNew(false);
    if (goBack) {
      setActiveTab('orcamentos');
    }
  };

  const handleDuplicateQuote = (quoteId: string) => {
    const source = quotes.find((q) => q.id === quoteId);
    if (!source) return;
    const now = new Date().toISOString();
    const copy: Quote = {
      ...source,
      id: `quote-${Date.now()}`,
      code: `ORC-${nextCodeNumber}`,
      eventTitle: `${source.eventTitle} (Cópia)`,
      status: 'rascunho',
      createdAt: now,
      updatedAt: now,
    };
    persistQuotes([copy, ...quotes]);
  };

  const handleDeleteQuote = (quoteId: string) => {
    const next = quotes.filter((q) => q.id !== quoteId);
    persistQuotes(next);
    if (editingQuote?.id === quoteId) {
      setEditingQuote(null);
      setActiveTab('orcamentos');
    }
  };

  const handleQuickStatusChange = (quoteId: string, status: QuoteStatus) => {
    const next = quotes.map((q) =>
      q.id === quoteId ? { ...q, status, updatedAt: new Date().toISOString() } : q
    );
    persistQuotes(next);
  };

  const handleToggleShoppingItem = (key: string) => {
    const next = checkedShoppingKeys.includes(key)
      ? checkedShoppingKeys.filter((k) => k !== key)
      : [...checkedShoppingKeys, key];
    setCheckedShoppingKeys(next);
    saveCheckedShoppingKeys(next);
  };

  const handleClearShoppingChecked = () => {
    setCheckedShoppingKeys([]);
    saveCheckedShoppingKeys([]);
  };

  const handleSaveTemplate = (updated: CateringTemplate) => {
    const next = templates.map((t) => (t.id === updated.id ? updated : t));
    setTemplates(next);
    saveTemplates(next);
  };

  const handleCreateTemplate = (created: CateringTemplate) => {
    const next = [...templates, created];
    setTemplates(next);
    saveTemplates(next);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (templates.length <= 1) return;
    const next = templates.filter((t) => t.id !== templateId);
    setTemplates(next);
    saveTemplates(next);
  };

  const handleSaveProfile = (nextProfile: BuffetProfile) => {
    setProfile(nextProfile);
    saveBuffetProfile(nextProfile);
  };

  const navItems: Array<{ id: AppTab; label: string; mobileLabel: string; icon: React.ReactNode }> = [
    {
      id: 'orcamentos',
      label: 'Orçamentos',
      mobileLabel: 'Orçamentos',
      icon: <FileSpreadsheet className="w-[18px] h-[18px]" />,
    },
    {
      id: 'cotar',
      label: 'Cotador Rápido',
      mobileLabel: 'Cotar',
      icon: <PlusCircle className="w-[18px] h-[18px]" />,
    },
    {
      id: 'compras',
      label: 'Compras do FDS',
      mobileLabel: 'Compras',
      icon: <ShoppingBasket className="w-[18px] h-[18px]" />,
    },
    {
      id: 'templates',
      label: 'Templates',
      mobileLabel: 'Templates',
      icon: <ChefHat className="w-[18px] h-[18px]" />,
    },
  ];

  const handleNavClick = (tab: AppTab) => {
    if (tab === 'cotar' && !editingQuote) {
      handleStartNewQuote();
      return;
    }
    setActiveTab(tab);
  };

  const pageHeading: Record<AppTab, string> = {
    orcamentos: 'Agenda de Orçamentos',
    cotar: editingIsNew ? 'Novo Orçamento' : 'Editar Orçamento',
    compras: 'Compras do Fim de Semana',
    templates: 'Templates e Fichas Técnicas',
  };

  const proposalFinancials = useMemo(
    () =>
      proposalQuote
        ? calculateQuoteFinancials(proposalQuote, profile.minMarginFloorPct)
        : null,
    [proposalQuote, profile.minMarginFloorPct]
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-neutral-900 flex flex-col lg:flex-row">
      {/* Desktop Left Workspace Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-white border-r border-neutral-200 z-30">
        <div className="h-16 px-5 flex items-center border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('orcamentos')}
            className="text-lg font-extrabold tracking-tight text-neutral-900 whitespace-nowrap shrink-0"
          >
            FestaNaMargem
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Navegação principal">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg text-left hover:bg-neutral-100 transition-colors flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-neutral-900 truncate">{profile.businessName}</p>
              <p className="text-[11px] text-neutral-500 font-mono tabular-nums">
                Piso {profile.minMarginFloorPct}% · Quebra +{profile.defaultSafetyBufferPct}%
              </p>
            </div>
            <SlidersHorizontal className="w-4 h-4 text-neutral-500 shrink-0" />
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-60 flex flex-col min-h-screen">
        {/* Top Bar Contract: compact 52px on mobile, 64px on desktop */}
        <header className="sticky top-0 z-20 h-[52px] lg:h-16 bg-white/95 backdrop-blur-sm border-b border-neutral-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="lg:hidden text-base font-extrabold tracking-tight text-neutral-900 whitespace-nowrap shrink-0">
              FestaNaMargem
            </span>
            <h1 className="hidden lg:block text-base font-bold text-neutral-900 truncate">
              {pageHeading[activeTab]}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label="Configurar dados do buffet"
              className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            {!(activeTab === 'cotar' && editingIsNew) && (
              <button
                type="button"
                onClick={() => handleStartNewQuote()}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Novo orçamento
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-10">
          {activeTab === 'orcamentos' && (
            <QuotesListView
              quotes={quotes}
              templates={templates}
              profile={profile}
              onCreateNew={handleStartNewQuote}
              onEditQuote={handleOpenEditQuote}
              onDuplicateQuote={handleDuplicateQuote}
              onDeleteQuote={handleDeleteQuote}
              onQuickStatusChange={handleQuickStatusChange}
              onOpenProposal={(q) => setProposalQuote(q)}
              onOpenWeekendShopping={() => setActiveTab('compras')}
            />
          )}

          {activeTab === 'cotar' && editingQuote && (
            <QuoteEditorView
              key={editingQuote.id + (editingIsNew ? '-new' : '-edit')}
              initialQuote={editingQuote}
              isNew={editingIsNew}
              templates={templates}
              profile={profile}
              onSave={handleSaveQuote}
              onCancel={() => setActiveTab('orcamentos')}
              onOpenProposal={(q) => setProposalQuote(q)}
            />
          )}

          {activeTab === 'compras' && (
            <ShoppingListView
              quotes={quotes}
              profile={profile}
              checkedKeys={checkedShoppingKeys}
              onToggleChecked={handleToggleShoppingItem}
              onClearChecked={handleClearShoppingChecked}
              onNavigateToQuotes={() => setActiveTab('orcamentos')}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesView
              templates={templates}
              onSaveTemplate={handleSaveTemplate}
              onCreateTemplate={handleCreateTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onStartQuoteFromTemplate={handleStartNewQuote}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (64px height; combined with 52px top bar = 116px = 13.7% of 844px) */}
      <nav
        aria-label="Navegação móvel"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/95 backdrop-blur-md border-t border-neutral-200 grid grid-cols-4 items-center"
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-emerald-700 font-semibold' : 'text-neutral-500'
              }`}
            >
              {item.icon}
              <span className="text-[11px] leading-none whitespace-nowrap">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Client Proposal PDF Preview Modal */}
      {proposalQuote && proposalFinancials && (
        <ProposalPreviewModal
          open={Boolean(proposalQuote)}
          quote={proposalQuote}
          financials={proposalFinancials}
          profile={profile}
          onClose={() => setProposalQuote(null)}
          onMarkSent={() => handleQuickStatusChange(proposalQuote.id, 'enviado')}
        />
      )}

      {/* Buffet Identity & Margin Rules Modal */}
      <BuffetSettingsModal
        open={showSettings}
        profile={profile}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
