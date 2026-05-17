import type { RunResult } from "@/lib/runners/runJs";
import { Loader2 } from "lucide-react";

type Props = {
  result: RunResult | null;
  running: boolean;
};

export function OutputConsole({ result, running }: Props) {
  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 text-xs uppercase tracking-wider text-zinc-400">
        <span>Output</span>
        {running && (
          <span className="flex items-center gap-1.5 text-amber-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running…
          </span>
        )}
        {result && !running && (
          <span className={result.ok ? "text-emerald-400" : "text-red-400"}>
            {result.ok ? "✓ Success" : "✗ Error"}
          </span>
        )}
      </div>
      <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-sm leading-relaxed">
        {result?.stdout && <span className="text-zinc-100">{result.stdout}</span>}
        {result?.stdout && result?.stderr && <span>{"\n"}</span>}
        {result?.stderr && <span className="text-red-400">{result.stderr}</span>}
        {!result && !running && (
          <span className="text-zinc-500">Click Run to execute your code.</span>
        )}
      </pre>
    </div>
  );
}
