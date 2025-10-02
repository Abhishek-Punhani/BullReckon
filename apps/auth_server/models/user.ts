import mongoose, { Document } from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  photo?: string;
  role: "user" | "admin" | "trader" | "premium";
  balance: number;
  lastLogin?: Date;
  refreshToken?: string;
  passwordResetToken?: string;
  googleId?: string;
  authMethod: "password" | "google" | "both";
  isEmailVerified?: boolean;
  apiKey?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasPasswordAuth(): boolean;
}

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: [true, "First name is required"],
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
      required: function (this: IUser) {
        return !this.googleId;
      },
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return !this.googleId;
      },
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
      validate: {
        validator: function (password: string) {
          if (!password) return true; // Skip if no password (Google auth)
          // At least one uppercase, one lowercase, one number
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
        },
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      },
    },
    photo: {
      type: String,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          return validator.isURL(v);
        },
        message: "Photo must be a valid URL",
      },
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin", "trader", "premium"],
        message: "Role must be either user, admin, trader, or premium",
      },
      default: "user",
    },
    balance: {
      type: Number,
      default: 100000, // Starting virtual cash $100k
      min: [0, "Balance cannot be negative"],
      max: [10000000, "Balance cannot exceed $10M"],
    },
    lastLogin: Date,
    refreshToken: {
      type: String,
      default: "",
    },
    passwordResetToken: {
      type: String,
      default: "",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: "",
    },
    authMethod: {
      type: String,
      enum: ["password", "google", "both"],
      default: "password",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    apiKey: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  if (this.password) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error as mongoose.CallbackError);
    }
  }
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPasswordAuth = function (): boolean {
  return this.authMethod === "password" || this.authMethod === "both";
};

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

export const User: mongoose.Model<IUser> =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);
