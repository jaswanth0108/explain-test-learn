import type { RunResult } from "./runJs";

type PyodideAPI = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  globals: { set: (k: string, v: unknown) => void };
};

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideAPI>;
  }
}

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise: Promise<PyodideAPI> | null = null;

async function loadPyodideOnce(): Promise<PyodideAPI> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${PYODIDE_INDEX}pyodide.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide"));
        document.head.appendChild(script);
      });
    }
    if (!window.loadPyodide) throw new Error("Pyodide loader missing");
    return window.loadPyodide({ indexURL: PYODIDE_INDEX });
  })();
  return pyodidePromise;
}

export async function runPython(
  code: string,
  inputs?: Record<string, string>,
): Promise<RunResult> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  try {
    const py = await loadPyodideOnce();
    py.setStdout({ batched: (s: string) => stdout.push(s) });
    py.setStderr({ batched: (s: string) => stderr.push(s) });

    let prelude = "";
    if (inputs) {
      for (const [k, v] of Object.entries(inputs)) {
        const num = Number(v);
        const val = v !== "" && !Number.isNaN(num) ? String(num) : JSON.stringify(v);
        prelude += `${k} = ${val}\n`;
      }
      // Also redirect input() to consume from a queue
      const queue = Object.values(inputs).map((v) => JSON.stringify(v)).join(", ");
      prelude += `__inputs = [${queue}]\n__inputs_iter = iter(__inputs)\n`;
      prelude += `def input(prompt=""):\n    try:\n        return next(__inputs_iter)\n    except StopIteration:\n        return ""\n`;
    }

    await py.runPythonAsync(prelude + code);
    return { stdout: stdout.join("\n"), stderr: stderr.join("\n"), ok: stderr.length === 0 };
  } catch (e) {
    return {
      stdout: stdout.join("\n"),
      stderr: (stderr.length ? stderr.join("\n") + "\n" : "") + (e instanceof Error ? e.message : String(e)),
      ok: false,
    };
  }
}
