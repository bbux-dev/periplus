/* Quick-Capture DSL parser — test harness. Run: node test.js */
const { parseDSL } = require('./parser.js')

// Each case: input, opts, and the EXPECTED outcome we assert against.
const cases = [
  // ── Happy path: all 7 types ────────────────────────────────────────────────
  { id: 'expense-full', input: 'expense 12.50:food?merchant=Blue Bottle',
    expect: { status: 'ok', type: 'expense', values: { amount: '12.50', category: 'food', merchant: 'Blue Bottle' } } },
  { id: 'expense-alias', input: 'exp 12.50:food',
    expect: { status: 'ok', type: 'expense', values: { amount: '12.50', category: 'food' } } },
  { id: 'book-quoted-colon', input: 'book "Dune: A Novel":Herbert?rating=5',
    expect: { status: 'ok', type: 'book', values: { title: 'Dune: A Novel', creator: 'Herbert', rating: '5' } } },
  { id: 'movie-slot2-omitted', input: 'movie "Blade Runner 2049"?rating=5',
    expect: { status: 'ok', type: 'movie', values: { title: 'Blade Runner 2049', rating: '5' } } },
  { id: 'place-two-quoted', input: 'place "Blue Bottle":"315 Linden St"',
    expect: { status: 'ok', type: 'place', values: { name: 'Blue Bottle', address: '315 Linden St' } } },
  { id: 'show-named-rating', input: 'show Severance:Apple TV?rating=5',
    expect: { status: 'ok', type: 'show', values: { title: 'Severance', creator: 'Apple TV', rating: '5' } } },
  { id: 'podcast-quoted', input: 'podcast "Hardcore History":"Dan Carlin"',
    expect: { status: 'ok', type: 'podcast', values: { title: 'Hardcore History', creator: 'Dan Carlin' } } },
  { id: 'event-date-alias', input: 'event Standup:Office?date=2026-06-16',
    expect: { status: 'ok', type: 'event', values: { title: 'Standup', location: 'Office', occurredAt: '2026-06-16' } } },

  // ── Type inference from domain context ─────────────────────────────────────
  { id: 'infer-expense', input: '12.50:coffee', opts: { defaultType: 'expense' },
    expect: { status: 'ok', type: 'expense', values: { amount: '12.50', category: 'coffee' } } },
  { id: 'unquoted-spaces-title', input: 'book Blade Runner 2049:Tolkien',
    expect: { status: 'ok', type: 'book', values: { title: 'Blade Runner 2049', creator: 'Tolkien' } } },

  // ── Risk #1: leading type-word hijack + the quoting escape hatch ────────────
  { id: 'quote-escapes-typeword', input: 'book "Show Dogs":Author',  // "Show" would be a type if unquoted
    expect: { status: 'ok', type: 'book', values: { title: 'Show Dogs', creator: 'Author' } } },
  { id: 'leading-typeword-warns', input: 'show dogs:5', opts: { defaultType: 'expense' },
    expect: { status: 'ok', type: 'show', values: { title: 'dogs', creator: '5' }, warns: true } },

  // ── Risk #2: single-letter / partial type collisions (parser refuses) ───────
  { id: 'ambiguous-p', input: 'p coffee:5',
    expect: { status: 'ambiguous' } },
  { id: 'ambiguous-e', input: 'e lunch:food', opts: { defaultType: 'expense' },
    expect: { status: 'ambiguous' } },
  { id: 'no-type-no-context', input: '12.50:food',
    expect: { status: 'ambiguous' } },

  // ── Risk #3: quote / escape handling ───────────────────────────────────────
  { id: 'unterminated-quote', input: 'book "Dune:Herbert',
    expect: { status: 'error' } },
  { id: 'escaped-quote-inside', input: 'book "The \\"Real\\" Dune":Herbert',
    expect: { status: 'ok', type: 'book', values: { title: 'The "Real" Dune', creator: 'Herbert' } } },

  // ── Risk #4: partial / malformed input ─────────────────────────────────────
  { id: 'param-missing-eq', input: 'expense 12:food?merchant',
    expect: { status: 'error' } },
  { id: 'empty-param-name', input: 'expense 12:food?=blue',
    expect: { status: 'error' } },
  { id: 'empty-positional-slot', input: 'expense :food', opts: { defaultType: 'expense' },
    expect: { status: 'ok', type: 'expense', values: { category: 'food' }, warns: true } },
  { id: 'unknown-field', input: 'expense 12:food?colour=blue',
    expect: { status: 'error' } },
  { id: 'trailing-question', input: 'movie Dune?',
    expect: { status: 'ok', type: 'movie', values: { title: 'Dune' }, warns: true } },

  // ── The multi-value-param trap (tags vs comma separator) ───────────────────
  { id: 'tags-unquoted-breaks', input: 'expense 12:food?tags=a,b,c',  // commas split params → b,c lack '='
    expect: { status: 'error' } },
  { id: 'tags-quoted-works', input: 'expense 12:food?tags="a, b, c"',
    expect: { status: 'ok', type: 'expense', values: { amount: '12', category: 'food', tags: 'a, b, c' } } },
]

function valuesMatch(got, want) {
  if (!want) return true
  const gk = Object.keys(got), wk = Object.keys(want)
  if (gk.length !== wk.length) return false
  return wk.every(k => got[k] === want[k])
}

let pass = 0, fail = 0
const rows = []
for (const c of cases) {
  const r = parseDSL(c.input, c.opts || {})
  let ok = r.status === c.expect.status
  if (ok && c.expect.type) ok = r.type === c.expect.type
  if (ok && c.expect.values) ok = valuesMatch(r.values, c.expect.values)
  if (ok && c.expect.warns) ok = r.warnings.length > 0
  ok ? pass++ : fail++
  const note = r.issues.concat(r.warnings.map(w => '⚠ ' + w)).join(' | ')
  rows.push({ ok, id: c.id, status: r.status, type: r.type || '—',
              values: JSON.stringify(r.values), note })
}

const pad = (s, n) => String(s).padEnd(n)
console.log('\n' + pad('✓/✗', 4) + pad('case', 24) + pad('status', 11) + pad('type', 9) + 'values / notes')
console.log('─'.repeat(110))
for (const r of rows) {
  console.log(
    pad(r.ok ? ' ✓' : ' ✗', 4) + pad(r.id, 24) + pad(r.status, 11) + pad(r.type, 9) + r.values +
    (r.note ? '\n' + ' '.repeat(48) + r.note : ''))
}
console.log('─'.repeat(110))
console.log(`\n${pass}/${cases.length} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
