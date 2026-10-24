import { Router } from "express";
import { getCashFlow } from "../services/cashflow.js";
import { getQuotes } from "../services/prices.js";
import { recommend, type LeaseInput } from "../services/recommend.js";

export const recommendRouter = Router();

recommendRouter.post("/", async (req, res, next) => {
  try {
    const { customerId, city = "Dallas TX", zip = "75201", lease } = req.body as {
      customerId: string; city?: string; zip?: string; lease: LeaseInput;
    };
    if (!customerId || !lease?.model) return res.status(400).json({ error: "customerId and lease are required" });

    const [cashFlow, quotes] = await Promise.all([
      getCashFlow(customerId),
      getQuotes(lease.model, lease.year, city, zip),
    ]);
    const price = (kind: string) => quotes.find((q) => q.kind === kind)?.price;
    const used = price("used");
    const newPrice = price("new");
    if (!used || !newPrice) return res.status(502).json({ error: `Couldn't find live prices for the ${lease.year} ${lease.model}` });

    res.json({
      market: { used, tradeIn: price("trade_in") ?? Math.round(used * 0.88), newPrice },
      lease,
      cashFlow,
      ...recommend(lease, { used, tradeIn: price("trade_in") ?? Math.round(used * 0.88), newPrice }, cashFlow),
    });
  } catch (err) {
    next(err);
  }
});
