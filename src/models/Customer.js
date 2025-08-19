const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const customerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    email: String,
    phone: String,
    preferences: { favoriteServices: [String] },
    walletBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    totalVisits: { type: Number, default: 0 },
    lastVisitedAt: Date,
  },
  { timestamps: true }
);

customerSchema.index({ email: 1 });

module.exports = createModel("Customer", customerSchema);
