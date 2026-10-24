import { config } from "../config.js";

export type ChatMessage = { role: "user" | "model"; text: string };

export type Part = {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  thoughtSignature?: string;
};
export type Content = { role: "user" | "model"; parts: Part[] };
export type FunctionDeclaration = { name: string; description: string; parameters: Record<string, unknown> };

type GeminiResponse = {
  candidates?: { content?: Content }[];
  error?: { message: string };
};

/** One Gemini call; returns the model's raw parts so callers can handle function calls. */
export async function generateParts(
  systemInstruction: string,
  contents: Content[],
  functions?: FunctionDeclaration[]
): Promise<Part[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        tools: functions ? [{ functionDeclarations: functions }] : undefined,
        generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
      }),
    }
  );
  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) throw new Error(`Gemini: ${data.error?.message ?? res.status}`);
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts?.length) throw new Error("Gemini returned an empty response");
  return parts;
}

export const textOf = (parts: Part[]) => parts.map((p) => p.text ?? "").join("").trim();

export async function generate(systemInstruction: string, messages: ChatMessage[]): Promise<string> {
  const parts = await generateParts(
    systemInstruction,
    messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
  );
  return textOf(parts);
}
