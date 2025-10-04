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
  public statusCode: number;
  public errors?: any[];

  constructor(message: string, statusCode: number, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let errorResponse: ErrorResponse = {
    error: {
      status: 500,
      message: "Internal Server Error",
    },
  };

  // Check if error has a custom statusCode
  if (err.statusCode && typeof err.statusCode === "number") {
    errorResponse.error.status = err.statusCode;
    errorResponse.error.message = err.message;
  }
  // HTTP Errors (from http-errors or created manually)
  else if ("status" in err && typeof (err as HttpError).status === "number") {
    errorResponse.error.status = (err as HttpError).status;
    errorResponse.error.message = err.message;
  }
  // Mongoose Validation Error
  else if (err instanceof mongoose.Error.ValidationError) {
    errorResponse.error.status = 400;
    errorResponse.error.message = "Validation Error";
    errorResponse.error.details = Object.values(err.errors).map((e) => e.message);
  }
  // Mongoose Duplicate Key Error
  else if ((err as any).code === 11000) {
    errorResponse.error.status = 400;
    errorResponse.error.message = "Duplicate field value";
    const field = Object.keys((err as any).keyValue)[0];
    errorResponse.error.details = `${field} already exists`;
  }
  // Zod Validation Error
  else if (err instanceof ZodError) {
    errorResponse.error.status = 400;
    errorResponse.error.message = "Validation Error";
    errorResponse.error.details = err.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
  }
  // JWT Errors
  else if (err.name === "JsonWebTokenError") {
    errorResponse.error.status = 401;
    errorResponse.error.message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    errorResponse.error.status = 401;
    errorResponse.error.message = "Token expired";
  }
  // Generic Error
  else {
    errorResponse.error.message = err.message || "Something went wrong";
  }

  // Optionally include stack in development mode
  if (process.env.NODE_ENV === "development") {
    errorResponse.error.stack = err.stack;
  }

  res.status(errorResponse.error.status);
  res.setHeader("Content-Type", "application/json");
  res.json(errorResponse);
};