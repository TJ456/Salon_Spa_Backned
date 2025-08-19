// ======================================
// CUSTOMER SERVICE - SERVICE LAYER
// ======================================

const Customer = require("../models/customer");
const WalletTransaction = require("../models/walletTransaction");
const Loyalty = require("../models/loyalty");
const Appointment = require("../models/appointment");
const Invoice = require("../models/invoice");
const Review = require("../models/review");
const User = require("../models/user");

// Utilities
const { format } = require("date-fns");
// Email/SMS and analytics libraries would go here

class CustomerService {
  // ==================================
  // CUSTOMER PROFILE MANAGEMENT
  // ==================================
  
  async getCustomers(salonId, filters = {}, page = 1, limit = 10) {
    const query = { tenantId: salonId, ...filters };

    // Add search functionality
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } }
      ];
      delete query.search;
    }

    const customers = await Customer.find(query)
      .sort({ lastVisit: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Customer.countDocuments(query);

    return {
      customers,
      meta: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    };
  }

  async getCustomerById(customerId, salonId) {
    return await Customer.findOne({ _id: customerId, tenantId: salonId });
  }

  async createCustomer(customerData, salonId) {
    const exists = await Customer.findOne({
      $or: [{ email: customerData.email }, { phone: customerData.phone }],
      tenantId: salonId
    });
    if (exists) throw new Error("Customer already exists");

    const customer = new Customer({
      ...customerData,
      tenantId: salonId,
      walletBalance: 0,
      loyaltyPoints: 0,
      totalVisits: 0,
      totalSpent: 0,
      createdAt: new Date()
    });
    await customer.save();

    return customer;
  }

  async updateCustomer(customerId, updateData, salonId) {
    return await Customer.findOneAndUpdate(
      { _id: customerId, tenantId: salonId },
      updateData,
      { new: true }
    );
  }

  async deleteCustomer(customerId, salonId) {
    return await Customer.findOneAndDelete({ _id: customerId, tenantId: salonId });
  }

  // ==================================
  // WALLET MANAGEMENT
  // ==================================

  async credit(userId, amount, description, metadata = {}) {
    const customer = await Customer.findById(userId);
    if (!customer) throw new Error("Customer not found");

    customer.walletBalance += amount;
    await customer.save();

    const transaction = new WalletTransaction({ userId, type: "credit", amount, description, metadata, createdAt: new Date() });
    await transaction.save();
    return transaction;
  }

  async debit(userId, amount, description, metadata = {}) {
    const customer = await Customer.findById(userId);
    if (!customer) throw new Error("Customer not found");
    if (customer.walletBalance < amount) throw new Error("Insufficient balance");

    customer.walletBalance -= amount;
    await customer.save();

    const transaction = new WalletTransaction({ userId, type: "debit", amount, description, metadata, createdAt: new Date() });
    await transaction.save();
    return transaction;
  }

  async getWalletBalance(userId) {
    const customer = await Customer.findById(userId);
    return { balance: customer.walletBalance };
  }

  async getWalletTransactionHistory(userId, filters = {}, page = 1, limit = 10) {
    const query = { userId, ...filters };
    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await WalletTransaction.countDocuments(query);
    return { transactions, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
  }

  // ==================================
  // LOYALTY PROGRAM MANAGEMENT
  // ==================================

  async calculateLoyaltyPoints(customerId, purchaseAmount) {
    const customer = await Customer.findById(customerId);
    const pointsEarned = Math.floor(purchaseAmount / 10); // 1 point per $10 spent
    customer.loyaltyPoints += pointsEarned;
    customer.totalSpent = (customer.totalSpent || 0) + purchaseAmount;

    // Update loyalty tier
    await this.updateLoyaltyTier(customerId);
    await customer.save();

    return pointsEarned;
  }

  async redeemLoyaltyPoints(customerId, pointsToRedeem, rewardType = 'discount') {
    const customer = await Customer.findById(customerId);
    if (customer.loyaltyPoints < pointsToRedeem) throw new Error("Insufficient points");

    customer.loyaltyPoints -= pointsToRedeem;
    await customer.save();

    // Create redemption record
    const redemption = new WalletTransaction({
      userId: customerId,
      type: 'loyalty_redemption',
      amount: pointsToRedeem,
      description: `Redeemed ${pointsToRedeem} points for ${rewardType}`,
      metadata: { rewardType, pointsRedeemed: pointsToRedeem }
    });
    await redemption.save();

    return { redeemedPoints: pointsToRedeem, rewardType };
  }

  async updateLoyaltyTier(customerId) {
    const customer = await Customer.findById(customerId);
    const totalSpent = customer.totalSpent || 0;

    let newTier = 'Bronze';
    if (totalSpent >= 1000) newTier = 'Gold';
    else if (totalSpent >= 500) newTier = 'Silver';

    customer.loyaltyTier = newTier;
    await customer.save();
    return newTier;
  }

  async getLoyaltyStatus(customerId) {
    const customer = await Customer.findById(customerId);
    return { tier: customer.loyaltyTier, points: customer.loyaltyPoints };
  }

  // ==================================
  // CUSTOMER VISIT & BEHAVIOR TRACKING
  // ==================================

  async recordCustomerVisit(customerId, salonId, visitData) {
    const customer = await Customer.findById(customerId);
    customer.lastVisit = new Date();
    customer.totalVisits = (customer.totalVisits || 0) + 1;
    await customer.save();

    const appointment = new Appointment({ customerId, salonId, ...visitData });
    await appointment.save();
    return appointment;
  }

  async getCustomerVisitHistory(customerId, salonId) {
    return await Appointment.find({ customerId, salonId }).sort({ scheduledAt: -1 });
  }

  async analyzeCustomerBehavior(customerId, salonId) {
    // TODO: Predict trends, preferences, upsell opportunities
    return { recommendedServices: [] };
  }

  async getCustomerPreferences(customerId, salonId) {
    const customer = await Customer.findById(customerId);
    return customer.preferences || {};
  }

  // ==================================
  // CUSTOMER COMMUNICATION
  // ==================================

  async sendCustomerNotification(customerId, type, data) {
    // TODO: Integrate email/SMS/push
    return { status: "sent", customerId, type };
  }

  async sendBirthdayGreetings(customerId) {
    // TODO: Send birthday message
    return { status: "sent", customerId };
  }

  async sendAppointmentReminders(customerId, appointmentId) {
    // TODO: Send reminder
    return { status: "sent", customerId, appointmentId };
  }

  async sendPromotionalOffers(customerId, offerData) {
    // TODO: Send offers
    return { status: "sent", customerId, offer: offerData };
  }

  // ==================================
  // CUSTOMER ANALYTICS & SEGMENTATION
  // ==================================

  async getCustomerAnalytics(salonId, startDate = null, endDate = null) {
    const query = { tenantId: salonId };
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const analytics = await Customer.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          avgTotalSpent: { $avg: "$totalSpent" },
          avgVisits: { $avg: "$totalVisits" },
          avgLoyaltyPoints: { $avg: "$loyaltyPoints" }
        }
      }
    ]);

    const tierDistribution = await Customer.aggregate([
      { $match: query },
      { $group: { _id: "$loyaltyTier", count: { $sum: 1 } } }
    ]);

    return {
      summary: analytics[0] || { totalCustomers: 0, avgTotalSpent: 0, avgVisits: 0, avgLoyaltyPoints: 0 },
      tierDistribution
    };
  }

  async segmentCustomers(salonId, criteria = 'spending') {
    const query = { tenantId: salonId };

    switch (criteria) {
      case 'spending':
        return await Customer.find(query).sort({ totalSpent: -1 });
      case 'visits':
        return await Customer.find(query).sort({ totalVisits: -1 });
      case 'loyalty':
        return await Customer.find(query).sort({ loyaltyPoints: -1 });
      default:
        return await Customer.find(query);
    }
  }

  async identifyChurnRisk(salonId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await Customer.find({
      tenantId: salonId,
      lastVisit: { $lt: thirtyDaysAgo },
      totalVisits: { $gte: 2 }
    }).sort({ lastVisit: 1 });
  }

  async calculateCustomerLifetimeValue(customerId) {
    const customer = await Customer.findById(customerId);
    if (!customer) return 0;

    const appointments = await Appointment.find({
      customerId,
      status: 'completed'
    });

    const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
    const avgOrderValue = totalRevenue / (appointments.length || 1);
    const visitFrequency = appointments.length / 12; // visits per month

    return parseFloat((avgOrderValue * visitFrequency * 24).toFixed(2)); // 2-year CLV
  }

  // ==================================
  // CUSTOMER FEEDBACK & REVIEWS
  // ==================================

  async collectCustomerFeedback(customerId, appointmentId, feedbackData) {
    const review = new Review({ customerId, appointmentId, ...feedbackData });
    await review.save();
    return review;
  }

  async manageCustomerReviews(salonId) {
    return await Review.find({ salonId }).sort({ createdAt: -1 });
  }

  async generateSatisfactionReports(salonId, period) {
    // TODO: Compile satisfaction report
    return {};
  }

  // ==================================
  // CUSTOMER SUPPORT
  // ==================================

  async createSupportTicket(customerId, issueData) {
    // TODO: create ticket
    return { customerId, ticket: issueData };
  }

  async handleCustomerComplaints(customerId, complaintData) {
    // TODO: handle complaints
    return { customerId, complaint: complaintData };
  }

  async provideCustomerService(customerId, serviceType, serviceData) {
    // TODO: provide service
    return { customerId, serviceType };
  }

  // ==================================
  // DATA EXPORT & INTEGRATION
  // ==================================

  async exportCustomerData(salonId, options) {
    // TODO: export CSV/Excel/JSON
    return { status: "exported", salonId };
  }

  async importCustomerData(salonId, importData, options) {
    // TODO: import and merge
    return { status: "imported", salonId };
  }

  async syncWithCRM(salonId, crmSystem) {
    // TODO: integrate with external CRM
    return { status: "synced", salonId };
  }

  // ==================================
  // PRIVACY & COMPLIANCE
  // ==================================

  async handleDataPrivacyRequests(customerId, requestType) {
    // TODO: GDPR/CCPA handling
    return { status: "processed", customerId };
  }

  async anonymizeCustomerData(customerId, level) {
    // TODO: anonymization
    return { status: "anonymized", customerId };
  }
}

// ========================================
// EXPORT SERVICE INSTANCE
// ========================================
module.exports = new CustomerService();
