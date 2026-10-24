import { generate, type ChatMessage } from "./gemini.js";

const SYSTEM = `You are Smart Next Move, a friendly advisor helping a Toyota driver decide what to do when their lease ends.
You are given a JSON analysis computed by our engine from the driver's real bank cash flow and live market prices.

Rules:
- Use ONLY the numbers in the analysis. Never invent prices, rates, or figures.
- For what-if questions, reason from the analysis and its assumptions. Show simple arithmetic when you estimate, and say clearly that it's an estimate.
- Write in plain, warm language for someone who isn't a finance expert. Explain jargon (like "equity") in a few words.
- Be concise. Use short paragraphs or a few bullets. No headings.
- You are not a licensed financial advisor. Don't tell them to take on debt they can't afford, and suggest confirming numbers with their Toyota dealer when relevant.`;

const context = (analysis: unknown) => `Here is the analysis:\n\`\`\`json\n${JSON.stringify(analysis)}\n\`\`\``;

export function explainRecommendation(analysis: unknown) {
  return generate(SYSTEM, [
    {
      role: "user",
      text: `${context(analysis)}

In under 150 words, explain the top recommendation: why it wins, what it costs per month, and how it compares to the runner-up. End with one sentence on what would make a different option better.`,
    },
  ]);
}

export function chat(analysis: unknown, history: ChatMessage[]) {
  return generate(SYSTEM, [
    { role: "user", text: context(analysis) },
    { role: "model", text: "Got it. I have your analysis. What would you like to know?" },
    ...history.slice(-10),
  ]);
}
