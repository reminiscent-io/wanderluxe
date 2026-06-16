import { EvalInfraError } from './errors';
import { withRetry } from './retry';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';

const SYSTEM = `You are a strict quality judge for an AI travel assistant called WanderLuxe.
You will receive a rubric and a transcript (user message, assistant response, and any
structured place cards). Score the response against the rubric on a 1-5 scale:
1 = unacceptable, 2 = poor, 3 = adequate with real flaws, 4 = good, 5 = excellent.
Judge only what the rubric asks. Be conservative: reserve 5 for genuinely flawless responses.
Respond with JSON only: {"score": <number>, "reasoning": "<2-3 sentences>"}.`;

export type JudgeVerdict = { score: number; reasoning: string };

// Gemini-as-judge: temperature 0, strict JSON via responseSchema, one retry
// on transport errors or malformed verdicts (then EvalInfraError → status "error").
export async function judge(rubric: string, transcript: string): Promise<JudgeVerdict> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new EvalInfraError('GEMINI_API_KEY missing — cannot run judge');

  return withRetry(async () => {
    const res = await fetch(`${GEMINI_BASE}/models/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [
          { role: 'user', parts: [{ text: `RUBRIC:\n${rubric}\n\nTRANSCRIPT:\n${transcript}` }] },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              score: { type: 'NUMBER' },
              reasoning: { type: 'STRING' },
            },
            required: ['score', 'reasoning'],
          },
        },
      }),
    });
    if (!res.ok) {
      throw new EvalInfraError(`judge HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new EvalInfraError(`judge returned malformed JSON: ${String(text).slice(0, 200)}`);
    }
    const verdict = parsed as JudgeVerdict;
    if (typeof verdict.score !== 'number' || verdict.score < 1 || verdict.score > 5) {
      throw new EvalInfraError(`judge returned out-of-range score: ${JSON.stringify(parsed).slice(0, 200)}`);
    }
    return { score: verdict.score, reasoning: String(verdict.reasoning ?? '') };
  }, 1, 2000);
}
