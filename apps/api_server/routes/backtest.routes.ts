import { Router } from "express";
import {
  postBacktestResults,
  getBacktestResults,
} from "../contollers/backtest.controller";

const backtestRoutes: Router = Router();

backtestRoutes.post("/results", postBacktestResults);
backtestRoutes.get("/results/:id", getBacktestResults);

export default backtestRoutes;
