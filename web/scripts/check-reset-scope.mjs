#!/usr/bin/env node
/**
 * Guardrail against the bug class that started CSS-TASKLIST.md: an unlayered
 * descendant-universal reset — `.foo *, .foo *::before, .foo *::after { margin: 0; padding: 0; }`
 * — sitting at specificity (0,1,0) with no @layer, which beats every single-class
 * page rule and every Tailwind utility (those live in @layer utilities/base).
 * That's invisible: no lint error, no console warning, just "spacing looks a bit
 * off" until someone traces the cascade by hand.
 *
 * This scans every .css file under src/ with a real CSS parser (not regex) for
 * any rule whose selector list contains a descendant-universal combinator
 * (`X *`, `X *::before`, `X *::after`) where the declaration block sets
 * margin/padding to anything, and which is not nested inside an `@layer`.
 * Exits non-zero and prints file:line for each hit.
 */
import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

const SRC = path.join(process.cwd(), 'src');
const MARGIN_PADDING = /^(margin|padding)(-(top|right|bottom|left|inline|block))?(-(start|end))?$/;
// Only the destructive zeroing pattern is the bug — e.g. "margin: 0" or
// "padding: 0 0". A wildcard selector setting margin to `auto` (centering) or
// any other non-zero value is a different, ordinary, non-destructive pattern
// and must not be flagged.
const ALL_ZERO_VALUE = /^(0[a-z%]*\s*)+$/i;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.css')) out.push(p);
  }
  return out;
}

function isDescendantUniversal(selector) {
  // Matches a single compound selector ending in a bare `*` (optionally
  // followed by ::before/::after), preceded by a combinator or whitespace —
  // i.e. "X *" or "X *::before", not a bare "*" or "*.foo" on its own.
  return /\S[\s>+~]+\*(::before|::after)?\s*$/.test(selector.trim());
}

function isInsideLayer(rule) {
  let node = rule.parent;
  while (node) {
    if (node.type === 'atrule' && node.name === 'layer') return true;
    node = node.parent;
  }
  return false;
}

const files = walk(SRC);
const violations = [];

for (const file of files) {
  const css = fs.readFileSync(file, 'utf8');
  let root;
  try {
    root = postcss.parse(css, { from: file });
  } catch (e) {
    console.error(`[check-reset-scope] Failed to parse ${file}: ${e.message}`);
    continue;
  }

  root.walkRules(rule => {
    const selectors = rule.selectors || rule.selector.split(',').map(s => s.trim());
    const hasDescendantUniversal = selectors.some(isDescendantUniversal);
    if (!hasDescendantUniversal) return;
    if (isInsideLayer(rule)) return;

    const badDecls = rule.nodes
      .filter(n => n.type === 'decl' && MARGIN_PADDING.test(n.prop) && ALL_ZERO_VALUE.test(n.value.trim()))
      .map(n => n.prop);

    if (badDecls.length > 0) {
      violations.push({
        file: path.relative(process.cwd(), file),
        line: rule.source.start.line,
        selector: rule.selector,
        props: badDecls,
      });
    }
  });
}

if (violations.length > 0) {
  console.error('\n✗ Found unlayered descendant-universal resets that zero margin/padding:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.selector} { ${v.props.join(', ')}: ... }`);
  }
  console.error(
    '\nThese sit at specificity (0,1,0) with no @layer, so they silently beat every\n' +
    'single-class page rule and every Tailwind utility. Either remove the\n' +
    'margin/padding (keep box-sizing if that\'s needed — Tailwind Preflight already\n' +
    'zeroes margin/padding in @layer base, where page CSS can override it), or wrap\n' +
    'the rule in @layer if the zeroing is genuinely intentional.\n'
  );
  process.exit(1);
} else {
  console.log('[check-reset-scope] OK — no unlayered descendant-universal resets found.');
}
