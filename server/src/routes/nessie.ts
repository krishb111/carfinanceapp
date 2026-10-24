import { Router } from "express";
import { createDemoCustomer } from "../services/demoCustomer.js";
import { getCashFlow } from "../services/cashflow.js";

export const nessieRouter = Router();

nessieRouter.post("/demo-customer", async (_req, res, next) => {
  try {
    res.status(201).json(await createDemoCustomer());
  } catch (err) {
    next(err);
  }
});

nessieRouter.get("/customers/:id/cashflow", async (req, res, next) => {
  try {
    res.json(await getCashFlow(req.params.id));
  } catch (err) {
    next(err);
  }
});
