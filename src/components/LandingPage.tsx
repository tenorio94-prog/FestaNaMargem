import React, { useState } from 'react';
import { ArrowRight, Check, CheckCircle2, ChefHat } from 'lucide-react';
import type { CateringTemplate } from '../types/catering';
import { calculateQuoteFinancials, formatBRL } from '../utils/pricing';
import { createQuoteFromTemplate } from '../data/seedData';

interface LandingPageProps {
  templates: CateringTemplate[];
  onEnterApp: () => void;
  onStartWithTemplate: (templateId: string) => void;
}

const HERO_IMG = '/src/assets/images/hero_catering_prep_1795274662025.jpg';
const SPREAD_IMG = '/src/assets/images/buffet_table_spread_1795274663269.jpg';
const WAITLIST_STORAGE_KEY = 'festanamargem:v1:waitlist';

export const LandingPage: React.FC<LandingPageProps> = ({
  templates,
  onEnterApp,
  onStartWithTemplate,
}) => {
  const [heroImgError, setHeroImgError] = useState(false);
  const [spreadImgError, setSpreadImgError] = useState(false);

  // Early-access / validation lead form
  const [buffetName, setBuffetName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [eventsPerMonth, setEventsPerMonth] = useState('4 a 8 festas/mês');
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = buffetName.trim();
    const digits = whatsapp.replace(/\D/g, '');

    if (cleanName.length < 2) {
      setFormError('Informe o nome do seu buffet ou operação.');
      return;
    }
    if (digits.length < 10) {
      setFormError('Informe um WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }

    setFormError('');
    try {
      const prev = JSON.parse(window.localStorage.getItem(WAITLIST_STORAGE_KEY) || '[]');
      const next = [
        ...prev,
        {
          buffetName: cleanName,
          whatsapp: whatsapp.trim(),
          eventsPerMonth,
          createdAt: new Date().toISOString(),
        },
      ];
      window.localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-neutral-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#F7F7F5]/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#topo"
            className="text-lg font-extrabold tracking-tight text-neutral-900 whitespace-nowrap shrink-0"
          >
            FestaNaMargem
          </a>

          <nav
            aria-label="Navegação da página inicial"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600"
          >
            <a
              href="#como-funciona"
              className="hover:text-neutral-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Como funciona
            </a>
            <a
              href="#templates"
              className="hover:text-neutral-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Templates
            </a>
            <a
              href="#comparativo"
              className="hover:text-neutral-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Comparativo
            </a>
            <a
              href="#preco"
              className="hover:text-neutral-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Preço
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onEnterApp}
              className="min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Abrir aplicativo
            </button>
          </div>
        </div>
      </header>

      <main id="topo">
        {/* Section 1: Hero (2-column stretched split + full-width 3-metric proof strip below) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-14 lg:pb-18">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between py-1">
              <div>
                <p className="text-xs sm:text-sm font-medium text-emerald-800">
                  Buffets e catering para eventos · Operação 100% single-player
                </p>
                <h1 className="mt-3 text-[clamp(2.15rem,4vw,3.35rem)] font-extrabold tracking-tight text-neutral-900 leading-[1.08]">
                  Do pedido no WhatsApp ao PDF com margem travada.
                </h1>
                <p className="mt-4 text-base sm:text-lg text-neutral-600 leading-relaxed max-w-xl">
                  Monte orçamentos no celular com custo real por convidado, hora e equipe — e gere
                  com 1 toque na quarta ou quinta-feira a lista de compras consolidada de todas as
                  festas do fim de semana.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onEnterApp}
                  className="min-h-[48px] px-6 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  Testar o aplicativo agora
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#como-funciona"
                  className="min-h-[48px] px-4 py-3 text-sm font-semibold text-neutral-800 hover:text-neutral-950 underline underline-offset-4 inline-flex items-center whitespace-nowrap shrink-0"
                >
                  Ver fluxo em 3 passos
                </a>
              </div>
            </div>

            {/* Hero Editorial Visual Anchor */}
            <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 min-h-[280px] sm:min-h-[360px]">
              {!heroImgError ? (
                <img
                  src={HERO_IMG}
                  alt="Churrasqueiro fatiando picanha na brasa com acompanhamentos de buffet para evento ao ar livre"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-neutral-300 bg-neutral-900">
                  <ChefHat className="w-10 h-10 mb-3 text-emerald-400" />
                  <p className="text-sm font-semibold">Operação de Catering com Margem Travada</p>
                </div>
              )}

              {/* Measured bottom contrast scrim anchoring the real financial promise */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-5 pt-14 text-white">
                <p className="text-xs text-neutral-300">
                  Exemplo real · Churrasco Itinerante · 60 convidados · 4h
                </p>
                <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-xl font-bold font-mono tabular-nums">
                    R$ 4.780,00{' '}
                    <span className="text-xs font-normal text-neutral-300">(R$ 79,67/pessoa)</span>
                  </p>
                  <p className="text-xs font-mono tabular-nums font-semibold text-emerald-300">
                    Lucro travado: R$ 1.675,10 (35,0%)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width 3-column Proof Strip below Hero Split */}
          <div className="mt-8 bg-white border border-neutral-200 rounded-xl grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
            <div className="p-5">
              <p className="text-xs font-medium text-neutral-500">Zero atrito operacional</p>
              <p className="text-base font-bold text-neutral-900 mt-1">
                100% single-player no celular
              </p>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Funciona só com o dono do buffet — não depende de cliente abrir link nem de
                freelancer baixar aplicativo.
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-neutral-500">Sem cadastro frio</p>
              <p className="text-base font-bold text-neutral-900 mt-1">
                5 templates prontos no dia 1
              </p>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Churrasco, infantil, coffee break, massas/crepes e finger food já vêm com ficha
                técnica editável.
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-neutral-500">Fim da compra "no olho"</p>
              <p className="text-base font-bold text-neutral-900 mt-1">
                Consolidado semanal em 1 toque
              </p>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Soma todos os insumos das festas confirmadas do fim de semana por setor de mercado e
                quebra configurável.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Mechanism-to-Outcome (Asymmetric Editorial Bento) */}
        <section
          id="como-funciona"
          className="border-t border-neutral-200 bg-white py-16 lg:py-20"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-emerald-800">Como funciona na rotina real</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                Feito para a velocidade do WhatsApp e o rigor da margem.
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-neutral-600 leading-relaxed">
                Um único erro de preço ou de compra em uma festa já custa mais que várias
                mensalidades. Cada etapa protege seu lucro sem travar o atendimento.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* 01 */}
              <div className="lg:col-span-7 bg-[#F7F7F5] border border-neutral-200 rounded-xl p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">
                    01. Cole o pedido do WhatsApp e trave sua margem líquida
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                    Cole a mensagem do cliente (ex.: &ldquo;churrasco para 60 pessoas 4 horas no
                    sábado&rdquo;) e o cotador já preenche convidados, duração, data e ficha
                    técnica. Insumos + equipe + frete + carvão/gás entram na conta antes de gerar o
                    PDF limpo para o cliente — sem jamais exibir seus custos internos.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-neutral-700">
                  <span>Insumos/convidado + hora</span>
                  <span aria-hidden="true">·</span>
                  <span>Alerta automático abaixo do piso</span>
                  <span aria-hidden="true">·</span>
                  <span>PDF + texto p/ WhatsApp</span>
                </div>
              </div>

              {/* 02 */}
              <div className="lg:col-span-5 bg-[#F7F7F5] border border-neutral-200 rounded-xl p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">
                    02. Troca rápida sem abandonar o orçamento
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                    Cliente pediu para trocar picanha por costela ou colocar uma ilha de açaí? O
                    botão <strong className="font-semibold text-neutral-900">+ Item avulso / troca rápida</strong>{' '}
                    faz a substituição em segundos e recalcula o preço travando sua margem na hora.
                  </p>
                </div>
                <p className="mt-6 pt-4 border-t border-neutral-200 text-xs text-neutral-600">
                  Personalizações entram automaticamente no cardápio do PDF e na lista de compras.
                </p>
              </div>

              {/* 03 */}
              <div className="lg:col-span-5 bg-neutral-900 text-white rounded-xl p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    03. Quarta ou quinta-feira: lista consolidada em 1 toque
                  </h3>
                  <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
                    Toque em <strong className="font-semibold text-white">Gerar Compras do FDS</strong> e
                    veja todos os eventos confirmados somados por corredor (Açougue, Hortifrúti,
                    Padaria, Mercearia, Bebidas e Descartáveis), com margem de quebra (+5% a +15%) e
                    detalhe de qual festa vem cada quilo.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-700 flex items-center justify-between text-xs font-mono tabular-nums text-emerald-300">
                  <span>Checklist no celular</span>
                  <span>PDF e WhatsApp p/ fornecedor</span>
                </div>
              </div>

              {/* Editorial Spread Photo */}
              <div className="lg:col-span-7 relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 min-h-[260px]">
                {!spreadImgError ? (
                  <img
                    src={SPREAD_IMG}
                    alt="Mesa organizada de buffet de eventos com bruschettas, pão de queijo, ramekins e frutas frescas"
                    referrerPolicy="no-referrer"
                    onError={() => setSpreadImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8 text-neutral-500">
                    <p className="text-sm font-medium">Cardápios estruturados por porção e hora</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: 5 Ready-to-Use Day-1 Templates */}
        <section id="templates" className="border-t border-neutral-200 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold text-emerald-800">
                  Pronto para usar no dia 1
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                  5 templates editáveis para você cotar sem cadastro frio.
                </h2>
                <p className="mt-2 text-sm sm:text-base text-neutral-600">
                  Clique em qualquer cardápio abaixo para abrir o aplicativo já com a ficha técnica
                  carregada e testar o cálculo real.
                </p>
              </div>
              <button
                type="button"
                onClick={onEnterApp}
                className="min-h-[42px] px-4 py-2 text-xs font-semibold text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors self-start md:self-auto whitespace-nowrap shrink-0"
              >
                Abrir painel completo
              </button>
            </div>

            <div className="mt-8 bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-200 overflow-hidden">
              {templates.slice(0, 5).map((tpl, index) => {
                const sampleQuote = createQuoteFromTemplate(tpl);
                const fin = calculateQuoteFinancials(sampleQuote);
                return (
                  <div
                    key={tpl.id}
                    className="p-5 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-neutral-50/70 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-xs font-mono text-neutral-400">
                          0{index + 1}.
                        </span>
                        <h3 className="text-base font-bold text-neutral-900">{tpl.name}</h3>
                      </div>
                      <p className="text-sm text-neutral-600 mt-1 max-w-2xl">{tpl.description}</p>
                      <p className="text-xs text-neutral-500 mt-2 font-mono tabular-nums">
                        {tpl.ingredients.length} insumos · Base {tpl.defaultGuests} convidados ·{' '}
                        {tpl.defaultHours}h · Margem travada {tpl.defaultTargetMarginPct}%
                      </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-5 shrink-0">
                      <div className="text-left sm:text-right">
                        <p className="text-[11px] text-neutral-500">
                          Exemplo ({tpl.defaultGuests} pessoas)
                        </p>
                        <p className="text-sm font-bold font-mono tabular-nums text-neutral-900">
                          {formatBRL(fin.finalPrice)}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-emerald-700">
                          Lucro {formatBRL(fin.netProfit)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onStartWithTemplate(tpl.id)}
                        className="min-h-[42px] px-4 py-2 text-xs font-semibold text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        Cotar este menu
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 4: Objective Operational Comparison */}
        <section
          id="comparativo"
          className="border-t border-neutral-200 bg-white py-16 lg:py-20"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-emerald-800">Posicionamento direto</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                Mais preciso que o texto no WhatsApp. Mais leve e barato que um ERP de eventos.
              </h2>
            </div>

            <div className="mt-8 overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                    <th className="py-3.5 px-5">Critério semanal</th>
                    <th className="py-3.5 px-5">WhatsApp + compra &ldquo;no olho&rdquo;</th>
                    <th className="py-3.5 px-5">Sistemas grandes (ex.: MeEventos)</th>
                    <th className="py-3.5 px-5 text-emerald-900 bg-emerald-50/70">
                      FestaNaMargem V1
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-sm">
                  <tr>
                    <td className="py-3.5 px-5 font-medium text-neutral-900">Mensalidade</td>
                    <td className="py-3.5 px-5 text-neutral-600 font-mono tabular-nums">
                      R$ 0 (custa na margem)
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600 font-mono tabular-nums">
                      A partir de R$ 209,90/mês + extras
                    </td>
                    <td className="py-3.5 px-5 font-bold font-mono tabular-nums text-emerald-800 bg-emerald-50/40">
                      R$ 79–99/mês (plano único)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium text-neutral-900">
                      Início sem cadastro frio
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600">Copiar e colar texto antigo</td>
                    <td className="py-3.5 px-5 text-neutral-600">
                      Exige cadastrar catálogo e CRM inteiro
                    </td>
                    <td className="py-3.5 px-5 font-medium text-neutral-900 bg-emerald-50/40">
                      5 templates prontos no dia 1
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium text-neutral-900">
                      Trava de lucro líquido
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600">
                      Sem visibilidade de equipe e quebra
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600">
                      Disponível em módulos financeiros pesados
                    </td>
                    <td className="py-3.5 px-5 font-medium text-neutral-900 bg-emerald-50/40">
                      Automática + alerta abaixo do piso
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium text-neutral-900">
                      Trocas fora do padrão
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600">Rápido, mas sem recalcular custo</td>
                    <td className="py-3.5 px-5 text-neutral-600">
                      Cadastro rígido trava a cotação no celular
                    </td>
                    <td className="py-3.5 px-5 font-medium text-neutral-900 bg-emerald-50/40">
                      Botão + Item avulso / troca rápida
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium text-neutral-900">
                      Compras consolidadas do FDS
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600">
                      Sobra comida ou falta gelo no sábado
                    </td>
                    <td className="py-3.5 px-5 text-neutral-600">
                      Complexo para micro-buffet enxuto
                    </td>
                    <td className="py-3.5 px-5 font-medium text-neutral-900 bg-emerald-50/40">
                      1 toque por setor + margem de quebra
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 5: Simple Pricing + Validated Early Access Form */}
        <section id="preco" className="border-t border-neutral-200 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Plan Card */}
              <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    Para donos de micro-buffet e catering
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold text-neutral-900">
                    Plano Único — Direto ao Lucro
                  </h2>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold font-mono tabular-nums text-neutral-900">
                      R$ 89
                    </span>
                    <span className="text-sm text-neutral-500">/mês · faixa de validação R$ 79–99</span>
                  </div>
                  <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
                    Um único erro de compra ou desconto no escuro em 1 festa já supera várias
                    mensalidades.
                  </p>

                  <ul className="mt-6 space-y-2.5 text-sm text-neutral-700">
                    {[
                      'Orçamentos ilimitados em PDF (sem expor seus custos)',
                      '5 templates prontos editáveis + criação ilimitada',
                      'Troca rápida e itens avulsos direto na cotação',
                      'Lista de compras consolidada do fim de semana em 1 toque',
                      '100% enxuto: sem CRM burocrático, contratos jurídicos ou NF-e',
                    ].map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={onEnterApp}
                    className="w-full min-h-[48px] px-5 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                  >
                    Testar agora no navegador (sem cadastro)
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lead Capture / Early Access Form */}
              <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-500">
                    Acesso antecipado com preço fundador
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold text-neutral-900">
                    Quer receber o link de lançamento no WhatsApp?
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                    Deixe o nome do seu buffet e seu WhatsApp para garantir o valor de entrada
                    (R$ 79/mês) e priorizarmos seu tipo de cardápio nos templates.
                  </p>

                  {submitted ? (
                    <div
                      role="status"
                      className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2"
                    >
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        Interesse registrado com sucesso
                      </div>
                      <p className="text-sm text-emerald-900">
                        Salvamos o contato de <strong>{buffetName}</strong> ({whatsapp}). Enquanto
                        isso, você já pode usar a versão interativa completa agora mesmo.
                      </p>
                      <button
                        type="button"
                        onClick={onEnterApp}
                        className="mt-2 min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg inline-flex items-center gap-1.5"
                      >
                        Abrir o aplicativo agora
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleLeadSubmit} className="mt-6 space-y-4" noValidate>
                      <div>
                        <label
                          htmlFor="lead-buffet"
                          className="block text-xs font-medium text-neutral-700 mb-1"
                        >
                          Nome do seu buffet ou operação *
                        </label>
                        <input
                          id="lead-buffet"
                          type="text"
                          value={buffetName}
                          onChange={(e) => setBuffetName(e.target.value)}
                          placeholder="Ex.: Brasa & Sabor Eventos"
                          className="w-full min-h-[44px] px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="lead-whatsapp"
                          className="block text-xs font-medium text-neutral-700 mb-1"
                        >
                          WhatsApp com DDD *
                        </label>
                        <input
                          id="lead-whatsapp"
                          type="tel"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="(11) 99999-0000"
                          className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="lead-volume"
                          className="block text-xs font-medium text-neutral-700 mb-1"
                        >
                          Volume médio de festas por mês
                        </label>
                        <select
                          id="lead-volume"
                          value={eventsPerMonth}
                          onChange={(e) => setEventsPerMonth(e.target.value)}
                          className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        >
                          <option value="1 a 3 festas/mês">1 a 3 festas por mês</option>
                          <option value="4 a 8 festas/mês">4 a 8 festas por mês</option>
                          <option value="9 a 15 festas/mês">9 a 15 festas por mês</option>
                          <option value="Mais de 15 festas/mês">Mais de 15 festas por mês</option>
                        </select>
                      </div>

                      {formError && (
                        <p
                          role="alert"
                          className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                        >
                          {formError}
                        </p>
                      )}

                      <button
                        type="submit"
                        className="w-full min-h-[46px] px-5 py-2.5 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        Garantir condição de lançamento
                      </button>
                    </form>
                  )}
                </div>

                <p className="mt-5 text-xs text-neutral-500">
                  Sem spam. Usamos o WhatsApp apenas para enviar acesso e ouvir quais templates fazem
                  mais falta na sua cozinha.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold text-neutral-900">FestaNaMargem</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Orçamento com margem travada e compras consolidadas para micro-buffets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-neutral-600">
            <a href="#como-funciona" className="hover:text-neutral-900">
              Como funciona
            </a>
            <a href="#templates" className="hover:text-neutral-900">
              Templates
            </a>
            <a href="#preco" className="hover:text-neutral-900">
              Preço
            </a>
            <button
              type="button"
              onClick={onEnterApp}
              className="text-emerald-800 font-semibold hover:underline"
            >
              Abrir aplicativo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
