export interface MonteCarloResult {
  simulations: number;
  probabilityUp: number;
  probabilityDown: number;
  expectedPrice1h: number;
  expectedPrice4h: number;
  priceDistribution: number[];
  confidenceInterval68: { low: number; high: number };
  confidenceInterval95: { low: number; high: number };
}

function gbmStep(price: number, mu: number, sigma: number, dt: number): number {
  const z = randomNormal();
  return price * Math.exp((mu - 0.5 * sigma ** 2) * dt + sigma * Math.sqrt(dt) * z);
}

function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function runMonteCarlo(prices: number[], numSimulations = 1000): MonteCarloResult {
  if (prices.length < 5) {
    const p = prices[prices.length - 1] ?? 1.085;
    return {
      simulations: numSimulations,
      probabilityUp: 0.5,
      probabilityDown: 0.5,
      expectedPrice1h: p,
      expectedPrice4h: p,
      priceDistribution: new Array(20).fill(p),
      confidenceInterval68: { low: p - 0.002, high: p + 0.002 },
      confidenceInterval95: { low: p - 0.005, high: p + 0.005 },
    };
  }

  const returns = prices.slice(-100).map((p, i, arr) => i > 0 ? Math.log(p / arr[i - 1]!) : 0).slice(1);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const sigma = Math.sqrt(variance);
  const mu = mean;

  const current = prices[prices.length - 1]!;
  const stepsPerHour = 12;
  const dt = 1 / (stepsPerHour * 24 * 252);

  const finalPrices1h: number[] = [];
  const finalPrices4h: number[] = [];

  for (let s = 0; s < numSimulations; s++) {
    let price1h = current;
    for (let t = 0; t < stepsPerHour; t++) {
      price1h = gbmStep(price1h, mu, sigma, dt);
    }
    finalPrices1h.push(price1h);

    let price4h = current;
    for (let t = 0; t < stepsPerHour * 4; t++) {
      price4h = gbmStep(price4h, mu, sigma, dt);
    }
    finalPrices4h.push(price4h);
  }

  const sorted1h = [...finalPrices1h].sort((a, b) => a - b);
  const p2_5 = sorted1h[Math.floor(0.025 * numSimulations)]!;
  const p16 = sorted1h[Math.floor(0.16 * numSimulations)]!;
  const p84 = sorted1h[Math.floor(0.84 * numSimulations)]!;
  const p97_5 = sorted1h[Math.floor(0.975 * numSimulations)]!;

  const probabilityUp = finalPrices1h.filter(p => p > current).length / numSimulations;
  const expectedPrice1h = finalPrices1h.reduce((a, b) => a + b, 0) / numSimulations;
  const expectedPrice4h = finalPrices4h.reduce((a, b) => a + b, 0) / numSimulations;

  const min = Math.min(...finalPrices1h);
  const max = Math.max(...finalPrices1h);
  const bins = 20;
  const binSize = (max - min) / bins || 0.0001;
  const distribution = new Array(bins).fill(0) as number[];
  finalPrices1h.forEach(p => {
    const bin = Math.min(bins - 1, Math.floor((p - min) / binSize));
    distribution[bin]!++;
  });

  return {
    simulations: numSimulations,
    probabilityUp,
    probabilityDown: 1 - probabilityUp,
    expectedPrice1h,
    expectedPrice4h,
    priceDistribution: distribution,
    confidenceInterval68: { low: p16, high: p84 },
    confidenceInterval95: { low: p2_5, high: p97_5 },
  };
}
