import { Router } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user";
import { internalAuth } from "../../../middleware/internalAuthMiddleware";

const router: Router = Router();

router.use(internalAuth);

router.post("/validate-token", async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS!) as any;
    const user = await User.findById(decoded.id)
      .select("firstName lastName email role isEmailVerified")
      .lean();

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        _id: decoded.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error: any) {
    res.status(401).json({
      error:
        error.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
    });
  }
});

router.get("/get-user-email/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("email").lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ email: user.email });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/get-user-details/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select("_id firstName lastName email role isEmailVerified")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/store-public-key", async (req, res) => {
  try {
    const { email, publicKey } = req.body;

    if (!email || !publicKey) {
      return res
        .status(400)
        .json({ error: "Email and public key are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.apiKey = publicKey;
    await user.save();

    res.json({
      success: true,
      message: "Public key stored successfully",
    });
  } catch (error) {
    console.error("Error storing public key:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get public key for verification
router.get("/get-public-key/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }).select("apiKey").lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ publicKey: user.apiKey });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user by email (for internal API calls from api_server)
router.get("/user-by-email/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email })
      .select("_id firstName lastName email role isEmailVerified")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user by email:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as internalRoutes };
