const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const walletTransactionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: Number,
    description: String,
  },
  { timestamps: true }
);

module.exports = createModel("WalletTransaction", walletTransactionSchema);
