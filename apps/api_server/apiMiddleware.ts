import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ErrorHandling } from '../../middleware/errorHandler';
import { ApiKey } from './models/apiKey';

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
    // Get email and public key from headers
    const email = req.headers['x-api-email'] as string;
    const publicKey = req.headers['x-api-key'] as string;
    const signature = req.headers['x-api-signature'] as string;
    const timestamp = req.headers['x-api-timestamp'] as string;

    if (!email || !publicKey || !signature || !timestamp) {
      return next(
        new ErrorHandling(
          'Missing required headers: x-api-email, x-api-key, x-api-signature, x-api-timestamp',
          401
        )
      );
    }

    // Check timestamp to prevent replay attacks (5 min window)
    const currentTimestamp = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(currentTimestamp - requestTime) > 5 * 60 * 1000) {
      return next(new ErrorHandling('Request timestamp expired', 401));
    }

    // Find the API key record
    const apiKeyRecord = await ApiKey.findOne({
      email,
      isActive: true,
    }).select('+privateKey');

    if (!apiKeyRecord) {
      return next(new ErrorHandling('Invalid API credentials', 401));
    }

    // Check expiration
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      return next(new ErrorHandling('API key has expired', 401));
    }

    // Verify signature using stored private key
    try {
      const verifier = crypto.createVerify('SHA256');
      const message = `${email}:${timestamp}:${req.method}:${req.originalUrl}`;
      verifier.update(message);
      verifier.end();

      const isValid = verifier.verify(publicKey, signature, 'base64');

      if (!isValid) {
        return next(new ErrorHandling('Invalid signature', 401));
      }
    } catch (error) {
      console.error('Signature verification error:', error);
      return next(new ErrorHandling('Signature verification failed', 401));
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
      
      if (apiKeyRecord.rateLimit.currentCount > apiKeyRecord.rateLimit.maxPerMinute) {
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
    console.error('API authentication error:', error);
    next(new ErrorHandling('API authentication failed', 401));
  }
};