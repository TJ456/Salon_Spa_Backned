// ===================================
// ANALYTICS SERVICE - SERVICE LAYER
// ===================================
// Revenue analytics, appointment trends, customer behavior, staff metrics, business insights

const Appointment = require("../models/appointment");
const Invoice = require("../models/invoice");
const Customer = require("../models/customer");
const Staff = require("../models/staff");
const Salon = require("../models/salon");
const Service = require("../models/service");
const WalletTransaction = require("../models/walletTransaction");

const { startOfDay, endOfDay, addDays, subDays } = require("date-fns");

class AnalyticsService {
  // ==============================
  // REVENUE ANALYTICS
  // ==============================

  async getDashboardRevenue(salonId, startDate = null, endDate = null) {
    const query = { tenantId: salonId };
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Get revenue from both invoices and completed appointments
    const invoiceRevenue = await Invoice.aggregate([
      { $match: query },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
    ]);

    const appointmentRevenue = await Appointment.aggregate([
      { $match: { tenantId: salonId, status: "completed", ...query } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
    ]);

    const dailyRevenue = await Appointment.aggregate([
      { $match: { tenantId: salonId, status: "completed", ...query } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledAt" } },
          revenue: { $sum: "$totalAmount" },
          appointments: { $sum: 1 }
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      totalRevenue: (invoiceRevenue[0]?.totalRevenue || 0) + (appointmentRevenue[0]?.totalRevenue || 0),
      dailyRevenue,
      averageDailyRevenue: dailyRevenue.length > 0 ?
        dailyRevenue.reduce((sum, day) => sum + day.revenue, 0) / dailyRevenue.length : 0
    };
  }

  async getRevenueByService(salonId, startDate = null, endDate = null) {
    const query = { tenantId: salonId, status: "completed" };
    if (startDate && endDate) query.scheduledAt = { $gte: startDate, $lte: endDate };

    const revenueByService = await Appointment.aggregate([
      { $match: query },
      { $unwind: "$serviceIds" },
      { $group: { _id: "$serviceIds", totalRevenue: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" } },
      { $unwind: "$service" },
      { $project: {
        serviceName: "$service.name",
        totalRevenue: 1,
        count: 1,
        averageRevenue: { $divide: ["$totalRevenue", "$count"] }
      }},
      { $sort: { totalRevenue: -1 } },
    ]);

    return revenueByService;
  }

  async getRevenueByStaff(salonId, startDate = null, endDate = null) {
    const query = { salonId };
    if (startDate && endDate) query.createdAt = { $gte: startDate, $lte: endDate };

    const revenueByStaff = await Appointment.aggregate([
      { $match: query },
      { $group: { _id: "$staffId", totalRevenue: { $sum: "$totalAmount" }, appointments: { $sum: 1 } } },
      { $lookup: { from: "staffs", localField: "_id", foreignField: "_id", as: "staff" } },
      { $unwind: "$staff" },
      { $project: { staffName: "$staff.name", totalRevenue: 1, appointments: 1 } },
      { $sort: { totalRevenue: -1 } },
    ]);

    return revenueByStaff;
  }

  // ==============================
  // APPOINTMENT ANALYTICS
  // ==============================

  async getAppointmentTrends(salonId, startDate = null, endDate = null) {
    const query = { tenantId: salonId };
    if (startDate && endDate) query.scheduledAt = { $gte: startDate, $lte: endDate };

    const totalAppointments = await Appointment.countDocuments(query);
    const completed = await Appointment.countDocuments({ ...query, status: "completed" });
    const cancelled = await Appointment.countDocuments({ ...query, status: "cancelled" });
    const noShows = await Appointment.countDocuments({ ...query, status: "no-show" });

    // Daily trends
    const dailyTrends = await Appointment.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledAt" } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      totalAppointments,
      completed,
      cancelled,
      noShows,
      completionRate: totalAppointments > 0 ? ((completed / totalAppointments) * 100).toFixed(2) : 0,
      cancellationRate: totalAppointments > 0 ? ((cancelled / totalAppointments) * 100).toFixed(2) : 0,
      dailyTrends
    };
  }

  async getServicePopularity(salonId, startDate = null, endDate = null) {
    const query = { salonId };
    if (startDate && endDate) query.scheduledAt = { $gte: startDate, $lte: endDate };

    const services = await Appointment.aggregate([
      { $match: query },
      { $unwind: "$serviceIds" },
      { $group: { _id: "$serviceIds", count: { $sum: 1 } } },
      { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" } },
      { $unwind: "$service" },
      { $project: { serviceName: "$service.name", count: 1 } },
      { $sort: { count: -1 } },
    ]);

    return services;
  }

  // ==============================
  // CUSTOMER ANALYTICS
  // ==============================

  async getCustomerRetentionMetrics(salonId) {
    const totalCustomers = await Customer.countDocuments({ tenantId: salonId });
    const returningCustomers = await Appointment.distinct("customerId", { tenantId: salonId });

    // New vs returning customers
    const newCustomers = await Appointment.aggregate([
      { $match: { tenantId: salonId } },
      { $group: { _id: "$customerId", firstVisit: { $min: "$scheduledAt" }, visits: { $sum: 1 } } },
      { $match: { visits: 1 } }
    ]);

    return {
      totalCustomers,
      returningCustomers: returningCustomers.length,
      newCustomers: newCustomers.length,
      retentionRate: totalCustomers > 0 ? ((returningCustomers.length / totalCustomers) * 100).toFixed(2) : 0,
    };
  }

  async getCustomerVisitFrequency(salonId) {
    const visits = await Appointment.aggregate([
      { $match: { tenantId: salonId, status: "completed" } },
      { $group: { _id: "$customerId", visits: { $sum: 1 }, totalSpent: { $sum: "$totalAmount" } } },
      { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "customer" } },
      { $unwind: "$customer" },
      { $project: { customerName: "$customer.name", visits: 1, totalSpent: 1, averageSpent: { $divide: ["$totalSpent", "$visits"] } } },
      { $sort: { visits: -1 } },
    ]);

    return visits;
  }

  // ==============================
  // STAFF PERFORMANCE ANALYTICS
  // ==============================

  async getStaffProductivity(salonId) {
    const productivity = await Appointment.aggregate([
      { $match: { salonId, status: "completed" } },
      { $group: { _id: "$staffId", completedAppointments: { $sum: 1 } } },
      { $lookup: { from: "staffs", localField: "_id", foreignField: "_id", as: "staff" } },
      { $unwind: "$staff" },
      { $project: { staffName: "$staff.name", completedAppointments: 1 } },
    ]);

    return productivity;
  }

  async getStaffEfficiencyMetrics(salonId) {
    const efficiency = await Appointment.aggregate([
      { $match: { tenantId: salonId, status: "completed" } },
      {
        $group: {
          _id: "$staffId",
          totalAppointments: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          avgDuration: { $avg: "$duration" }
        }
      },
      { $lookup: { from: "staff", localField: "_id", foreignField: "_id", as: "staff" } },
      { $unwind: "$staff" },
      {
        $project: {
          staffName: "$staff.name",
          totalAppointments: 1,
          totalRevenue: 1,
          avgDuration: 1,
          revenuePerAppointment: { $divide: ["$totalRevenue", "$totalAppointments"] }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    return efficiency;
  }

  // ==============================
  // BUSINESS INTELLIGENCE
  // ==============================

  async getBusinessInsights(salonId, period = 30) {
    const endDate = new Date();
    const startDate = subDays(endDate, period);

    const [revenue, trends, retention, topServices] = await Promise.all([
      this.getDashboardRevenue(salonId, startDate, endDate),
      this.getAppointmentTrends(salonId, startDate, endDate),
      this.getCustomerRetentionMetrics(salonId),
      this.getServicePopularity(salonId, startDate, endDate)
    ]);

    return {
      period: `${period} days`,
      revenue,
      trends,
      retention,
      topServices: topServices.slice(0, 5),
      insights: {
        growthRate: revenue.dailyRevenue.length > 1 ?
          ((revenue.dailyRevenue[revenue.dailyRevenue.length - 1]?.revenue || 0) -
           (revenue.dailyRevenue[0]?.revenue || 0)) / (revenue.dailyRevenue[0]?.revenue || 1) * 100 : 0,
        busyDays: revenue.dailyRevenue.sort((a, b) => b.appointments - a.appointments).slice(0, 3)
      }
    };
  }

  // ==============================
  // REPORT GENERATION
  // ==============================

  async generateDashboardData(salonId) {
    const revenue = await this.getDashboardRevenue(salonId);
    const trends = await this.getAppointmentTrends(salonId);
    const topServices = await this.getServicePopularity(salonId);
    const customerMetrics = await this.getCustomerRetentionMetrics(salonId);

    return { revenue, trends, topServices, customerMetrics };
  }

  async generateCustomReport(salonId, reportType, filters = {}) {
    const { startDate, endDate } = filters;

    switch (reportType) {
      case 'revenue':
        return await this.getDashboardRevenue(salonId, startDate, endDate);
      case 'appointments':
        return await this.getAppointmentTrends(salonId, startDate, endDate);
      case 'customers':
        return await this.getCustomerVisitFrequency(salonId);
      case 'staff':
        return await this.getStaffEfficiencyMetrics(salonId);
      default:
        return await this.getBusinessInsights(salonId);
    }
  }
}

// Export service instance
module.exports = new AnalyticsService();
