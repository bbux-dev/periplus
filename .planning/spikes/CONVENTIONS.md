# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these
unless the question requires otherwise.

## Stack

- **Language:** plain JavaScript (the app is Vite + React + TS, but spikes stay
  build-free for fastest runnable results).
- **Logic tests:** Node's built-in runtime, a hand-rolled assertion table printed to
  stdout (`node test.js`). No test framework.
- **Interactive demos:** a single static `index.html` opened via `file://` — no server,
  no bundler. Shared logic loaded with `<script src="...js">`.

## Structure

- One dir per spike: `.planning/spikes/NNN-name/`.
- `parser.js`-style logic modules use a UMD-ish tail
  (`if (typeof module !== 'undefined') module.exports = ...`) so the SAME file runs in
  Node (`require`) and the browser (global via `<script src>`). No code duplication.
- Because the repo root `package.json` is `"type": "module"`, drop a local
  `package.json` (`{ "type": "commonjs" }`) in the spike dir so `.js` runs as CommonJS
  under Node.

## Patterns

- **Mirror, don't import, app config.** Spikes hardcode the relevant slice of app config
  (type lists, field keys) rather than importing TS source — keeps them build-free and
  isolated. Note the source of truth in a comment.
- **Pure-logic spikes skip the research step** but still build an interactive playground
  so the result can be *felt*, not just asserted.
