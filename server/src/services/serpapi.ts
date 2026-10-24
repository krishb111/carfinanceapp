import { config } from "../config.js";

type OrganicResult = { title?: string; link?: string; snippet?: string; source?: string };
type LocalResult = { title?: string; address?: string; rating?: number; phone?: string };
type SearchResponse = { error?: string; organic_results?: OrganicResult[]; local_results?: LocalResult[] | { places?: LocalResult[] } };

export async function googleSearch(q: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ engine: "google", q, gl: "us", hl: "en", api_key: config.serpApiKey });
  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) throw new Error(`SerpApi failed: ${res.status}`);
  const data = (await res.json()) as SearchResponse;
  if (data.error) throw new Error(`SerpApi: ${data.error}`);
  return data;
}

/** Pulls dollar amounts out of titles/snippets, keeping only plausible vehicle prices. */
export function extractPrices(results: OrganicResult[], min = 5000, max = 120000): number[] {
  const text = results.map((r) => `${r.title ?? ""} ${r.snippet ?? ""}`).join(" ");
  return [...text.matchAll(/\$(\d{1,3}(?:,\d{3})+|\d{4,6})(?![\d,]*\/mo)/g)]
    .map((m) => Number(m[1].replace(/,/g, "")))
    .filter((p) => p >= min && p <= max);
}

export function localResults(data: SearchResponse): LocalResult[] {
  const local = data.local_results;
  return Array.isArray(local) ? local : (local?.places ?? []);
}
