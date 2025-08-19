// ==========================================
// NOTIFICATION SERVICE - SERVICE LAYER
// ==========================================

const Notification = require("../models/notification");
const User = require("../models/user");
const NotificationTemplate = require("../models/notificationTemplate");
const NotificationSubscription = require("../models/notificationSubscription");
const Appointment = require("../models/appointment");

// Third-party services (stubbed placeholders)
const EmailService = require("../services/emailService"); // e.g., SendGrid/Nodemailer
const SMSService = require("../services/smsService"); // e.g., Twilio
const PushService = require("../services/pushService"); // e.g., Firebase FCM
const WebSocketService = require("../services/webSocketService"); // real-time notifications

// Utilities
const { format, addHours, subHours } = require("date-fns");

class NotificationService {
  // ==============================
  // CORE NOTIFICATION MANAGEMENT
  // ==============================

  async getUserNotifications(userId, filters = {}, page = 1, limit = 10) {
    const query = { userId, ...filters };
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Notification.countDocuments(query);

    return {
      notifications,
      meta: { page, limit, totalPages: Math.ceil(total / limit), total },
    };
  }

  async getSalonNotifications(salonId, filters = {}, page = 1, limit = 10) {
    const query = { salonId, ...filters };
    const notifications = await Notification.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Notification.countDocuments(query);

    return {
      notifications,
      meta: { page, limit, totalPages: Math.ceil(total / limit), total },
    };
  }

  async createNotification(data) {
    const notification = new Notification({
      ...data,
      createdAt: new Date(),
      status: "pending",
    });
    await notification.save();

    // Trigger delivery immediately
    await this.sendNotification(notification);
    return notification;
  }

  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true, readAt: new Date() },
      { new: true }
    );
  }

  // ==============================
  // MULTI-CHANNEL DELIVERY
  // ==============================

  async sendNotification(notification) {
    try {
      if (notification.channels.includes("email")) {
        await this.sendEmailNotification(notification);
      }
      if (notification.channels.includes("sms")) {
        await this.sendSMSNotification(notification);
      }
      if (notification.channels.includes("push")) {
        await this.sendPushNotification(notification);
      }
      if (notification.channels.includes("in-app")) {
        await this.sendInAppNotification(notification.userId, notification);
      }

      notification.status = "sent";
      notification.sentAt = new Date();
      await notification.save();
    } catch (err) {
      console.error("Notification send failed:", err);
      notification.status = "failed";
      await notification.save();
    }
  }

  async sendEmailNotification(notification) {
    // Render template and send
    const template = await NotificationTemplate.findById(notification.templateId);
    const html = this.renderTemplate(template, notification.data);
    return EmailService.send(notification.recipientEmail, template.subject, html);
  }

  async sendSMSNotification(notification) {
    const message = notification.data?.message || notification.title;
    return SMSService.send(notification.recipientPhone, message);
  }

  async sendPushNotification(notification) {
    return PushService.send(notification.deviceTokens, notification.data);
  }

  async sendInAppNotification(userId, notificationData) {
    return WebSocketService.send(userId, notificationData);
  }

  // ==============================
  // AUTOMATED WORKFLOWS
  // ==============================

  async sendAppointmentReminders() {
    const upcoming = await Appointment.find({
      scheduledAt: { $gte: new Date(), $lte: addHours(new Date(), 24) },
      status: "booked",
    });

    for (const appt of upcoming) {
      const notification = new Notification({
        userId: appt.customerId,
        title: "Appointment Reminder",
        data: { appointmentId: appt._id, scheduledAt: appt.scheduledAt },
        channels: ["email", "sms", "in-app"],
      });
      await this.sendNotification(notification);
    }
  }

  async sendSubscriptionRenewalNotifications() {
    // Implementation: fetch expiring subscriptions and send notifications
  }

  async sendPaymentNotifications(paymentData, type) {
    // Implementation: send payment confirmation or failure alerts
  }

  async sendStaffNotifications(salonId, type, data) {
    // Implementation: fetch staff list and send role-specific notifications
  }

  // ==============================
  // TEMPLATE AND PERSONALIZATION
  // ==============================

  async createNotificationTemplate(data) {
    const template = new NotificationTemplate(data);
    return template.save();
  }

  renderTemplate(template, data) {
    // Simple placeholder rendering, can integrate Handlebars/EJS
    let output = template.body;
    for (const key in data) {
      const regex = new RegExp(`{{${key}}}`, "g");
      output = output.replace(regex, data[key]);
    }
    return output;
  }

  async personalizeNotificationContent(userId, baseContent, context) {
    const user = await User.findById(userId);
    return baseContent.replace("{{userName}}", user.name || "Guest");
  }

  // ==============================
  // PREFERENCES AND SUBSCRIPTIONS
  // ==============================

  async updateNotificationPreferences(userId, preferences) {
    const user = await User.findById(userId);
    user.notificationPreferences = preferences;
    return user.save();
  }

  async manageNotificationSubscriptions(userId, subscriptionData) {
    const subscription = new NotificationSubscription({ userId, ...subscriptionData });
    return subscription.save();
  }

  // ==============================
  // ANALYTICS
  // ==============================

  async getNotificationAnalytics(salonId, period = {}) {
    const query = { salonId };
    if (period.start && period.end) query.createdAt = { $gte: period.start, $lte: period.end };
    const total = await Notification.countDocuments(query);
    const sent = await Notification.countDocuments({ ...query, status: "sent" });
    const failed = await Notification.countDocuments({ ...query, status: "failed" });
    return { total, sent, failed, deliveryRate: total ? (sent / total) * 100 : 0 };
  }

  async trackNotificationEngagement(notificationId, engagementType, data) {
    const notification = await Notification.findById(notificationId);
    notification.engagement = notification.engagement || [];
    notification.engagement.push({ type: engagementType, data, timestamp: new Date() });
    return notification.save();
  }

  // ==============================
  // REAL-TIME SYSTEM
  // ==============================

  async initializeWebSocketConnection(userId, connectionData) {
    return WebSocketService.connect(userId, connectionData);
  }

  async broadcastNotification(recipients, notificationData) {
    for (const userId of recipients) {
      await this.sendInAppNotification(userId, notificationData);
    }
  }
}

// Export singleton instance
module.exports = new NotificationService();
