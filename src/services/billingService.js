// ======================================
// BILLING SERVICE - SERVICE LAYER
// ======================================
const Invoice = require("../models/invoice");
const Appointment = require("../models/appointment");
const Customer = require("../models/customer");
const Service = require("../models/service");
const WalletTransaction = require("../models/walletTransaction");
const Payment = require("../models/payment");

// Utility libraries
const { addDays, format } = require("date-fns");
// PDF generation, email, payment SDKs would go here (placeholders)

class BillingService {
  // ==============================
  // INVOICE RETRIEVAL
  // ==============================
  
  async getInvoices(salonId, filters = {}, page = 1, limit = 10) {
    const query = { tenantId: salonId, ...filters };

    // Add search functionality
    if (filters.search) {
      query.$or = [
        { invoiceNumber: { $regex: filters.search, $options: 'i' } },
        { 'customerId.name': { $regex: filters.search, $options: 'i' } }
      ];
      delete query.search;
    }

    const invoices = await Invoice.find(query)
      .populate("customerId", "name email phone")
      .populate("appointmentId", "scheduledAt")
      .populate("lineItems.serviceId", "name price")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Invoice.countDocuments(query);

    return {
      invoices,
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

  async getInvoiceById(invoiceId, salonId) {
    return await Invoice.findOne({ _id: invoiceId, tenantId: salonId })
      .populate("customerId", "name email phone address")
      .populate("appointmentId", "scheduledAt serviceIds")
      .populate("lineItems.serviceId", "name price description")
      .populate("payments", "amount method status createdAt");
  }

  async createInvoice(invoiceData) {
    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(invoiceData.tenantId);

    // Calculate totals
    const totals = this.calculateInvoiceTotals(invoiceData.lineItems, invoiceData.taxRate || 0, invoiceData.discounts || []);

    const invoice = new Invoice({
      ...invoiceData,
      invoiceNumber,
      ...totals,
      status: "unpaid",
      dueDate: addDays(new Date(), 30), // 30 days payment term
      createdAt: new Date()
    });

    await invoice.save();

    // Auto-populate for return
    await invoice.populate([
      { path: "customerId", select: "name email phone" },
      { path: "lineItems.serviceId", select: "name price" }
    ]);

    return invoice;
  }

  async createInvoiceFromAppointment(appointmentId) {
    const appointment = await Appointment.findById(appointmentId).populate("serviceIds customerId");
    if (!appointment) throw new Error("Appointment not found");

    const lineItems = appointment.serviceIds.map(service => ({
      serviceId: service._id,
      name: service.name,
      price: service.price,
      quantity: 1
    }));

    const invoiceData = {
      salonId: appointment.tenantId,
      customerId: appointment.customerId._id,
      appointmentId: appointment._id,
      lineItems,
      taxRate: 0.18 // example
    };

    return await this.createInvoice(invoiceData);
  }

  async updateInvoice(invoiceId, updateData, salonId) {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: invoiceId, salonId },
      updateData,
      { new: true }
    );
    // TODO: regenerate PDF if needed
    return invoice;
  }

  // ==============================
  // PAYMENT PROCESSING
  // ==============================

  async processPayment(paymentData) {
    const invoice = await Invoice.findById(paymentData.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Calculate total paid amount
    const existingPayments = await Payment.find({ invoiceId: paymentData.invoiceId });
    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0) + paymentData.amount;

    if (totalPaid > invoice.totalAmount) {
      throw new Error("Payment amount exceeds invoice total");
    }

    const payment = new Payment({
      ...paymentData,
      status: "completed",
      processedAt: new Date()
    });
    await payment.save();

    // Update invoice status
    invoice.payments.push(payment._id);
    invoice.paidAmount = totalPaid;
    invoice.status = totalPaid >= invoice.totalAmount ? "paid" : "partial";
    if (invoice.status === "paid") {
      invoice.paidAt = new Date();
    }
    await invoice.save();

    return payment;
  }

  async processPartialPayment(invoiceId, amount, method) {
    return await this.processPayment({ invoiceId, amount, method });
  }

  async processRefund(invoiceId, refundAmount, reason) {
    // Placeholder for refund logic
    return { invoiceId, refundAmount, reason, status: "refunded" };
  }

  async voidInvoice(invoiceId, reason, salonId) {
    return await Invoice.findOneAndUpdate(
      { _id: invoiceId, salonId },
      { status: "void", voidReason: reason },
      { new: true }
    );
  }

  // ==============================
  // CALCULATIONS
  // ==============================

  calculateInvoiceTotals(lineItems, taxRate = 0, discounts = []) {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const discountAmount = discounts.reduce((sum, d) => sum + (d.amount || 0), 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableAmount * taxRate;
    const totalAmount = taxableAmount + taxAmount;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2))
    };
  }

  async generateInvoiceNumber(tenantId) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const count = await Invoice.countDocuments({
      tenantId,
      createdAt: {
        $gte: new Date(year, today.getMonth(), 1),
        $lt: new Date(year, today.getMonth() + 1, 1)
      }
    });

    return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  // ==============================
  // RECURRING BILLING PLACEHOLDER
  // ==============================
  async createRecurringBilling(customerId, billingPlan) {
    // TODO: implement recurring billing logic
    return { customerId, billingPlan, status: "scheduled" };
  }

  async processRecurringBillings() {
    // TODO: process scheduled recurring bills
    return [];
  }

  // ==============================
  // DOCUMENT GENERATION PLACEHOLDER
  // ==============================
  async generateInvoicePDF(invoiceId) {
    // TODO: generate PDF for invoice
    return `PDF for invoice ${invoiceId} generated`;
  }

  async sendInvoiceByEmail(invoiceId, emailOptions) {
    // TODO: integrate email service
    return `Invoice ${invoiceId} sent to ${emailOptions.to}`;
  }

  // ==============================
  // FINANCIAL REPORTING & ANALYTICS
  // ==============================
  async getBillingAnalytics(salonId, startDate = null, endDate = null) {
    const query = { tenantId: salonId };
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const analytics = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalInvoices: { $sum: 1 },
          paidInvoices: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          pendingAmount: { $sum: { $cond: [{ $ne: ["$status", "paid"] }, "$totalAmount", 0] } }
        }
      }
    ]);

    const result = analytics[0] || { totalRevenue: 0, totalInvoices: 0, paidInvoices: 0, pendingAmount: 0 };

    return {
      ...result,
      averageInvoiceValue: result.totalInvoices > 0 ? (result.totalRevenue / result.totalInvoices).toFixed(2) : 0,
      collectionRate: result.totalInvoices > 0 ? ((result.paidInvoices / result.totalInvoices) * 100).toFixed(2) : 0
    };
  }

  async getDailySalesReport(salonId, date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    return await Invoice.find({
      tenantId: salonId,
      createdAt: { $gte: startDate, $lte: endDate }
    })
    .populate("customerId", "name")
    .populate("appointmentId", "scheduledAt")
    .sort({ createdAt: -1 });
  }

  async getMonthlySalesReport(salonId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const monthlyData = await Invoice.aggregate([
      {
        $match: {
          tenantId: salonId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          dailyRevenue: { $sum: "$totalAmount" },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return monthlyData;
  }

  // Tax calculation helper
  calculateTax(amount, taxRate = 0.18) {
    return parseFloat((amount * taxRate).toFixed(2));
  }

  // Payment tracking
  async getPaymentHistory(invoiceId) {
    return await Payment.find({ invoiceId })
      .sort({ createdAt: -1 });
  }

  // Outstanding invoices
  async getOutstandingInvoices(salonId) {
    return await Invoice.find({
      tenantId: salonId,
      status: { $in: ["unpaid", "partial"] },
      dueDate: { $lt: new Date() }
    })
    .populate("customerId", "name email phone")
    .sort({ dueDate: 1 });
  }

  // ==============================
  // EXPORT SERVICE INSTANCE
  // ==============================
}

module.exports = new BillingService();
