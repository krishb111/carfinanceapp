import { Router } from "express";
import { explainRecommendation, chat, type Analysis } from "../services/explain.js";
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
    const { analysis, messages } = req.body as { analysis: Analysis; messages: ChatMessage[] };
    if (!analysis?.lease || !messages?.length) return res.status(400).json({ error: "analysis (with lease) and messages are required" });
    res.json(await chat(analysis, messages));
  } catch (err) {
    next(err);
  }
});
