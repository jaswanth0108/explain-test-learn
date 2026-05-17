import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Play, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor, type Selection } from "@/components/ide/CodeEditor";
import { OutputConsole } from "@/components/ide/OutputConsole";
import { AssistantPanel } from "@/components/ide/AssistantPanel";
import { runJavaScript, type RunResult } from "@/lib/runners/runJs";
import { runPython } from "@/lib/runners/runPython";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CodeTutor — Learn by running Python & JavaScript with AI" },
      {
        name: "description",
        content:
          "An online compiler for students. Write Python or JavaScript, run it in your browser, and get instant AI explanations and test analysis line by line.",
      },
      { property: "og:title", content: "CodeTutor — Learn-by-doing online compiler" },
      {
        property: "og:description",
        content:
          "Run Python and JavaScript in the browser with a built-in AI tutor that explains code and helps you test it.",
      },
    ],
  }),
  component: IdePage,
});

type Language = "python" | "javascript";

const SAMPLES: Record<Language, string> = {
  python: `# Welcome to CodeTutor! Try selecting a line and clicking "Explain line".
def greet(name):
    return f"Hello, {name}!"

names = ["Ada", "Linus", "Grace"]
for n in names:
    print(greet(n))
`,
  javascript: `// Welcome to CodeTutor! Try selecting a line and clicking "Explain line".
function greet(name) {
  return \`Hello, \${name}!\`;
}

const names = ["Ada", "Linus", "Grace"];
for (const n of names) {
  console.log(greet(n));
}
`,
};

function IdePage() {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState<string>(SAMPLES.python);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);

  function switchLanguage(lang: Language) {
    setLanguage(lang);
    setCode(SAMPLES[lang]);
    setResult(null);
    setSelection(null);
  }

  const runCode = useCallback(
    async (codeToRun: string, inputs?: Record<string, string>) => {
      setRunning(true);
      try {
        const r =
          language === "javascript"
            ? await runJavaScript(codeToRun, inputs)
            : await runPython(codeToRun, inputs);
        return r;
      } finally {
        setRunning(false);
      }
    },
    [language],
  );

  async function handleRun() {
    const r = await runCode(code);
    setResult(r);
  }

  async function handleRunBlock(blockCode: string, inputs: Record<string, string>) {
    const r = await runCode(blockCode, inputs);
    setResult(r);
    return r;
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-amber-400" />
          <h1 className="text-base font-semibold">CodeTutor</h1>
          <span className="ml-2 text-xs text-zinc-500">
            Learn by running &amp; asking
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-zinc-700 bg-zinc-950 p-0.5 text-xs">
            {(["python", "javascript"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => switchLanguage(lang)}
                className={`rounded px-3 py-1 transition-colors ${
                  language === lang
                    ? "bg-amber-400 text-zinc-950 font-medium"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {lang === "python" ? "Python" : "JavaScript"}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={running}
            className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
          >
            <Play className="mr-1 h-3 w-3 fill-current" />
            Run
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_400px]">
        <div className="flex flex-col overflow-hidden border-r border-zinc-800">
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              language={language}
              value={code}
              onChange={setCode}
              onSelectionChange={setSelection}
            />
          </div>
          <div className="h-56 border-t border-zinc-800">
            <OutputConsole result={result} running={running} />
          </div>
        </div>
        <aside className="overflow-hidden">
          <AssistantPanel
            language={language}
            selection={selection}
            fullCode={code}
            onRunBlock={handleRunBlock}
          />
        </aside>
      </div>
    </div>
  );
}
