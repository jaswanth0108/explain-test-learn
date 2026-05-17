import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Selection } from "./CodeEditor";
import type { RunResult } from "@/lib/runners/runJs";

type Language = "python" | "javascript";

type Message = {
  id: string;
  kind: "explain" | "test" | "run";
  title: string;
  body: string;
  pendingInputs?: string[]; // variable names awaiting test values
  codeSnippet?: string; // The specific code block being tested
};

type Props = {
  language: Language;
  selection: Selection | null;
  fullCode: string;
  onRunBlock: (code: string, inputs: Record<string, string>) => Promise<RunResult>;
};

export function AssistantPanel({ language, selection, fullCode, onRunBlock }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [testCases, setTestCases] = useState<Record<string, Record<string, string>>>({});

  async function callAi(payload: {
    mode: "explain" | "test";
    code: string;
    testCases?: Record<string, string>;
  }): Promise<string> {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: payload.mode,
        language,
        code: payload.code,
        fullCode,
        testCases: payload.testCases,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
      throw new Error(t || "AI request failed");
    }
    const data = (await res.json()) as { text: string };
    return data.text;
  }

  async function handleExplain() {
    if (!selection) return;
    setLoading(true);
    try {
      const text = await callAi({ mode: "explain", code: selection.text });
      pushMessage({
        kind: "explain",
        title: `Explain line ${selection.startLine}`,
        body: text,
      });
    } catch (e) {
      pushMessage({ kind: "explain", title: "Error", body: errMsg(e) });
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    if (!selection) return;
    setLoading(true);
    try {
      const text = await callAi({ mode: "test", code: selection.text });
      const inputs = extractInputVars(text);
      const id = pushMessage({
        kind: "test",
        title: `Test block (lines ${selection.startLine}–${selection.endLine})`,
        body: text,
        pendingInputs: inputs,
        codeSnippet: selection.text,
      });
      if (inputs.length > 0) {
        setTestCases((tc) => ({
          ...tc,
          [id]: Object.fromEntries(inputs.map((v) => [v, ""])),
        }));
      }
    } catch (e) {
      pushMessage({ kind: "test", title: "Error", body: errMsg(e) });
    } finally {
      setLoading(false);
    }
  }

  async function handleRunWithInputs(msg: Message) {
    const inputs = testCases[msg.id] ?? {};
    const codeToRun = msg.codeSnippet ?? "";
    setLoading(true);
    try {
      const analysis = await callAi({
        mode: "test",
        code: codeToRun,
        testCases: inputs,
      });
      pushMessage({
        kind: "test",
        title: "AI analysis with your test values",
        body: analysis,
      });
      const result = await onRunBlock(codeToRun, inputs);
      const body =
        (result.stdout ? `**Output:**\n\`\`\`\n${result.stdout}\n\`\`\`\n\n` : "") +
        (result.stderr ? `**Error:**\n\`\`\`\n${result.stderr}\n\`\`\`` : "") ||
        "_(no output)_";
      pushMessage({
        kind: "run",
        title: result.ok ? "✓ Block ran successfully" : "✗ Block errored",
        body,
      });
    } catch (e) {
      pushMessage({ kind: "run", title: "Error", body: errMsg(e) });
    } finally {
      setLoading(false);
    }
  }

  function pushMessage(m: Omit<Message, "id">): string {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { ...m, id }]);
    return id;
  }

  const canAct = selection && !loading;

  return (
    <div className="flex h-full flex-col bg-zinc-900 text-zinc-100">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-amber-400" />
          AI Tutor
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Select code in the editor, then click an action.
        </p>
      </div>

      <div className="flex gap-2 border-b border-zinc-800 px-4 py-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={!canAct || !selection?.isSingleLine}
          onClick={handleExplain}
          title={!selection?.isSingleLine ? "Select exactly one line" : "Explain this line"}
        >
          Explain line
        </Button>
        <Button
          size="sm"
          disabled={!canAct}
          onClick={handleTest}
        >
          Test block
        </Button>
        {loading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-amber-400" />}
      </div>

      <div className="flex-1 space-y-3 overflow-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-md border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
            <p className="font-medium text-zinc-300">How to use</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              <li>Select a single line and click <strong>Explain line</strong></li>
              <li>Select a block of code and click <strong>Test block</strong></li>
              <li>Fill in any test values the AI requests, then run</li>
            </ul>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3"
          >
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-400">
              <span>{m.title}</span>
              <button
                onClick={() =>
                  setMessages((p) => p.filter((x) => x.id !== m.id))
                }
                className="text-zinc-500 hover:text-zinc-200"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-sm">
              <ReactMarkdown>{m.body}</ReactMarkdown>
            </div>

            {m.pendingInputs && m.pendingInputs.length > 0 && testCases[m.id] && (
              <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
                <p className="text-xs font-medium text-zinc-300">Test values</p>
                {m.pendingInputs.map((name) => (
                  <div key={name} className="flex items-center gap-2">
                    <label className="w-24 truncate font-mono text-xs text-zinc-400">
                      {name}
                    </label>
                    <Input
                      value={testCases[m.id][name] ?? ""}
                      onChange={(e) =>
                        setTestCases((tc) => ({
                          ...tc,
                          [m.id]: { ...tc[m.id], [name]: e.target.value },
                        }))
                      }
                      className="h-8 bg-zinc-900 text-sm"
                      placeholder="value"
                    />
                  </div>
                ))}
                <Button
                  size="sm"
                  onClick={() => handleRunWithInputs(m)}
                  disabled={loading}
                  className="mt-2"
                >
                  <Play className="mr-1 h-3 w-3" />
                  Run with these values
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

function extractInputVars(md: string): string[] {
  const names = new Set<string>();
  const re = /^\s*[-*]\s+`?([A-Za-z_][A-Za-z0-9_]*)`?/gm;
  let m: RegExpExecArray | null;
  const idx = md.toLowerCase().indexOf("inputs needed");
  const slice = idx >= 0 ? md.slice(idx) : md;
  while ((m = re.exec(slice)) !== null) {
    names.add(m[1]);
  }
  return Array.from(names).slice(0, 8);
}
