#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// check-i18n.js — i18n guardrail for Pancito y Más
//
// Plain Node, zero dependencies. Run with: node scripts/check-i18n.js
//
// (a) Verifies EN/ES key parity in i18n.js — every key in one language must
//     exist in the other. Also flags byte-identical EN/ES values as a
//     lower-priority "possibly untranslated" note (some are legitimate
//     loanwords/proper nouns, so these are notes, not errors).
// (b) Heuristically greps every shipped .html file for text that looks
//     user-facing but isn't wired through data-i18n. This is a heuristic,
//     not a parser — it WILL have false positives (icon ligature names,
//     stray punctuation) and false negatives (text split across nested
//     tags). Treat its output as a worklist to eyeball, not gospel.
//
// This script always exits 0. It reports; it does not block. Wire it into
// CI as an informational step (e.g. `node scripts/check-i18n.js` with its
// output posted as a job summary or PR comment) rather than a required check.
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const I18N_FILE = path.join(ROOT, 'i18n.js');

// Every HTML page in the app that loads i18n.js and should be kept in sync.
// (app.html and onboarding.html are the two big SPAs; the rest are the
// standalone content/equipment/troubleshooting pages.)
const HTML_FILES = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .map((f) => path.join(ROOT, f));

// ─────────────────────────────────────────────────────────────────────────
// Part A — EN/ES key parity
// ─────────────────────────────────────────────────────────────────────────

function loadTranslations() {
  const src = fs.readFileSync(I18N_FILE, 'utf8');
  const startMarker = 'var TRANSLATIONS = ';
  const endMarker = 'window.PymI18n = {';

  const startIdx = src.indexOf(startMarker);
  const endIdx = src.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      'check-i18n: could not locate the TRANSLATIONS object in i18n.js — ' +
      'the file structure changed and this script needs updating.'
    );
  }

  let objText = src.slice(startIdx + startMarker.length, endIdx).trim();
  objText = objText.replace(/;\s*$/, ''); // drop the trailing `;` after the object literal

  // The object literal is plain data (string keys/values) with no external
  // references, so eval-ing just this slice is safe and avoids needing a
  // JSON5 parser dependency for an object that isn't valid strict JSON
  // (unquoted-ish keys aside, it uses single-quoted string keys, trailing
  // commas, etc. — all valid JS object-literal syntax, not valid JSON).
  // eslint-disable-next-line no-eval
  const translations = eval('(' + objText + ')');

  if (!translations.en || !translations.es) {
    throw new Error('check-i18n: TRANSLATIONS object is missing an "en" or "es" block.');
  }
  return translations;
}

function checkKeyParity(translations) {
  const enKeys = new Set(Object.keys(translations.en));
  const esKeys = new Set(Object.keys(translations.es));

  const missingInEs = [...enKeys].filter((k) => !esKeys.has(k)).sort();
  const missingInEn = [...esKeys].filter((k) => !enKeys.has(k)).sort();

  const identicalValues = [...enKeys]
    .filter((k) => esKeys.has(k))
    .filter((k) => translations.en[k] === translations.es[k])
    .filter((k) => /[a-zA-Z]/.test(translations.en[k])) // ignore pure-numeral/emoji values
    .sort();

  return { enCount: enKeys.size, esCount: esKeys.size, missingInEs, missingInEn, identicalValues };
}

// ─────────────────────────────────────────────────────────────────────────
// Part B — heuristic hardcoded-string scan
// ─────────────────────────────────────────────────────────────────────────

// Known Material Symbols ligature names and other benign lowercase_snake_case
// tokens that are NOT translatable copy — used to reduce false positives.
const ICON_LIGATURE_RE = /^[a-z][a-z0-9_]*$/;

// Attributes whose *values* we spot-check for hardcoded copy (beyond the
// inter-tag text scan, which is the main signal).
const ATTR_PATTERNS = [
  { attr: 'placeholder', i18nAttr: 'data-i18n-placeholder' },
  { attr: 'title', i18nAttr: 'data-i18n-title' },
];

function scanFileForHardcodedStrings(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const findings = [];
  let inScriptOrStyle = false;

  lines.forEach((line, idx) => {
    if (/<script[\s>]/.test(line)) inScriptOrStyle = true;
    if (/<\/script>/.test(line)) inScriptOrStyle = false;
    if (/<style[\s>]/.test(line)) inScriptOrStyle = true;
    if (/<\/style>/.test(line)) inScriptOrStyle = false;
    if (inScriptOrStyle) return; // JS/CSS bodies are out of scope for this heuristic
    if (/data-i18n/.test(line)) return; // this element (or one on the same line) is already wired

    // Inter-tag text content: >Some Text<
    const textMatches = line.match(/>([^<>{}\n]{2,160})</g) || [];
    for (const raw of textMatches) {
      const t = raw.slice(1, -1).trim();
      if (!t) continue;
      if (!/[A-Za-zÀ-ÿ]/.test(t)) continue; // no letters — pure numbers/punctuation/emoji
      if (ICON_LIGATURE_RE.test(t)) continue; // looks like a Material Symbols ligature name
      if (/^\d/.test(t) && t.length < 6) continue; // short numeral-led fragments (dates, counts)
      findings.push({ line: idx + 1, kind: 'text', snippet: t.slice(0, 100) });
    }

    // Hardcoded attribute values (placeholder=/title=) with no matching data-i18n-* sibling attr
    for (const { attr, i18nAttr } of ATTR_PATTERNS) {
      const attrRe = new RegExp(attr + '="([^"]{2,100})"', 'g');
      let m;
      while ((m = attrRe.exec(line))) {
        if (line.includes(i18nAttr)) continue;
        if (!/[A-Za-zÀ-ÿ]/.test(m[1])) continue;
        findings.push({ line: idx + 1, kind: attr, snippet: m[1].slice(0, 100) });
      }
    }

    // Hardcoded alert()/confirm() string literals — the exact category that
    // slipped through in app.html's restore/delete-all-data flows before.
    const alertRe = /\b(alert|confirm)\(\s*['"`]([^'"`]{3,160})/g;
    let am;
    while ((am = alertRe.exec(line))) {
      findings.push({ line: idx + 1, kind: am[1] + '()', snippet: am[2].slice(0, 100) });
    }
  });

  return findings;
}

// ─────────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────────

function main() {
  console.log('── check-i18n ─────────────────────────────────────────────────');

  let translations;
  try {
    translations = loadTranslations();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 0; // report-only — never block a build on this script
    return;
  }

  const parity = checkKeyParity(translations);
  console.log(`\nKey parity: ${parity.enCount} EN keys, ${parity.esCount} ES keys.`);

  if (parity.missingInEs.length === 0 && parity.missingInEn.length === 0) {
    console.log('✓ Every EN key has a matching ES key and vice versa.');
  } else {
    if (parity.missingInEs.length) {
      console.log(`\n✗ ${parity.missingInEs.length} key(s) exist in EN but not ES:`);
      parity.missingInEs.forEach((k) => console.log('   - ' + k));
    }
    if (parity.missingInEn.length) {
      console.log(`\n✗ ${parity.missingInEn.length} key(s) exist in ES but not EN:`);
      parity.missingInEn.forEach((k) => console.log('   - ' + k));
    }
  }

  if (parity.identicalValues.length) {
    console.log(
      `\nℹ ${parity.identicalValues.length} key(s) have byte-identical EN/ES values ` +
      '(often fine — proper nouns, loanwords, emoji-only strings — but worth a glance):'
    );
    parity.identicalValues.forEach((k) => console.log('   - ' + k + ' = "' + translations.en[k] + '"'));
  }

  console.log('\n── Hardcoded-string sweep (heuristic — report only) ───────────');
  let totalFindings = 0;
  for (const file of HTML_FILES) {
    const findings = scanFileForHardcodedStrings(file);
    if (!findings.length) continue;
    totalFindings += findings.length;
    console.log(`\n${path.relative(ROOT, file)} (${findings.length} possible hit${findings.length === 1 ? '' : 's'}):`);
    findings.slice(0, 25).forEach((f) => {
      console.log(`   L${f.line} [${f.kind}] ${f.snippet}`);
    });
    if (findings.length > 25) {
      console.log(`   … and ${findings.length - 25} more in this file (truncated for readability)`);
    }
  }
  if (totalFindings === 0) {
    console.log('\n✓ No obvious hardcoded strings found by the heuristic sweep.');
  } else {
    console.log(
      `\nTotal possible hits: ${totalFindings}. This is a heuristic — expect some false ` +
      'positives (icon names, stray fragments) and don\'t assume it caught everything. ' +
      'Treat it as a worklist, not a verdict.'
    );
  }

  console.log('\n── Done ────────────────────────────────────────────────────────');
}

main();
