const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const reviewSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
  },
  { timestamps: true }
);

module.exports = createModel("Review", reviewSchema);
