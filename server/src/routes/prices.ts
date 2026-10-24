import { Router } from "express";
import { getQuotes, getDealers, getPriceHistory, type PriceKind } from "../services/prices.js";

export const pricesRouter = Router();

pricesRouter.get("/:model", async (req, res, next) => {
  try {
    const year = Number(req.query.year ?? 2023);
    const city = String(req.query.city ?? "Dallas TX");
    const zip = String(req.query.zip ?? "75201");
    res.json({ model: req.params.model, year, quotes: await getQuotes(req.params.model, year, city, zip) });
  } catch (err) {
    next(err);
  }
});

pricesRouter.get("/:model/dealers", async (req, res, next) => {
  try {
    res.json(await getDealers(req.params.model, String(req.query.city ?? "Dallas TX")));
  } catch (err) {
    next(err);
  }
});

pricesRouter.get("/:model/history", async (req, res, next) => {
  try {
    res.json(await getPriceHistory(req.params.model, String(req.query.kind ?? "used") as PriceKind));
  } catch (err) {
    next(err);
  }
});
