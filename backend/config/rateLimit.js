/**
 * Fixed-window rate limiter, in-memory.
 *
 * Purpose here is blunt abuse/brute-force resistance, not distributed quota
 * enforcement. A single-node store is the right size for this app; a multi-
 * replica deployment would need Redis, which the project plan defers.
 *
 * Note: behind a proxy, req.ip only reflects the client when Express is told to
 * trust the proxy hop -- otherwise every request looks like it comes from the
 * proxy and one user could lock out everyone. index.js sets that trust
 * explicitly via TRUST_PROXY.
 */
function rateLimit({ windowMs, max, key = (req) => req.ip, message }) {
  const hits = new Map();

  // Drop expired buckets periodically so the Map cannot grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) {
      if (v.reset <= now) hits.delete(k);
    }
  }, windowMs);
  sweep.unref();

  return function limiter(req, res, next) {
    const k = key(req);
    const now = Date.now();
    let entry = hits.get(k);

    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.reset - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: message || `Too many requests. Try again in ${retryAfter}s.`,
        },
      });
    }

    return next();
  };
}

module.exports = { rateLimit };