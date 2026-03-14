import { db } from "@workspace/db";
import { priceHistoryTable } from "@workspace/db/schema";
import { desc, sql } from "drizzle-orm";

interface PriceData {
  price: number;
  timestamp: Date;
  source: string;
}

const state = {
  currentPrice: 1.0850,
  previousPrice: 1.0850,
  pipAdjustment: 0,
  lastFetchTime: 0,
  pollInterval: 5000,
  consecutiveErrors: 0,
  source: "initializing",
  priceBuffer: [] as { price: number; timestamp: number }[],
};

const POLL_INTERVALS = [5000, 10000, 15000, 20000, 30000, 60000];

async function fetchFromFrankfurter(): Promise<number | null> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { rates?: { USD?: number } };
    return data.rates?.USD ?? null;
  } catch {
    return null;
  }
}

async function fetchFromExchangeRate(): Promise<number | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { rates?: { USD?: number } };
    return data.rates?.USD ?? null;
  } catch {
    return null;
  }
}

async function fetchFromFallback(): Promise<number | null> {
  try {
    const res = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { eur?: { usd?: number } };
    return data.eur?.usd ?? null;
  } catch {
    return null;
  }
}

async function fetchPrice(): Promise<PriceData | null> {
  const attempts: [() => Promise<number | null>, string][] = [
    [fetchFromFrankfurter, "Frankfurter API"],
    [fetchFromExchangeRate, "ExchangeRate API"],
    [fetchFromFallback, "CDN Currency API"],
  ];

  for (const [fn, source] of attempts) {
    const price = await fn();
    if (price !== null && price > 0.5 && price < 2.0) {
      return { price, timestamp: new Date(), source };
    }
  }
  return null;
}

function adjustInterval(success: boolean) {
  if (success) {
    state.consecutiveErrors = 0;
    const idx = Math.max(0, POLL_INTERVALS.indexOf(state.pollInterval) - 1);
    state.pollInterval = POLL_INTERVALS[idx] ?? POLL_INTERVALS[0];
  } else {
    state.consecutiveErrors++;
    const idx = Math.min(POLL_INTERVALS.length - 1, POLL_INTERVALS.indexOf(state.pollInterval) + 1);
    state.pollInterval = POLL_INTERVALS[idx] ?? POLL_INTERVALS[POLL_INTERVALS.length - 1];
  }
}

function addToBuffer(price: number) {
  const now = Date.now();
  state.priceBuffer.push({ price, timestamp: now });
  if (state.priceBuffer.length > 500) {
    state.priceBuffer.shift();
  }
}

async function tick() {
  const data = await fetchPrice();
  if (data) {
    state.previousPrice = state.currentPrice;
    state.currentPrice = data.price;
    state.source = data.source;
    state.lastFetchTime = Date.now();
    addToBuffer(data.price);
    adjustInterval(true);

    try {
      const close = data.price;
      const high = close * (1 + Math.abs(Math.random() * 0.0003));
      const low = close * (1 - Math.abs(Math.random() * 0.0003));
      const open = state.previousPrice;
      await db.insert(priceHistoryTable).values({
        price: close,
        open,
        high,
        low,
        close,
        timestamp: data.timestamp,
      });
    } catch {
    }
  } else {
    adjustInterval(false);
  }
  setTimeout(tick, state.pollInterval);
}

tick();

export function getCurrentPrice() {
  const adjusted = state.currentPrice + state.pipAdjustment * 0.0001;
  const prevAdjusted = state.previousPrice + state.pipAdjustment * 0.0001;
  const pipChange = Math.round((adjusted - prevAdjusted) * 10000 * 10) / 10;
  const pipChangePercent = state.previousPrice > 0 ? (pipChange / (state.previousPrice * 10000)) * 100 : 0;

  return {
    price: state.currentPrice,
    adjustedPrice: adjusted,
    pipChange,
    pipChangePercent,
    previousPrice: state.previousPrice,
    timestamp: new Date().toISOString(),
    source: state.source,
    pollInterval: state.pollInterval,
  };
}

export function setPipAdjustment(pips: number) {
  state.pipAdjustment = pips;
}

export function getPipAdjustment() {
  return state.pipAdjustment;
}

export function getPriceBuffer() {
  return state.priceBuffer;
}

export async function getPriceHistory(limit = 100) {
  const rows = await db
    .select()
    .from(priceHistoryTable)
    .orderBy(desc(priceHistoryTable.timestamp))
    .limit(limit);
  return rows.reverse();
}
