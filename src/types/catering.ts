export type IngredientCategory =
  | 'acougue'
  | 'hortifruti'
  | 'padaria'
  | 'mercearia'
  | 'bebidas'
  | 'descartaveis';

export type IngredientUnit = 'kg' | 'un' | 'L' | 'pct' | 'cx' | 'fd' | 'sc';

export type ScalingMode = 'per_guest' | 'per_guest_hour' | 'fixed';

export interface TemplateIngredient {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: IngredientUnit;
  scalingMode: ScalingMode;
  /** Consumption quantity per guest, per guest-hour, or fixed total depending on scalingMode */
  baseQuantity: number;
  /** Cost per single unit (in BRL) */
  unitCost: number;
  /** Optional menu display label shown in client PDF proposal */
  clientLabel?: string;
  /** Whether to show on client-facing menu list (e.g., charcoal or napkins might be hidden from menu) */
  showInMenu: boolean;
}

export interface QuoteIngredient extends TemplateIngredient {
  enabled: boolean;
  isCustom?: boolean;
  swappedFrom?: string;
}

export interface SupportCostItem {
  id: string;
  name: string;
  /** Fixed value or multiplied by event hours */
  mode: 'fixed' | 'per_hour';
  amount: number;
  enabled: boolean;
}

export interface CateringTemplate {
  id: string;
  name: string;
  shortTag: string;
  description: string;
  defaultHours: number;
  defaultGuests: number;
  defaultTargetMarginPct: number;
  ingredients: TemplateIngredient[];
  supportCosts: SupportCostItem[];
}

export type QuoteStatus = 'rascunho' | 'enviado' | 'confirmado';

export interface Quote {
  id: string;
  code: string;
  clientName: string;
  clientPhone: string;
  eventTitle: string;
  eventDate: string; // YYYY-MM-DD
  eventTime: string; // HH:mm
  location: string;
  templateId: string;
  templateName: string;
  guests: number;
  hours: number;
  status: QuoteStatus;
  /** Desired locked profit margin percentage over final price (e.g. 35 means 35% net margin) */
  targetMarginPct: number;
  /** Optional manual final price override set by owner when negotiating */
  manualFinalPrice: number | null;
  ingredients: QuoteIngredient[];
  supportCosts: SupportCostItem[];
  notes: string;
  whatsappRawText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuffetProfile {
  businessName: string;
  ownerName: string;
  phone: string;
  city: string;
  defaultMarginPct: number;
  minMarginFloorPct: number;
  defaultSafetyBufferPct: number;
  paymentTerms: string;
  proposalValidityDays: number;
}

export interface QuoteFinancials {
  ingredientsCost: number;
  supportCost: number;
  totalCost: number;
  suggestedPrice: number;
  finalPrice: number;
  netProfit: number;
  effectiveMarginPct: number;
  pricePerGuest: number;
  costPerGuest: number;
  marginHealth: 'saudavel' | 'atencao' | 'critica';
}

export interface ShoppingBreakdownEntry {
  quoteId: string;
  eventTitle: string;
  clientName: string;
  eventDate: string;
  quantity: number;
}

export interface ConsolidatedShoppingItem {
  key: string;
  name: string;
  category: IngredientCategory;
  unit: IngredientUnit;
  rawQuantity: number;
  quantityWithBuffer: number;
  unitCost: number;
  estimatedCost: number;
  breakdown: ShoppingBreakdownEntry[];
}

export interface ParsedWhatsAppRequest {
  guests?: number;
  hours?: number;
  templateHint?: string;
  clientName?: string;
  eventDate?: string;
}
