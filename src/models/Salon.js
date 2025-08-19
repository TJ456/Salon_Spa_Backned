const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const { createModel } = require("../config/dbSelector");

const facilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  iconUrl: String,
  description: String,
  isActive: {
    type: Boolean,
    default: true,
  },
});

const addressSchema = new mongoose.Schema({
  line1: { type: String, required: true },
  line2: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: "India" },
  latitude: Number,
  longitude: Number,
});

const businessHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
    required: true,
  },
  isOpen: { type: Boolean, default: true },
  openTime: String, // Format: "09:00"
  closeTime: String, // Format: "18:00"
  breakStart: String,
  breakEnd: String,
});

const salonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    facilities: [facilitySchema],
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    address: addressSchema,
    contactInfo: {
      primaryPhone: { type: String, required: true },
      secondaryPhone: String,
      email: { type: String, required: true },
      website: String,
      socialMedia: {
        facebook: String,
        instagram: String,
        twitter: String,
      },
    },
    businessHours: [businessHoursSchema],
    images: {
      logo: String,
      cover: String,
      gallery: [String],
    },
    settings: {
      allowOnlineBooking: { type: Boolean, default: true },
      bookingAdvanceLimit: { type: Number, default: 30 }, // days
      cancellationPolicy: String,
      autoConfirmBookings: { type: Boolean, default: false },
      requireDeposit: { type: Boolean, default: false },
      depositAmount: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
      taxRate: { type: Number, default: 0 }, // percentage
      loyaltyProgram: {
        enabled: { type: Boolean, default: false },
        pointsPerRupee: { type: Number, default: 1 },
        rewardThreshold: { type: Number, default: 100 },
      },
    },
    statistics: {
      totalCustomers: { type: Number, default: 0 },
      totalAppointments: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "inactive"],
      default: "pending",
    },
    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "past_due", "cancelled", "expired"],
      default: "trial",
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    onboardingSteps: {
      basicInfo: { type: Boolean, default: false },
      facilities: { type: Boolean, default: false },
      businessHours: { type: Boolean, default: false },
      services: { type: Boolean, default: false },
      staff: { type: Boolean, default: false },
    },
    metadata: {
      registrationSource: String,
      referralCode: String,
      notes: [String],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
salonSchema.index({ ownerUserId: 1 });
salonSchema.index({ status: 1 });
salonSchema.index({ subscriptionStatus: 1 });
salonSchema.index({ slug: 1 });
salonSchema.index({ "address.city": 1 });
salonSchema.index({ "address.pincode": 1 });
salonSchema.index({ name: "text", description: "text" });

// Virtual for subscription
salonSchema.virtual("subscription", {
  ref: "Subscription",
  localField: "_id",
  foreignField: "tenantId",
  justOne: true,
});

// Virtual for active facilities count
salonSchema.virtual("activeFacilitiesCount").get(function () {
  return this.facilities ? this.facilities.filter((f) => f.isActive).length : 0;
});

// Virtual for total staff count
salonSchema.virtual("totalStaffCount", {
  ref: "Staff",
  localField: "_id",
  foreignField: "tenantId",
  count: true,
});

// Pre-save middleware to generate slug
salonSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug =
      this.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Date.now();
  }
  next();
});

// Instance method to check if salon is operational
salonSchema.methods.isOperational = function () {
  return (
    this.status === "active" &&
    ["trial", "active"].includes(this.subscriptionStatus) &&
    this.onboardingCompleted
  );
};

// Instance method to get current business hours
salonSchema.methods.getTodayHours = function () {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "lowercase",
  });
  return this.businessHours.find((hours) => hours.day === today);
};

// Instance method to check if currently open
salonSchema.methods.isCurrentlyOpen = function () {
  const todayHours = this.getTodayHours();
  if (!todayHours || !todayHours.isOpen) return false;

  const now = new Date();
  const currentTime =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");

  return (
    currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime
  );
};

// Static method to find nearby salons
salonSchema.statics.findNearby = function (lat, lng, maxDistance = 10000) {
  return this.find({
    status: "active",
    "address.latitude": { $exists: true },
    "address.longitude": { $exists: true },
    $expr: {
      $lte: [
        {
          $multiply: [
            6371000, // Earth's radius in meters
            {
              $acos: {
                $add: [
                  {
                    $multiply: [
                      { $sin: { $degreesToRadians: lat } },
                      { $sin: { $degreesToRadians: "$address.latitude" } },
                    ],
                  },
                  {
                    $multiply: [
                      { $cos: { $degreesToRadians: lat } },
                      { $cos: { $degreesToRadians: "$address.latitude" } },
                      {
                        $cos: {
                          $degreesToRadians: {
                            $subtract: [lng, "$address.longitude"],
                          },
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
        maxDistance,
      ],
    },
  });
};

// Plugin
salonSchema.plugin(mongoosePaginate);

module.exports = createModel("Salon", salonSchema);
