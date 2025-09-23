import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../../../packages/models";
import bcrypt from "bcryptjs";
import { generateTokens } from "../../../shared/tokens";
import { ErrorHandling } from "../../../middleware/errorHandler";

export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, email, password, photo } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return next(
        new ErrorHandling(
          "All fields (firstName, lastName, email, password) are required",
          400
        )
      );
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(
        new ErrorHandling("User with this email already exists", 409)
      );
    }
    const userData: any = {
      firstName,
      lastName,
      email,
      password,
      role: "user",
      authMethod: "password",
    };
    if (photo) userData.photo = photo;

    const user = await User.create(userData);
    const { accessToken, refreshToken } = await generateTokens(user._id);
    try {
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
      if (!user) {
        return next(
          new ErrorHandling("User not found after registration", 500)
        );
      }

      return res.status(201).json({
        status: "success",
        message: "User registered successfully",
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          email: user.email,
          role: user.role,
          balance: user.balance,
        },
        accessToken,
      });
    } catch (err) {
      return next(new ErrorHandling("Error while sending response", 500));
    }
  } catch (err) {
    next(err);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ErrorHandling("Email and password are required", 400));
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) {
      return next(new ErrorHandling("Invalid email or password", 401));
    }
    // Check if user can login with password
    if (!user.hasPasswordAuth()) {
      return next(
        new ErrorHandling(
          "This account is registered with Google only. Please use Google login.",
          401
        )
      );
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new ErrorHandling("Invalid email or password", 401));
    }

    const { accessToken, refreshToken } = await generateTokens(user._id);
    try {
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
      user.lastLogin = new Date();
      await user.save();

      return res.status(200).json({
        status: "success",
        message: "Logged in successfully",
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          email: user.email,
          role: user.role,
          balance: user.balance,
        },
        accessToken,
      });
    } catch (err) {
      return next(new ErrorHandling("Error while sending response", 500));
    }
  } catch (err) {
    next(err);
  }
};

export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new ErrorHandling("User not authenticated", 401));
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(200).json({
    status: "success",
    message: "User logged out successfully",
  });
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return next(new ErrorHandling("Refresh token not provided", 401));
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_REFRESH!);
    } catch (err) {
      return next(new ErrorHandling("Invalid or expired refresh token", 401));
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshToken) {
      return next(new ErrorHandling("User not found or logged out", 401));
    }

    const { accessToken, refreshToken } = await generateTokens(user._id);
    try {
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });

      return res.status(200).json({
        status: "success",
        message: "Token refreshed successfully",
        accessToken,
      });
    } catch (err) {
      return next(new ErrorHandling("Error while sending response", 500));
    }
  } catch (err) {
    next(err);
  }
};
