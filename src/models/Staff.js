const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const staffSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    name: String,
    role: String,
    phone: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

staffSchema.index({ tenantId: 1 });

module.exports = createModel("Staff", staffSchema);
