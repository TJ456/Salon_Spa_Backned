const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { createModel } = require("../config/dbSelector");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "salon_admin", "staff", "customer"],
      default: "customer",
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
    },
    profileImage: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    permissions: [
      {
        type: String,
        enum: [
          "dashboard",
          "appointments",
          "billing",
          "staff",
          "customers",
          "inventory",
          "settings",
          "analytics",
        ],
      },
    ],
    preferences: {
      language: {
        type: String,
        default: "en",
      },
      timezone: {
        type: String,
        default: "UTC",
      },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        return ret;
      },
    },
  }
);


userSchema.index({ email: 1 });
userSchema.index({ tenantId: 1 });
userSchema.index({ role: 1 });

userSchema.virtual("fullPermissions").get(function () {
  const rolePermissions = {
    super_admin: [
      "dashboard",
      "analytics",
      "tenants",
      "subscriptions",
      "system",
    ],
    salon_admin: [
      "dashboard",
      "appointments",
      "billing",
      "staff",
      "customers",
      "inventory",
      "settings",
      "analytics",
    ],
    staff: ["appointments", "customers", "billing"],
    customer: ["profile", "appointments", "wallet"],
  };

  return [...(rolePermissions[this.role] || []), ...(this.permissions || [])];
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to generate JWT payload
userSchema.methods.getJWTPayload = function () {
  return {
    id: this._id,
    email: this.email,
    role: this.role,
    tenantId: this.tenantId,
    permissions: this.fullPermissions,
  };
};

userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({
    email: email.toLowerCase(),
    isActive: true,
  });

  if (!user) {
    throw new Error("Invalid login credentials");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid login credentials");
  }

  return user;
};

module.exports = createModel("User", userSchema);
