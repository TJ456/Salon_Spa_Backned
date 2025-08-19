const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const serviceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    name: String,
    description: String,
    price: Number,
    durationMins: Number,
  },
  { timestamps: true }
);

serviceSchema.index({ tenantId: 1 });

module.exports = createModel("Service", serviceSchema);
