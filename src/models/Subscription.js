const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const subscriptionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    plan: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "past_due", "cancelled", "expired"],
      default: "active",
    },
    amount: Number,
    currency: { type: String, default: "INR" },
    startedAt: Date,
    expiresAt: Date,
    autoRenew: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ tenantId: 1 });

module.exports = createModel("Subscription", subscriptionSchema);
