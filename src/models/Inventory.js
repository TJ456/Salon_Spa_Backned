const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const inventorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    name: String,
    sku: String,
    quantity: Number,
    price: Number,
  },
  { timestamps: true }
);

inventorySchema.index({ tenantId: 1 });

module.exports = createModel("Inventory", inventorySchema);
