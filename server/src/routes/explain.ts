import { Router } from "express";
import { explainRecommendation, chat } from "../services/explain.js";
import type { ChatMessage } from "../services/gemini.js";

export const explainRouter = Router();

explainRouter.post("/", async (req, res, next) => {
  try {
    if (!req.body?.analysis) return res.status(400).json({ error: "analysis is required" });
    res.json({ text: await explainRecommendation(req.body.analysis) });
  } catch (err) {
    next(err);
  }
});

explainRouter.post("/chat", async (req, res, next) => {
  try {
    const { analysis, messages } = req.body as { analysis: unknown; messages: ChatMessage[] };
    if (!analysis || !messages?.length) return res.status(400).json({ error: "analysis and messages are required" });
    res.json({ text: await chat(analysis, messages) });
  } catch (err) {
    next(err);
  }
});
