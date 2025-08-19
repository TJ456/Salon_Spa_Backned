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
    const query = { salonId, ...filters };
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
        total
      }
    };
  }

  async getCustomerById(customerId, salonId) {
    return await Customer.findOne({ _id: customerId, salonId })
      .populate("appointments")
      .populate("loyalty")
      .populate("walletTransactions")
      .populate("invoices");
  }

  async createCustomer(customerData, salonId) {
    const exists = await Customer.findOne({ $or: [{ email: customerData.email }, { phone: customerData.phone }], salonId });
    if (exists) throw new Error("Customer already exists");
    
    const customer = new Customer({ ...customerData, salonId, createdAt: new Date() });
    await customer.save();
    
    // Initialize wallet and loyalty
    customer.walletBalance = 0;
    customer.loyaltyPoints = 0;
    await customer.save();

    // TODO: Send welcome notification
    return customer;
  }

  async updateCustomer(customerId, updateData, salonId) {
    return await Customer.findOneAndUpdate({ _id: customerId, salonId }, updateData, { new: true });
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
    const pointsEarned = Math.floor(purchaseAmount); // Simple example
    customer.loyaltyPoints += pointsEarned;
    await customer.save();
    return pointsEarned;
  }

  async redeemLoyaltyPoints(customerId, pointsToRedeem, type) {
    const customer = await Customer.findById(customerId);
    if (customer.loyaltyPoints < pointsToRedeem) throw new Error("Insufficient points");

    customer.loyaltyPoints -= pointsToRedeem;
    await customer.save();

    // TODO: Create redemption record
    return { redeemedPoints: pointsToRedeem };
  }

  async updateLoyaltyTier(customerId) {
    const customer = await Customer.findById(customerId);
    // TODO: Calculate tier based on spending or visits
    return customer.loyaltyTier;
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

  async getCustomerAnalytics(salonId, period) {
    // TODO: Generate customer analytics
    return {};
  }

  async segmentCustomers(salonId, criteria) {
    // TODO: Segment customers
    return [];
  }

  async identifyChurnRisk(salonId) {
    // TODO: Detect at-risk customers
    return [];
  }

  async calculateCustomerLifetimeValue(customerId) {
    // TODO: CLV calculation
    return 0;
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
