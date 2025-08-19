const mongoose = require("mongoose");
const { createModel } = require("../config/dbSelector");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "appointment",
        "booking",
        "payment",
        "staff",
        "inventory",
        "subscription",
        "system",
        "promotion",
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // For storing additional data like appointment ID, etc.
      default: {},
    },
    actionRequired: {
      type: Boolean,
      default: false,
    },
    actionUrl: {
      type: String, // URL to redirect for action
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }, // TTL index for auto-cleanup
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ salonId: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ priority: 1, isRead: 1 });

// Virtual for checking if notification is urgent and unread
notificationSchema.virtual("isUrgentUnread").get(function () {
  return this.priority === "urgent" && !this.isRead;
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to mark multiple notifications as read
notificationSchema.statics.markMultipleAsRead = function (
  notificationIds,
  userId
) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      userId,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({ userId, isRead: false });
};

// Static method to create bulk notifications
notificationSchema.statics.createBulkNotifications = function (notifications) {
  return this.insertMany(notifications);
};

// Pre-save middleware to set expiration if not provided
notificationSchema.pre("save", function (next) {
  if (!this.expiresAt) {
    const expiryDate = new Date();
    // Different expiry times based on priority
    switch (this.priority) {
      case "urgent":
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days
        break;
      case "high":
        expiryDate.setDate(expiryDate.getDate() + 21); // 21 days
        break;
      case "medium":
        expiryDate.setDate(expiryDate.getDate() + 14); // 14 days
        break;
      case "low":
        expiryDate.setDate(expiryDate.getDate() + 7); // 7 days
        break;
      default:
        expiryDate.setDate(expiryDate.getDate() + 14); // 14 days default
    }
    this.expiresAt = expiryDate;
  }
  next();
});

module.exports = createModel("Notification", notificationSchema);
