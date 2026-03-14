export interface MLFeatures {
  rsi: number;
  momentum: number;
  volatility: number;
  hurstExponent: number;
  zScore: number;
  bbPercentB: number;
  priceAcceleration: number;
  marketEntropy: number;
  liquidityShock: number;
  fatTailIndex: number;
}

interface Tree {
  feature: keyof MLFeatures;
  threshold: number;
  left: number | Tree;
  right: number | Tree;
}

function classify(tree: Tree | number, features: MLFeatures): number {
  if (typeof tree === "number") return tree;
  const val = features[tree.feature];
  if (val <= tree.threshold) return classify(tree.left, features);
  return classify(tree.right, features);
}

const FOREST: Tree[] = [
  {
    feature: "rsi",
    threshold: 50,
    left: {
      feature: "momentum",
      threshold: 0,
      left: { feature: "hurstExponent", threshold: 0.5, left: 55, right: 65 },
      right: { feature: "bbPercentB", threshold: 0.5, left: 45, right: 50 },
    },
    right: {
      feature: "momentum",
      threshold: 5,
      left: { feature: "zScore", threshold: 0, left: 40, right: 55 },
      right: { feature: "volatility", threshold: 0.0003, left: 70, right: 60 },
    },
  },
  {
    feature: "hurstExponent",
    threshold: 0.55,
    left: {
      feature: "zScore",
      threshold: 1,
      left: { feature: "rsi", threshold: 45, left: 60, right: 50 },
      right: { feature: "momentum", threshold: 3, left: 65, right: 75 },
    },
    right: {
      feature: "bbPercentB",
      threshold: 0.8,
      left: { feature: "rsi", threshold: 60, left: 55, right: 65 },
      right: { feature: "liquidityShock", threshold: 2, left: 45, right: 70 },
    },
  },
  {
    feature: "marketEntropy",
    threshold: 0.7,
    left: {
      feature: "rsi",
      threshold: 40,
      left: { feature: "fatTailIndex", threshold: 4, left: 70, right: 60 },
      right: { feature: "momentum", threshold: -2, left: 50, right: 55 },
    },
    right: {
      feature: "priceAcceleration",
      threshold: 0,
      left: { feature: "zScore", threshold: -1, left: 45, right: 50 },
      right: { feature: "hurstExponent", threshold: 0.6, left: 55, right: 65 },
    },
  },
  {
    feature: "volatility",
    threshold: 0.0002,
    left: {
      feature: "rsi",
      threshold: 55,
      left: { feature: "hurstExponent", threshold: 0.45, left: 58, right: 52 },
      right: { feature: "bbPercentB", threshold: 0.6, left: 48, right: 62 },
    },
    right: {
      feature: "liquidityShock",
      threshold: 1.5,
      left: { feature: "momentum", threshold: 2, left: 53, right: 67 },
      right: { feature: "zScore", threshold: 0.5, left: 58, right: 72 },
    },
  },
  {
    feature: "zScore",
    threshold: 0,
    left: {
      feature: "rsi",
      threshold: 35,
      left: { feature: "fatTailIndex", threshold: 5, left: 75, right: 65 },
      right: { feature: "hurstExponent", threshold: 0.55, left: 48, right: 54 },
    },
    right: {
      feature: "rsi",
      threshold: 65,
      left: { feature: "volatility", threshold: 0.0003, left: 52, right: 58 },
      right: { feature: "fatTailIndex", threshold: 4, left: 40, right: 35 },
    },
  },
];

export function computeMLScore(features: MLFeatures, direction: "long" | "short"): number {
  const votes = FOREST.map(tree => classify(tree, features));
  const avg = votes.reduce((a, b) => a + b, 0) / votes.length;

  const directionAdj = direction === "long"
    ? (features.rsi < 50 ? 5 : -5) + (features.momentum > 0 ? 5 : -5)
    : (features.rsi > 50 ? 5 : -5) + (features.momentum < 0 ? 5 : -5);

  return Math.max(0, Math.min(100, avg + directionAdj));
}
