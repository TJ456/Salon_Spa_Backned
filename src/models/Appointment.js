const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const appointmentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Salon",
    required: true,
  },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
  scheduledAt: Date,
  status: {
    type: String,
    enum: ["booked", "completed", "cancelled"],
    default: "booked",
  },
  createdAt: { type: Date, default: Date.now },
});

appointmentSchema.index({ tenantId: 1, scheduledAt: 1 });

module.exports = createModel("Appointment", appointmentSchema);
