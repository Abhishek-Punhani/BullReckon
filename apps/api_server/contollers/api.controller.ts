import { Response, NextFunction } from "express";
import crypto from "crypto";
import { ErrorHandling } from "../../../middleware/errorHandler";
import { AuthenticatedRequest } from "types/auth";
import { ApiKey } from "../models/apiKey";
import { internalApi } from "../../../shared/internalApi.client";
import { Backtest } from "../models/backtest";

export const apiKeyController = {
  generateApiKey: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { expiresInDays } = req.body;
      const userEmail = req.user.email;

      const existingCount = await ApiKey.countDocuments({
        email: userEmail,
        isActive: true,
      });

      if (existingCount >= 10) {
        return next(
          new ErrorHandling("Maximum API keys limit (10) reached", 400)
        );
      }

      // Generate RSA key pair
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      });

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      // Store private key in api_server
      const apiKeyRecord = new ApiKey({
        privateKey,
        email: userEmail,
        isActive: true,
        expiresAt,
        requestsUsed: 0,
        rateLimit: {
          maxPerMinute: 15,
          currentCount: 0,
          windowStart: new Date(),
        },
      });

      await apiKeyRecord.save();

      // Store public key in auth_server via internal API
      try {
        await internalApi.post(
          `${process.env.AUTH_SERVER_URL}/api/internal/store-public-key`,
          {
            email: userEmail,
            publicKey,
          }
        );
      } catch (error) {
        // Rollback if storing public key fails
        await ApiKey.deleteOne({ _id: apiKeyRecord._id });
        throw new Error("Failed to store public key in auth server");
      }

      res.status(201).json({
        success: true,
        message: "API key generated successfully",
        data: {
          id: apiKeyRecord._id,
          publicKey, // Return public key to user
          expiresAt: apiKeyRecord.expiresAt,
          createdAt: apiKeyRecord.createdAt,
          warning:
            "Save this public key securely. You will need it for API requests.",
        },
      });
    } catch (error) {
      console.error("Error generating API key:", error);
      next(new ErrorHandling("Failed to generate API key", 500));
    }
  },

  getUserApiKeys: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userEmail = req.user.email;

      const apiKeys = await ApiKey.find({
        email: userEmail,
        isActive: true,
      })
        .select("-privateKey")
        .sort({ createdAt: -1 });

      const keysWithStats = apiKeys.map((key) => ({
        id: key._id,
        email: key.email,
        isActive: key.isActive,
        requestsUsed: key.requestsUsed,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        rateLimit: key.rateLimit,
        createdAt: key.createdAt,
      }));

      res.json({
        success: true,
        data: {
          keys: keysWithStats,
          total: keysWithStats.length,
        },
      });
    } catch (error) {
      console.error("Error fetching API keys:", error);
      next(new ErrorHandling("Failed to fetch API keys", 500));
    }
  },

  revokeApiKey: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { keyId } = req.params;
      const userEmail = req.user.email;

      if (!keyId) {
        return next(new ErrorHandling("API key ID is required", 400));
      }

      const result = await ApiKey.updateOne(
        { _id: keyId, email: userEmail, isActive: true },
        { isActive: false }
      );

      if (result.modifiedCount === 0) {
        return next(new ErrorHandling("API key not found", 404));
      }

      res.json({
        success: true,
        message: "API key revoked successfully",
      });
    } catch (error) {
      console.error("Error revoking API key:", error);
      next(new ErrorHandling("Failed to revoke API key", 500));
    }
  },

  getUserBacktests: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user._id;
      const backtests = await Backtest.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, data: backtests });
    } catch (error) {
      console.error("Error fetching user backtests:", error);
      next(new ErrorHandling("Failed to fetch backtests", 500));
    }
  },
};
