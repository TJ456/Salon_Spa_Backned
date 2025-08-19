const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const loyaltySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    points: { type: Number, default: 0 },
    tier: String,
    milestones: [String],
  },
  { timestamps: true }
);

loyaltySchema.index({ tenantId: 1 });

module.exports = createModel("Loyalty", loyaltySchema);
