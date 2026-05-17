import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

type AiRequest = {
  mode: "explain" | "test";
  language: "python" | "javascript";
  code: string; // selected line or block
  fullCode?: string;
  testCases?: Record<string, string>;
};

const EXPLAIN_SYSTEM = `You are a friendly teaching assistant for beginner programmers.
A student has selected ONE line of code. Explain it in simple, beginner-friendly language.

Respond in this EXACT markdown format, omitting any section that does not apply:

**Brief explanation:** <one or two short sentences>

**Purpose of the code:** <what role it plays — logic / supporting / setup / output — and why it sits where it does>

**Better alternative:** <a cleaner or more effective alternative in the SAME language, with a tiny code snippet. If none, write "None — this is already idiomatic.">

Keep the whole response under 120 words. No long theory.`;

const TEST_SYSTEM = `You are a teaching assistant helping a student test a block of code.
Analyze the selected block and identify:
- All input variables the block reads (variables defined OUTSIDE the block but used inside, or values from input()/prompt())
- Important dependencies (functions/modules used)
- What the block is supposed to do

If the user has NOT yet supplied test cases, respond with:

**Analysis:** <1-2 sentence summary of what the block does>

**Inputs needed:**
- \`variableName\` (type) — what it represents

**Please provide test values** for each input so we can run the block.

If the user HAS supplied test cases (they will be shown to you), respond with:

**Analysis:** <what the block will do with those inputs>

**Expected output:** <what you expect to see>

**Notes:** <edge cases, possible errors, fixes>

Keep responses concise and beginner-friendly.`;

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let body: AiRequest;
        try {
          body = (await request.json()) as AiRequest;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const system = body.mode === "explain" ? EXPLAIN_SYSTEM : TEST_SYSTEM;

        let userPrompt = `Language: ${body.language}\n\n`;
        if (body.mode === "explain") {
          userPrompt += `Selected line:\n\`\`\`${body.language}\n${body.code}\n\`\`\``;
          if (body.fullCode && body.fullCode !== body.code) {
            userPrompt += `\n\nFull program for context:\n\`\`\`${body.language}\n${body.fullCode}\n\`\`\``;
          }
        } else {
          userPrompt += `Selected block:\n\`\`\`${body.language}\n${body.code}\n\`\`\``;
          if (body.fullCode && body.fullCode !== body.code) {
            userPrompt += `\n\nFull program for context:\n\`\`\`${body.language}\n${body.fullCode}\n\`\`\``;
          }
          if (body.testCases && Object.keys(body.testCases).length > 0) {
            userPrompt += `\n\nThe student supplied these test values:\n`;
            for (const [k, v] of Object.entries(body.testCases)) {
              userPrompt += `- ${k} = ${v}\n`;
            }
          }
        }

        try {
          const { text } = await generateText({
            model,
            system,
            prompt: userPrompt,
          });
          return Response.json({ text });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "AI request failed";
          const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
          return new Response(msg, { status });
        }
      },
    },
  },
});
