import axios from "axios";

export const internalApi = axios.create({
  timeout: 5000,
  headers: {
    "X-Internal-Service": "true",
    "X-Service-Secret":
      process.env.INTERNAL_SERVICE_SECRET || "bullreckon-secret",
    "Content-Type": "application/json",
  },
});
