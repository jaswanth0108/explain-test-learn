export type RunResult = {
  stdout: string;
  stderr: string;
  ok: boolean;
};

export async function runJavaScript(
  code: string,
  inputs?: Record<string, string>,
): Promise<RunResult> {
  const logs: string[] = [];
  const errs: string[] = [];

  const fakeConsole = {
    log: (...args: unknown[]) => logs.push(args.map(fmt).join(" ")),
    error: (...args: unknown[]) => errs.push(args.map(fmt).join(" ")),
    warn: (...args: unknown[]) => logs.push("[warn] " + args.map(fmt).join(" ")),
    info: (...args: unknown[]) => logs.push(args.map(fmt).join(" ")),
  };

  // Inject inputs as variables prepended to code
  let prelude = "";
  if (inputs) {
    for (const [k, v] of Object.entries(inputs)) {
      // Try number, else string
      const num = Number(v);
      const val = v !== "" && !Number.isNaN(num) ? num : JSON.stringify(v);
      prelude += `var ${k} = ${val};\n`;
    }
  }

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("console", `"use strict";\n${prelude}${code}`);
    const result = await fn(fakeConsole);
    if (result !== undefined) logs.push(fmt(result));
    return { stdout: logs.join("\n"), stderr: errs.join("\n"), ok: true };
  } catch (e) {
    return {
      stdout: logs.join("\n"),
      stderr: (errs.length ? errs.join("\n") + "\n" : "") + (e instanceof Error ? `${e.name}: ${e.message}` : String(e)),
      ok: false,
    };
  }
}

function fmt(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2) ?? String(v);
  } catch {
    return String(v);
  }
}
