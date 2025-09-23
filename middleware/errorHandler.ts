import { NextFunction, Request, Response } from "express";
import { HttpError } from "http-errors";
import { ZodError } from "zod";
import mongoose from "mongoose";

interface ErrorResponse {
  error: {
    status: number;
    message: string;
    details?: any;
    stack?: string;
  };
}
export class ErrorHandling extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public errors?: any[]
  ) {
    super();
    this.message = message;
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const errorHandler = (
  err: Error | HttpError,
  req: Request,
  res: Response
): void => {
  let error: ErrorResponse = {
    error: {
      status: 500,
      message: "Internal Server Error",
    },
  };

  // HTTP Errors
  if ("status" in err) {
    error.error.status = err.status;
    error.error.message = err.message;
  }

  // Mongoose Validation Error
  else if (err instanceof mongoose.Error.ValidationError) {
    error.error.status = 400;
    error.error.message = "Validation Error";
    error.error.details = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose Duplicate Key Error
  else if ("code" in err && err.code === 11000) {
    error.error.status = 400;
    error.error.message = "Duplicate field value";
    const field = Object.keys((err as any).keyValue)[0];
    error.error.details = `${field} already exists`;
  }

  // Zod Validation Error
  else if (err instanceof ZodError) {
    error.error.status = 400;
    error.error.message = "Validation Error";
    error.error.details = err.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
  }

  // JWT Errors
  else if (err.name === "JsonWebTokenError") {
    error.error.status = 401;
    error.error.message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    error.error.status = 401;
    error.error.message = "Token expired";
  }

  // Generic Error
  else {
    error.error.message = err.message || "Something went wrong";
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === "development") {
    error.error.stack = err.stack;
  }

  // Log error
  console.error("🚨 Error:", {
    message: err.message,
    status: error.error.status,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.status(error.error.status).json(error);
};
