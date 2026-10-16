// Checks src/data/ar/*.ts against the English strings in the code.
// Usage: node tools/i18n-check.mjs   -> lists display strings with no Arabic, and Arabic keys whose English is gone.
import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';

// every .ts under src/data/story and src/scenes (recursively), plus the cast
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.ts') ? [`${d}/${e.name}`] : []);
const FILES = [...walk('src/data/story'), 'src/data/cast.ts', ...walk('src/scenes'), 'src/match/teams.ts', 'src/match/cup.ts', 'src/match/sim.ts', 'src/match/banter.ts'];
// strings that are code, not text shown to players
const IGNORE = /^(#[0-9a-f]{3,8}|[a-z][A-Za-z0-9_]*(-[a-z0-9]+)*|[A-Z]+(,[A-Z]+)+|keydown-\w+|\w+\.\w+|assets\/.*|\.\.?\/.*|[!?#.<3]+|\d+px|[▼▶◀♥Z ]+|LANGUAGE: ENGLISH|LANGUAGE|SOUND|RLS|[RBYW]{1,3})$/;  // shown as-is on purpose: the bilingual menu label, the logo, lab paint codes

const used = new Set();
for (const file of FILES) {
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = (n) => {
    if (ts.isImportDeclaration(n)) return;
    if ((ts.isVariableDeclaration(n) || ts.isPropertyDeclaration(n)) && n.name.getText().startsWith('NO_TR')) return; // deliberately untranslated (e.g. English spelling words)
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const t = n.text;
      const isKey = ts.isPropertyAssignment(n.parent) && n.parent.name === n;
      if (!isKey && /[A-Za-z]/.test(t) && !IGNORE.test(t) && !/[؀-ۿ]/.test(t)) used.add(t);
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
}

const keys = new Set();
const grab = (n) => { if (ts.isPropertyAssignment(n) && ts.isStringLiteral(n.name)) keys.add(n.name.text); ts.forEachChild(n, grab); };
for (const f of walk('src/data/ar')) grab(ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true));

const missing = [...used].filter(s => !keys.has(s));
const stale = [...keys].filter(k => !used.has(k));
if (missing.length) console.log(`MISSING Arabic (${missing.length}):\n` + missing.map(s => '  ' + JSON.stringify(s)).join('\n'));
if (stale.length) console.log(`STALE keys, English no longer in code (${stale.length}):\n` + stale.map(s => '  ' + JSON.stringify(s)).join('\n'));
if (!missing.length && !stale.length) console.log(`Arabic complete: ${keys.size} strings`);
