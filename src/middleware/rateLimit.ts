import rateLimit from "express-rate-limit";

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,           // 1 minute window
  max: 60,                        // 60 requests per IP per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down.", code: "RATE_LIMITED" }
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Rate limit exceeded for this endpoint.", code: "RATE_LIMITED" }
});
