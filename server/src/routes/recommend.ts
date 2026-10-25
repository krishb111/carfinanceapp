import { Router } from "express";
import { getCashFlow } from "../services/cashflow.js";
import { getQuotes } from "../services/prices.js";
import { recommend, resolveAssumptions, DEFAULT_ASSUMPTIONS, type Assumptions, type LeaseInput } from "../services/recommend.js";
import { TOYOTA_MODELS, isToyotaModel } from "../shared/models.js";

export const recommendRouter = Router();

recommendRouter.get("/options", (_req, res) => {
  res.json({ models: TOYOTA_MODELS, assumptions: DEFAULT_ASSUMPTIONS });
});

recommendRouter.post("/", async (req, res, next) => {
  try {
    const { customerId, city = "Dallas TX", zip = "75201", lease, assumptions: overrides } = req.body as {
      customerId: string; city?: string; zip?: string; lease: LeaseInput; assumptions?: Partial<Assumptions>;
    };
    if (!customerId || !lease) return res.status(400).json({ error: "customerId and lease are required" });
    if (!isToyotaModel(lease.model)) return res.status(400).json({ error: `Pick a Toyota model from the list` });

    const assumptions = resolveAssumptions(overrides);
    const [cashFlow, quotes] = await Promise.all([
      getCashFlow(customerId),
      getQuotes(lease.model, lease.year, city, zip),
    ]);
    const price = (kind: string) => quotes.find((q) => q.kind === kind)?.price;
    const used = price("used");
    const newPrice = price("new");
    if (!used || !newPrice) return res.status(502).json({ error: `Couldn't find live prices for the ${lease.year} ${lease.model}` });

    const market = { used, tradeIn: Math.round(used * (assumptions.tradeInRatio / 100)), newPrice };
    res.json({ market, lease, cashFlow, ...recommend(lease, market, cashFlow, assumptions) });
  } catch (err) {
    next(err);
  }
});
