import axios from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const internalApi = axios.create({
  timeout: 5000,
  headers: {
    "X-Internal-Service": "true",
    "X-Service-Secret": process.env.INTERNAL_SERVICE_SECRET,
    "Content-Type": "application/json",
  },
});
