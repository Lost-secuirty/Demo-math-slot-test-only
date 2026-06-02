// =====================================================================
// test helper: the statistical tests gambling labs use to certify an RNG
// (GLI-19 / eCOGRA reference NIST SP 800-22 & Diehard; the core reference
// distributions are chi-square and Kolmogorov-Smirnov). These are pure
// functions returning a statistic; tests assert it is within the critical
// value for a fixed seed (deterministic, so no flakiness).
// =====================================================================

// Chi-square goodness-of-fit of U(0,1) samples binned into k buckets.
// dof = k-1; e.g. k=10 -> crit(0.05)=16.919.
export function chiSquareUniform(stream, n, k) {
  const counts = new Array(k).fill(0);
  for (let i = 0; i < n; i++) counts[Math.min(k - 1, Math.floor(stream() * k))]++;
  const expected = n / k;
  return counts.reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
}

// Chi-square goodness-of-fit of categorical observations vs expected
// probabilities. `observed` and `prob` are keyed objects.
export function chiSquareCategorical(observed, prob, n) {
  let x = 0;
  for (const key of Object.keys(prob)) {
    const e = n * prob[key];
    x += ((observed[key] || 0) - e) ** 2 / e;
  }
  return x;
}

// Kolmogorov-Smirnov D statistic vs the uniform CDF. crit ~ 1.36/sqrt(n)
// at the 5% level.
export function ksUniform(stream, n) {
  const xs = new Array(n);
  for (let i = 0; i < n; i++) xs[i] = stream();
  xs.sort((a, b) => a - b);
  let d = 0;
  for (let i = 0; i < n; i++) {
    d = Math.max(d, Math.abs((i + 1) / n - xs[i]), Math.abs(xs[i] - i / n));
  }
  return d;
}

// Wald-Wolfowitz runs test about the 0.5 median; returns a Z score
// (|Z| < 1.96 ~ random at the 5% level).
export function runsZ(stream, n) {
  const bits = new Array(n);
  for (let i = 0; i < n; i++) bits[i] = stream() >= 0.5 ? 1 : 0;
  let runs = 1;
  for (let i = 1; i < n; i++) if (bits[i] !== bits[i - 1]) runs++;
  const n1 = bits.reduce((a, b) => a + b, 0);
  const n2 = n - n1;
  const mu = (2 * n1 * n2) / n + 1;
  const variance = ((mu - 1) * (mu - 2)) / (n - 1);
  return (runs - mu) / Math.sqrt(variance);
}

// Lag-1 serial (auto)correlation; |r| should be ~0 (< ~3/sqrt(n)).
export function serialCorrelation(stream, n) {
  const xs = new Array(n);
  for (let i = 0; i < n; i++) xs[i] = stream();
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n - 1; i++) num += (xs[i] - mean) * (xs[i + 1] - mean);
  for (let i = 0; i < n; i++) den += (xs[i] - mean) ** 2;
  return num / den;
}
