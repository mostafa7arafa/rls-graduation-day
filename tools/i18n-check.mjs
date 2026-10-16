// Checks src/data/ar.ts against the English strings in the code.
// Usage: node tools/i18n-check.mjs   -> lists display strings with no Arabic, and Arabic keys whose English is gone.
import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';

const FILES = ['src/data/story.ts', 'src/data/cast.ts', ...readdirSync('src/scenes').map(f => `src/scenes/${f}`)];
// strings that are code, not text shown to players
const IGNORE = /^(#[0-9a-f]{3,8}|[a-z][A-Za-z0-9_]*(-[a-z0-9]+)*|[A-Z]+(,[A-Z]+)+|keydown-\w+|\w+\.\w+|assets\/.*|\.\.?\/.*|[!?#.<3]+|\d+px|[▼▶◀♥Z ]+|LANGUAGE: ENGLISH|LANGUAGE|RLS)$/;  // last three: shown as-is on purpose

const used = new Set();
for (const file of FILES) {
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = (n) => {
    if (ts.isImportDeclaration(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const t = n.text;
      const isKey = ts.isPropertyAssignment(n.parent) && n.parent.name === n;
      if (!isKey && /[A-Za-z]/.test(t) && !IGNORE.test(t) && !/[؀-ۿ]/.test(t)) used.add(t);
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
}

const arSrc = ts.createSourceFile('ar.ts', readFileSync('src/data/ar.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const keys = new Set();
const grab = (n) => { if (ts.isPropertyAssignment(n) && ts.isStringLiteral(n.name)) keys.add(n.name.text); ts.forEachChild(n, grab); };
grab(arSrc);

const missing = [...used].filter(s => !keys.has(s));
const stale = [...keys].filter(k => !used.has(k));
if (missing.length) console.log(`MISSING Arabic (${missing.length}):\n` + missing.map(s => '  ' + JSON.stringify(s)).join('\n'));
if (stale.length) console.log(`STALE keys, English no longer in code (${stale.length}):\n` + stale.map(s => '  ' + JSON.stringify(s)).join('\n'));
if (!missing.length && !stale.length) console.log(`ar.ts complete: ${keys.size} strings`);
