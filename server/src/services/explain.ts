import { generate, generateParts, textOf, type ChatMessage, type Content, type FunctionDeclaration } from "./gemini.js";
import { recommend, type LeaseInput, type LifeEvent, type MarketPrices, type Recommendation } from "./recommend.js";
import type { CashFlow } from "./cashflow.js";

/** What the client sends back: the engine output plus the inputs it was computed from. */
export type Analysis = Recommendation & { lease: LeaseInput; market: MarketPrices; cashFlow: CashFlow };

export type Scenario = { changes: Record<string, unknown>; result: Recommendation };

const SYSTEM = `You are Smart Next Move, a friendly advisor helping a Toyota driver decide what to do when their lease ends.
You are given a JSON analysis computed by our engine from the driver's real bank cash flow and live market prices.

Rules:
- Use ONLY numbers from the analysis or from the rerun_analysis tool. Never do your own payment or cost math.
- For ANY "what if" question that changes a number (down payment, miles, payment, buyout, income, prices, life event), call rerun_analysis with just the changed values, then explain how the ranking and costs changed versus the original.
- If a what-if can't be expressed with the tool's fields, say so plainly and answer qualitatively without inventing figures.
- Write in plain, warm language for someone who isn't a finance expert. Explain jargon (like "equity") in a few words.
- Be concise. Use short paragraphs or a few bullets. No headings.
- You are not a licensed financial advisor. Don't tell them to take on debt they can't afford, and suggest confirming numbers with their Toyota dealer when relevant.`;

const LIFE_EVENTS: LifeEvent[] = ["none", "new_baby", "relocation", "income_drop", "remote_work", "longer_commute"];

const RERUN: FunctionDeclaration = {
  name: "rerun_analysis",
  description: "Re-runs the recommendation engine with changed inputs and returns the new ranked options. Only pass fields that change.",
  parameters: {
    type: "object",
    properties: {
      downPayment: { type: "number", description: "Cash put down on a buyout, purchase, or new lease, in dollars" },
      monthlyPayment: { type: "number", description: "Current lease monthly payment in dollars" },
      buyoutPrice: { type: "number", description: "Lease buyout price in dollars" },
      milesDriven: { type: "number", description: "Miles currently on the car" },
      mileageAllowance: { type: "number", description: "Total miles allowed on the current lease" },
      annualMiles: { type: "number", description: "Miles the driver expects to drive per year" },
      lifeEvent: { type: "string", enum: LIFE_EVENTS },
      monthlyIncomeChange: { type: "number", description: "Change in monthly income in dollars (negative for a drop)" },
      newCarPrice: { type: "number", description: "Price of a new replacement car in dollars" },
      tradeInValue: { type: "number", description: "Dealer trade-in value of the current car in dollars" },
    },
  },
};

const LEASE_FIELDS = ["downPayment", "monthlyPayment", "buyoutPrice", "milesDriven", "mileageAllowance", "annualMiles", "lifeEvent"] as const;

/** Applies the model's requested changes and re-runs the engine. */
export function rerun(analysis: Analysis, changes: Record<string, unknown>): Recommendation {
  const lease: LeaseInput = { ...analysis.lease };
  for (const key of LEASE_FIELDS) {
    if (changes[key] !== undefined) (lease as Record<string, unknown>)[key] = changes[key];
  }
  const market: MarketPrices = {
    ...analysis.market,
    newPrice: Number(changes.newCarPrice ?? analysis.market.newPrice),
    tradeIn: Number(changes.tradeInValue ?? analysis.market.tradeIn),
  };
  const incomeChange = Number(changes.monthlyIncomeChange ?? 0);
  const cashFlow: CashFlow = {
    ...analysis.cashFlow,
    monthlyIncome: analysis.cashFlow.monthlyIncome + incomeChange,
    freeCashFlow: analysis.cashFlow.freeCashFlow + incomeChange,
  };
  return recommend(lease, market, cashFlow, analysis.assumptions);
}

/** Keeps the context small: Gemini doesn't need the raw spending breakdown to explain options. */
const summarize = (r: Recommendation) => ({
  equity: r.equity,
  freeCashFlow: r.freeCashFlow,
  options: r.options.map(({ id, title, monthlyPayment, upfront, netCost, affordability, score }) => ({
    id, title, monthlyPayment, upfront, netCost, affordability, score,
  })),
});

const context = (analysis: unknown) => `Here is the analysis:\n\`\`\`json\n${JSON.stringify(analysis)}\n\`\`\``;

export function explainRecommendation(analysis: Analysis) {
  return generate(SYSTEM, [
    {
      role: "user",
      text: `${context(analysis)}

In under 150 words, explain the top recommendation: why it wins, what it costs per month, and how it compares to the runner-up. End with one sentence on what would make a different option better.`,
    },
  ]);
}

export async function chat(analysis: Analysis, history: ChatMessage[]): Promise<{ text: string; scenario?: Scenario }> {
  const contents: Content[] = [
    { role: "user", parts: [{ text: context(analysis) }] },
    { role: "model", parts: [{ text: "Got it. I have your analysis. What would you like to know?" }] },
    ...history.slice(-10).map((m): Content => ({ role: m.role, parts: [{ text: m.text }] })),
  ];

  let scenario: Scenario | undefined;
  // Allow a couple of tool round-trips, then require a text answer
  for (let round = 0; round < 3; round++) {
    const parts = await generateParts(SYSTEM, contents, round < 2 ? [RERUN] : undefined);
    const calls = parts.filter((p) => p.functionCall?.name === RERUN.name);
    if (!calls.length) return { text: textOf(parts), scenario };

    contents.push({ role: "model", parts });
    const responses = calls.map((call) => {
      const changes = call.functionCall!.args ?? {};
      const result = rerun(analysis, changes);
      scenario = { changes, result };
      return { functionResponse: { name: RERUN.name, response: { changes, result: summarize(result) } } };
    });
    contents.push({ role: "user", parts: responses });
  }
  throw new Error("Gemini didn't produce an answer");
}
