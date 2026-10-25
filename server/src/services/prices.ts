import { pool } from "../db/pool.js";
import { googleSearch, extractPrices, localResults } from "./serpapi.js";

export type PriceKind = "new" | "used" | "trade_in";
export type PriceQuote = { kind: PriceKind; price: number; samples: number; source: string; cached: boolean };

// Dealers typically offer ~88% of retail used value on trade-in
const TRADE_IN_RATIO = 0.88;
const CACHE_HOURS = 24;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

/** Drops values outside 1.5x the interquartile range so stray numbers don't skew the median. */
const withoutOutliers = (xs: number[]) => {
  if (xs.length < 4) return xs;
  const s = [...xs].sort((a, b) => a - b);
  const q1 = s[Math.floor(s.length * 0.25)];
  const q3 = s[Math.floor(s.length * 0.75)];
  const iqr = q3 - q1;
  return s.filter((x) => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr);
};

async function cachedPrice(model: string, year: number, kind: PriceKind, zip: string) {
  const { rows } = await pool.query(
    `SELECT price, source FROM price_history
     WHERE model = $1 AND year = $2 AND kind = $3 AND zip = $4 AND source LIKE 'serpapi%'
       AND time > now() - make_interval(hours => $5)
     ORDER BY time DESC LIMIT 1`,
    [model, year, kind, zip, CACHE_HOURS]
  );
  return rows[0] ? { price: Number(rows[0].price), source: rows[0].source as string } : null;
}

async function record(model: string, year: number, kind: PriceKind, price: number, source: string, zip: string) {
  await pool.query(
    `INSERT INTO price_history (time, model, year, kind, price, source, zip) VALUES (now(), $1, $2, $3, $4, $5, $6)`,
    [model, year, kind, price, source, zip]
  );
}

async function searchPrice(query: string, min: number, max: number) {
  const data = await googleSearch(query);
  const prices = withoutOutliers(extractPrices(data.organic_results ?? [], min, max));
  return { price: prices.length ? median(prices) : null, samples: prices.length, data };
}

/** Live market quotes for a Toyota: used value of the customer's car, its trade-in estimate, and a new replacement. */
export async function getQuotes(model: string, year: number, city: string, zip: string): Promise<PriceQuote[]> {
  const quotes: PriceQuote[] = [];
  const newYear = new Date().getFullYear() + 1;

  const cachedUsed = await cachedPrice(model, year, "used", zip);
  let used = cachedUsed?.price ?? null;
  if (cachedUsed) {
    quotes.push({ kind: "used", price: cachedUsed.price, samples: 0, source: cachedUsed.source, cached: true });
  } else {
    const r = await searchPrice(`used ${year} Toyota ${model} for sale ${city}`, 5000, 120000);
    if (r.price) {
      used = r.price;
      await record(model, year, "used", r.price, "serpapi:google", zip);
      quotes.push({ kind: "used", price: r.price, samples: r.samples, source: "serpapi:google", cached: false });
    }
  }

  if (used) {
    const tradeIn = Math.round(used * TRADE_IN_RATIO);
    if (!cachedUsed) await record(model, year, "trade_in", tradeIn, "serpapi:estimate", zip);
    quotes.push({ kind: "trade_in", price: tradeIn, samples: 0, source: "serpapi:estimate", cached: Boolean(cachedUsed) });
  }

  const cachedNew = await cachedPrice(model, newYear, "new", zip);
  if (cachedNew) {
    quotes.push({ kind: "new", price: cachedNew.price, samples: 0, source: cachedNew.source, cached: true });
  } else {
    const r = await searchPrice(`${newYear} Toyota ${model} MSRP starting price`, 15000, 120000);
    if (r.price) {
      await record(model, newYear, "new", r.price, "serpapi:google", zip);
      quotes.push({ kind: "new", price: r.price, samples: r.samples, source: "serpapi:google", cached: false });
    }
  }
  return quotes;
}

/** Strips tracking params so dealer links are clean. */
const cleanUrl = (url?: string) => {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    [...u.searchParams.keys()].filter((k) => k.startsWith("utm_")).forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return url;
  }
};

/** Nearby Toyota dealers from Google's local results, with links to their site, map, and inventory search. */
export async function getDealers(model: string, city: string) {
  const data = await googleSearch(`Toyota dealer ${model} inventory near ${city}`);
  return localResults(data)
    .filter((d) => /toyota/i.test(`${d.title} ${d.type}`))
    .slice(0, 5)
    .map((d) => {
      const gps = d.gps_coordinates;
      const destination = gps ? `${gps.latitude},${gps.longitude}` : `${d.title} ${d.address}`;
      return {
        name: d.title,
        address: d.address,
        rating: d.rating,
        reviews: d.reviews,
        phone: d.phone,
        hours: d.hours,
        quote: d.description?.replace(/^"|"$/g, ""),
        website: cleanUrl(d.links?.website),
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
        inventoryUrl: `https://www.google.com/search?q=${encodeURIComponent(`${d.title} new ${model} inventory`)}`,
      };
    });
}

export async function getPriceHistory(model: string, kind: PriceKind) {
  const { rows } = await pool.query(
    `SELECT time_bucket('1 week', time) AS week, round(avg(price)) AS price
     FROM price_history WHERE model = $1 AND kind = $2
     GROUP BY week ORDER BY week`,
    [model, kind]
  );
  return rows.map((r) => ({ week: r.week, price: Number(r.price) }));
}
