import type { BuffetProfile, CateringTemplate, Quote } from '../types/catering';
import {
  createInitialSeedQuotes,
  DEFAULT_BUFFET_PROFILE,
  DEFAULT_TEMPLATES,
} from '../data/seedData';

const STORAGE_KEYS = {
  quotes: 'festanamargem:v1:quotes',
  templates: 'festanamargem:v1:templates',
  profile: 'festanamargem:v1:profile',
  checkedShopping: 'festanamargem:v1:checkedShopping',
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues silently
  }
}

export function loadQuotes(): Quote[] {
  const existing = readJson<Quote[] | null>(STORAGE_KEYS.quotes, null);
  if (existing && Array.isArray(existing)) {
    return existing;
  }
  const seeded = createInitialSeedQuotes();
  writeJson(STORAGE_KEYS.quotes, seeded);
  return seeded;
}

export function saveQuotes(quotes: Quote[]): void {
  writeJson(STORAGE_KEYS.quotes, quotes);
}

export function loadTemplates(): CateringTemplate[] {
  const existing = readJson<CateringTemplate[] | null>(STORAGE_KEYS.templates, null);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }
  writeJson(STORAGE_KEYS.templates, DEFAULT_TEMPLATES);
  return DEFAULT_TEMPLATES;
}

export function saveTemplates(templates: CateringTemplate[]): void {
  writeJson(STORAGE_KEYS.templates, templates);
}

export function loadBuffetProfile(): BuffetProfile {
  const existing = readJson<BuffetProfile | null>(STORAGE_KEYS.profile, null);
  if (existing && typeof existing.businessName === 'string') {
    return { ...DEFAULT_BUFFET_PROFILE, ...existing };
  }
  writeJson(STORAGE_KEYS.profile, DEFAULT_BUFFET_PROFILE);
  return DEFAULT_BUFFET_PROFILE;
}

export function saveBuffetProfile(profile: BuffetProfile): void {
  writeJson(STORAGE_KEYS.profile, profile);
}

export function loadCheckedShoppingKeys(): string[] {
  return readJson<string[]>(STORAGE_KEYS.checkedShopping, []);
}

export function saveCheckedShoppingKeys(keys: string[]): void {
  writeJson(STORAGE_KEYS.checkedShopping, keys);
}
