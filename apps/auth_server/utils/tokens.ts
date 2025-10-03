import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { User } from "../models/user";

export const generateAccessToken = (user: any) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET_ACCESS!,
    {
      expiresIn: "1d",
    }
  );
};
export const generateRefreshToken = (user: any) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET_REFRESH!,
    {
      expiresIn: "7d",
    }
  );
};

export const generateTokens = async (user_id: mongoose.Types.ObjectId) => {
  const user = await User.findById(user_id);
  if (!user) throw new Error("User not found");

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { accessToken, refreshToken };
};
