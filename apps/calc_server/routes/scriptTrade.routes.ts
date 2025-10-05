import { Router } from "express";
import { getScriptTradeLogWithDetails } from "../utils/scriptTradeLogger";

const router:Router = Router();

// GET /script-trades/:scriptName (populated)
router.get("/:scriptName", async (req, res, next) => {
  try {
    const { scriptName } = req.params;
    if (!scriptName) {
      return res.status(400).json({ error: "Script name required" });
    }
    const scriptTrade = await getScriptTradeLogWithDetails(scriptName);
    res.json({ success: true, scriptTrade });
  } catch (err) {
    next(err);
  }
});

export default router;
