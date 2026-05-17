## Goal

A learning-focused online compiler where students can write Python or JavaScript, run it, and use a built-in AI assistant to:
1. **Explain** a selected line (purpose, role, beginner-friendly, suggest a cleaner alternative).
2. **Test** a selected block (identify variables/inputs, prompt for test cases, run, show output/errors with fixes).
3. Always respond in a learning-focused tone with a strict output format.

## Pages & layout

Single-page IDE at `/` (no auth, no history persistence).

```
┌─────────────────────────────────────────────────┐
│ Header: logo + language switcher + Run button   │
├──────────────────────────┬──────────────────────┤
│                          │  AI Assistant Panel  │
│   Monaco Code Editor     │  - Explain selection │
│   (selection tracked)    │  - Test selection    │
│                          │  - chat-style output │
│                          │  (uses message.parts)│
├──────────────────────────┴──────────────────────┤
│ Output console (stdout / stderr / exit code)    │
└─────────────────────────────────────────────────┘
```

## Features

**Editor**
- `@monaco-editor/react`, language switch between `python` and `javascript`.
- Track `selectedText` + `selectionRange` + whether selection is one line or multi-line.
- Floating action bar above selection: **Explain line** (single line) / **Test block** (multi-line or single).

**Code execution**
- JavaScript: run in a sandboxed `iframe` (or `Function` with captured `console.log`) on the client — no backend needed.
- Python: run via [Pyodide](https://pyodide.org/) loaded on demand in a Web Worker, with `input()` redirected to prompt-supplied test-case values. This keeps the MVP serverless (no Judge0 needed) and works offline-ish.
- Output console shows stdout, stderr, and a green/red status row.

**AI assistant**
- TanStack server route `src/routes/api/ai.ts` using AI SDK + Lovable AI Gateway (`google/gemini-3-flash-preview`).
- Two tools/modes driven by a `mode` field in the request body:
  - `explain` — input: `{ language, line, fullCode }`. System prompt enforces the output format: brief explanation, purpose, better alternative.
  - `test` — input: `{ language, block, fullCode, testCases? }`. First call returns the list of detected variables/inputs and asks for test cases; second call (with `testCases`) returns analysis + the values to inject when running.
- Streamed via `toUIMessageStreamResponse`; rendered with `react-markdown`.
- The actual code execution stays on the client; the AI returns the test inputs / explanation, then the client runs the block with those inputs and pipes results back into the panel.

**Output contract enforced via system prompt**
```
Brief explanation:
Purpose of the code:
Better alternative (if any):
Test case request / analysis:
Output / error result:
```
(Sections omitted gracefully when not applicable, e.g. plain explanation has no test section.)

## Files to add/change

- `src/routes/index.tsx` — IDE layout (replace placeholder).
- `src/components/ide/CodeEditor.tsx` — Monaco wrapper + selection tracking + action bar.
- `src/components/ide/OutputConsole.tsx` — stdout/stderr display.
- `src/components/ide/AssistantPanel.tsx` — chat UI (uses AI Elements: conversation, message, prompt-input).
- `src/components/ide/LanguageSwitcher.tsx` — Python / JavaScript toggle.
- `src/lib/runners/runJs.ts` — sandboxed JS execution.
- `src/lib/runners/runPython.ts` — Pyodide worker wrapper.
- `src/lib/ai-gateway.ts` — Lovable AI gateway provider helper.
- `src/routes/api/ai.ts` — server route with `explain` + `test` modes.
- `src/styles.css` — refined dark IDE theme tokens (editor-friendly palette).

## Dependencies to install

`@monaco-editor/react monaco-editor ai @ai-sdk/react @ai-sdk/openai-compatible zod react-markdown` plus AI Elements components (`conversation message prompt-input shimmer`). Pyodide loaded via CDN script in the worker.

## Out of scope (for MVP, can add later)

- Accounts / saved snippets (user chose anonymous).
- C / C++ / Java (would need Judge0 or similar server-side compiler).
- Multi-file projects, package install, file upload.

## Open question

OK to use **Pyodide in-browser** for Python? It's free, no API keys, but adds ~6 MB on first run. If you'd rather use a server-side compiler (Judge0 via RapidAPI), say the word and I'll swap that in — it requires you to provide a RapidAPI key.