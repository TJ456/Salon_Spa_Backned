const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const invoiceSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Salon",
    required: true,
  },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  items: [{ name: String, price: Number, qty: Number }],
  total: Number,
  paid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

invoiceSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = createModel("Invoice", invoiceSchema);
