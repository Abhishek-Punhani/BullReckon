import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ErrorHandling } from "../../middleware/errorHandler";
import { ApiKey } from "./models/apiKey";

declare global {
  namespace Express {
    interface Request {
      apiUser?: {
        email: string;
        keyId: string;
      };
    }
  }
}

export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Allow CORS preflight requests to pass through without auth checks
    if (req.method === "OPTIONS") {
      return next();
    }

    // Get email and public key from headers
    const email = req.headers["x-api-email"] as string;
    const publicKey = req.headers["x-api-key"] as string;
    const timestamp = req.headers["x-api-timestamp"] as string;

    if (!email || !publicKey || !timestamp) {
      return next(
        new ErrorHandling(
          "Missing required headers: x-api-email, x-api-key, x-api-timestamp",
          401
        )
      );
    }

    // Check timestamp to prevent replay attacks (5 min window)
    const currentTimestamp = Date.now();
    const requestTime = parseInt(timestamp, 10);
    if (
      isNaN(requestTime) ||
      Math.abs(currentTimestamp - requestTime) > 5 * 60 * 1000
    ) {
      return next(
        new ErrorHandling("Request timestamp expired or invalid", 401)
      );
    }
    // Find the API key record (for rate limits / status). do not require privateKey here.
    const apiKeyRecord = await ApiKey.findOne({
      email,
      isActive: true,
    });

    if (!apiKeyRecord) {
      return next(new ErrorHandling("Invalid API credentials", 401));
    }

    // Check expiration
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      return next(new ErrorHandling("API key has expired", 401));
    }

    try {
      // Normalize header public key to a canonical PEM form
      let headerPublicPem: string;

      // Accept either a full PEM (with -----BEGIN PUBLIC KEY-----) or a bare base64 block
      const headerKeyInput = publicKey.trim();
      let headerPemCandidate: string;

      if (!/-----BEGIN [A-Z ]+KEY-----/.test(headerKeyInput)) {
        // header is likely bare base64; remove whitespace and wrap into PEM
        const cleanB64 = headerKeyInput.replace(/\s+/g, "");
        const wrapped = cleanB64.match(/.{1,64}/g)?.join("\n") ?? cleanB64;
        headerPemCandidate = `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
      } else {
        headerPemCandidate = headerKeyInput;
      }

      const headerPublicKeyObj = crypto.createPublicKey({
        key: headerPemCandidate,
        format: "pem",
        type: "spki",
      });
      headerPublicPem = headerPublicKeyObj
        .export({ type: "spki", format: "pem" })
        .toString()
        .trim();

      // Derive public key from the stored private key and compare
      if (!apiKeyRecord.privateKey) {
        return next(
          new ErrorHandling(
            "No server-side private key available for validation",
            401
          )
        );
      }

      const privKeyObj = crypto.createPrivateKey(apiKeyRecord.privateKey);
      const derivedPubPem = crypto
        .createPublicKey(privKeyObj)
        .export({ type: "spki", format: "pem" })
        .toString()
        .trim();

      // Optional safe debug: log only hashes when DEBUG_API_KEYS=true
      if (process.env.DEBUG_API_KEYS === "true") {
        try {
          const headerHash = crypto
            .createHash("sha256")
            .update(headerPublicPem)
            .digest("hex");
          const derivedHash = crypto
            .createHash("sha256")
            .update(derivedPubPem)
            .digest("hex");
          console.debug(
            `API key hashes - header:${headerHash} derived:${derivedHash} (truncated)`
          );
        } catch (e) {
          console.debug("Unable to compute key hashes for debug");
        }
      }

      if (derivedPubPem !== headerPublicPem) {
        return next(
          new ErrorHandling(
            "Public key does not match private key on record",
            401
          )
        );
      }
    } catch (err) {
      console.error("Error validating key pair:", err);
      return next(new ErrorHandling("Unable to validate key pair", 500));
    }
    // Rate limiting check
    const nowDate = new Date();
    const windowStart = apiKeyRecord.rateLimit.windowStart;
    const windowDuration = 60 * 1000; // 1 minute

    if (nowDate.getTime() - windowStart.getTime() > windowDuration) {
      // Reset window
      apiKeyRecord.rateLimit.currentCount = 1;
      apiKeyRecord.rateLimit.windowStart = nowDate;
    } else {
      apiKeyRecord.rateLimit.currentCount++;

      if (
        apiKeyRecord.rateLimit.currentCount >
        apiKeyRecord.rateLimit.maxPerMinute
      ) {
        return next(
          new ErrorHandling(
            `Rate limit exceeded. Max ${apiKeyRecord.rateLimit.maxPerMinute} requests per minute`,
            429
          )
        );
      }
    }

    // Update usage stats
    apiKeyRecord.requestsUsed++;
    apiKeyRecord.lastUsedAt = nowDate;
    await apiKeyRecord.save();

    // Attach user info to request
    req.apiUser = {
      email: apiKeyRecord.email,
      keyId: apiKeyRecord._id.toString(),
    };

    next();
  } catch (error) {
    console.error("API authentication error:", error);
    next(new ErrorHandling("API authentication failed", 401));
  }
};
