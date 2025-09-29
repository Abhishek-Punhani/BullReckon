import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateTokens } from "../../../shared/tokens";
import { ErrorHandling } from "../../../middleware/errorHandler";
import {
  sendActivationEmail,
  sendPasswordResetEmail,
} from "../utils/emailUtils";
import { AuthenticatedRequest } from "../../../types/auth";
import { OAuth2Client } from "google-auth-library";
import { Types } from "mongoose";
import { User } from "@repo/models";

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
      isEmailVerified: false,
    };
    if (photo) userData.photo = photo;

    const user = await User.create(userData);
    await sendActivationEmail(user._id, user.email);

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
    // check user is verified
    if (!user.isEmailVerified) {
      return next(
        new ErrorHandling("Please verify your email before logging in", 401)
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
  if (!(req as unknown as AuthenticatedRequest).user) {
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

export const requestActivationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new ErrorHandling("Email is required", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorHandling("User with this email not found", 404));
    }

    if (user.isEmailVerified) {
      return next(new ErrorHandling("Email is already verified", 400));
    }

    await sendActivationEmail(user._id, user.email);

    return res.status(200).json({
      status: "success",
      message: "Activation email sent successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const requestPasswordEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, type } = req.body;
    if (!email) {
      return next(new ErrorHandling("Email is required", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorHandling("User with this email not found", 404));
    }

    if (!user.hasPasswordAuth()) {
      user.authMethod = "both"; // Enable password authentication
      await user.save();
    }
    await sendPasswordResetEmail(user._id, user.email, type);

    return res.status(200).json({
      status: "success",
      message: "Password reset email sent successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;
    if (!token) {
      return next(new ErrorHandling("Activation token is required", 400));
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_EMAIL!);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        return next(new ErrorHandling("Activation token has expired", 400));
      }
      return next(new ErrorHandling("Activation token is incorrect", 400));
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ErrorHandling("User not found", 404));
    }

    if (user.isEmailVerified) {
      return next(new ErrorHandling("Email is already verified", 400));
    }

    user.isEmailVerified = true;
    await user.save();

    return res.status(200).json({
      status: "success",
      message: "Email verified successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { token, newPassword, type } = req.body;
  if (!token || !newPassword) {
    return next(new ErrorHandling("Token and new password are required", 400));
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET_EMAIL!);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ErrorHandling("Activation token has expired", 400));
    }
    return next(new ErrorHandling("Activation token is incorrect", 400));
  }

  const user = await User.findById(decoded.id).select("+password");
  if (!user || !user.password) {
    return next(new ErrorHandling("User not found", 404));
  }

  // Check if user can change password
  if (!user.hasPasswordAuth()) {
    user.AuthMethod = "both"; // Enable password authentication
  }

  user.password = newPassword;
  await user.save();

  return res.status(200).json({
    status: "success",
    message: "Password changed successfully",
    type: type,
  });
};

export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const googleClient = new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  );
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return next(new ErrorHandling("Invalid Google token", 401));
    }
    // console.log("Google payload:", payload);
    const { sub: googleId, email, picture, family_name, given_name } = payload;

    let isNewUser = false;
    let user = await User.findOne({ email });

    if (!user) {
      isNewUser = true;
      user = await User.create({
        googleId,
        email,
        firstName: given_name,
        lastName: family_name,
        photo: picture,
        isEmailVerified: true,
        authMethod: "google",
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.authMethod = "both";
      await user.save();
    }
    const { accessToken, refreshToken } = await generateTokens(
      user._id as Types.ObjectId
    );
    if (!user) {
      return next(new ErrorHandling("User not found after registration", 500));
    }

    try {
      res.setHeader(
        "Set-Cookie",
        `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=${
          7 * 24 * 60 * 60
        }; SameSite=Strict;${
          process.env.NODE_ENV === "production" ? " Secure;" : ""
        }`
      );
    } catch (error) {
      console.error("Error setting cookie:", error);
      return next(new ErrorHandling("Error while setting cookie", 500));
    }

    return res.json({
      accessToken,
      isNewUser,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        email: user.email,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return next(new ErrorHandling("Authentication failed", 401));
  }
};
