// English is the source language: every line is written in English where it's used.
// Egyptian Arabic (Masri) lives in src/data/ar.ts as English -> Arabic, looked up at display time.
// Missing translations fall back to English and warn once in the console (playtests catch these).
import type * as Phaser from 'phaser';
import { AR } from '../data/ar/index';
import { FONT, FONT_AR } from '../config';

export type Lang = 'en' | 'ar';
const KEY = 'rls-lang';

let lang: Lang = (() => { try { return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch { return 'en'; } })();
const warned = new Set<string>();

export const getLang = () => lang;
export const isAr = () => lang === 'ar';
export function setLang(l: Lang) { lang = l; try { localStorage.setItem(KEY, l); } catch { /* private mode */ } }

/** translate a display string (identity in English) */
export function tr(s: string): string {
  if (lang === 'en' || !s || /[\u0600-\u06FF]/.test(s)) return s;  // already Arabic (e.g. from fmt)
  const t = AR[s];
  if (t !== undefined) return t;
  if (!warned.has(s)) { warned.add(s); console.warn(`[i18n] missing ar: ${JSON.stringify(s)}`); }
  return s;
}

/** base text style for the current language. Arabic needs a bigger, right-to-left font to stay legible at 480x270. */
export function txt(size: 8 | 16 = 8, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return lang === 'ar'
    // testString: Phaser sizes the text canvas from these glyphs; Latin-only would clip Arabic tails and hamzas
    ? { fontFamily: FONT_AR, fontSize: size === 8 ? '12px' : '22px', rtl: true, testString: '|MÉqgyأإجيـع', ...extra }
    : { fontFamily: FONT, fontSize: `${size}px`, ...extra };
}

/** a number in the current language's digits (Arabic uses ٠١٢٣٤٥٦٧٨٩) */
export const num = (n: number) => lang === 'ar' ? String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]) : String(n);

/** translate a template, then fill {placeholders} (numbers get the right digits): fmt('Have {n}.', { n: 3 }) */
export function fmt(template: string, vars: Record<string, number | string>): string {
  return tr(template).replace(/\{(\w+)\}/g, (_, k) => typeof vars[k] === 'number' ? num(vars[k] as number) : String(vars[k] ?? ''));
}
