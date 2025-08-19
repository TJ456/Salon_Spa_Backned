// ======================================
// APPOINTMENT SERVICE - SERVICE LAYER
// ======================================
const Appointment = require("../models/appointment");
const Staff = require("../models/staff");
const Customer = require("../models/customer");
const Service = require("../models/service");
//in notifiction Currently it just console.log(). Later you could integrate SMS, email, or push notifications.
// Utility for date/time handling
const { addMinutes, format, startOfDay, endOfDay, subHours, subDays } = require("date-fns");

class AppointmentService {
  // ==============================
  // APPOINTMENT RETRIEVAL
  // ==============================
  
  async getAppointments(salonId, filters = {}, page = 1, limit = 10, search = null) {
    const query = { tenantId: salonId, ...filters };

    // Add search functionality
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { notes: searchRegex },
        { internalNotes: searchRegex },
        { cancelReason: searchRegex }
      ];
    }

    const appointments = await Appointment.find(query)
      .populate("customerId", "name email phone")
      .populate("staffId", "name email specialties")
      .populate("serviceIds", "name duration price")
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .sort({ scheduledAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Appointment.countDocuments(query);

    return {
      appointments,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      },
    };
  }

  async getAppointmentById(appointmentId, salonId) {
    return await Appointment.findOne({ _id: appointmentId, tenantId: salonId })
      .populate("customerId")
      .populate("staffId")
      .populate("serviceIds");
  }

  async getAppointmentsByDateRange(salonId, startDate, endDate) {
    return await Appointment.find({
      tenantId: salonId,
      scheduledAt: { $gte: startDate, $lte: endDate },
    })
      .populate("customerId")
      .populate("staffId")
      .populate("serviceIds")
      .sort({ scheduledAt: 1 });
  }

  async getTodaysAppointments(salonId) {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));
    return this.getAppointmentsByDateRange(salonId, start, end);
  }

  // ==============================
  // APPOINTMENT CREATION
  // ==============================
  
  async createAppointment(data) {
    // Check staff availability
    const available = await this.checkStaffAvailability(
      data.staffId,
      data.scheduledAt,
      data.duration || 60
    );
    if (!available) throw new Error("Staff not available at this time.");

    // Create appointment
    const appointment = new Appointment({
      ...data,
      status: "booked",
    });

    await appointment.save();
    this.sendNotification(appointment, "Appointment confirmed!");
    return appointment;
  }

  async updateAppointment(appointmentId, updateData, salonId) {
    if (updateData.scheduledAt && updateData.staffId) {
      const available = await this.checkStaffAvailability(
        updateData.staffId,
        updateData.scheduledAt,
        updateData.duration || 60,
        appointmentId
      );
      if (!available) throw new Error("Staff not available at this time.");
    }
    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, tenantId: salonId },
      updateData,
      { new: true }
    );
    this.sendNotification(appointment, "Appointment updated!");
    return appointment;
  }

  async updateAppointmentStatus(appointmentId, status, salonId) {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, tenantId: salonId },
      { status },
      { new: true }
    );
    this.sendNotification(appointment, `Status updated to ${status}`);
    return appointment;
  }

  async cancelAppointment(appointmentId, reason, salonId) {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, tenantId: salonId },
      { status: "cancelled", cancelReason: reason },
      { new: true }
    );
    this.sendNotification(appointment, `Appointment cancelled: ${reason}`);
    return appointment;
  }

  async deleteAppointment(appointmentId, salonId) {
    return await Appointment.findOneAndDelete({ _id: appointmentId, tenantId: salonId });
  }

  async handleNoShow(appointmentId, salonId) {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, tenantId: salonId },
      { status: "no-show" },
      { new: true }
    );
    this.sendNotification(appointment, "Customer no-show");
    return appointment;
  }

  // ==============================
  // STAFF AVAILABILITY
  // ==============================
  
  async checkStaffAvailability(staffId, scheduledAt, duration = 60, excludeAppointmentId = null) {
    const start = new Date(scheduledAt);
    const end = addMinutes(start, duration);

    const overlapping = await Appointment.findOne({
      staffId,
      _id: { $ne: excludeAppointmentId },
      scheduledAt: { $lt: end, $gte: start },
      status: { $in: ["booked", "in-progress"] },
    });

    return !overlapping;
  }

  async getAvailableTimeSlots(salonId, date, serviceDuration = 60, staffId = null) {
    const staffQuery = { tenantId: salonId };
    if (staffId) staffQuery._id = staffId;

    const staffList = await Staff.find(staffQuery);
    const slots = [];

    for (const staff of staffList) {
      let current = new Date(date);
      current.setHours(9, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(18, 0, 0, 0);

      while (current < endOfDay) {
        const available = await this.checkStaffAvailability(staff._id, current, serviceDuration);
        if (available) {
          slots.push({
            staffId: staff._id,
            staffName: staff.name,
            time: new Date(current)
          });
        }
        current = addMinutes(current, 30);
      }
    }
    return slots;
  }

  // Calendar view for appointments
  async getCalendarView(salonId, startDate, endDate, staffId = null) {
    const query = {
      tenantId: salonId,
      scheduledAt: { $gte: startDate, $lte: endDate }
    };
    if (staffId) query.staffId = staffId;

    return await Appointment.find(query)
      .populate("customerId", "name")
      .populate("staffId", "name")
      .populate("serviceIds", "name duration")
      .sort({ scheduledAt: 1 });
  }

  // Staff schedule for a specific date
  async getStaffSchedule(staffId, date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return await Appointment.find({
      staffId,
      scheduledAt: { $gte: start, $lte: end },
      status: { $nin: ['cancelled', 'no-show'] }
    }).sort({ scheduledAt: 1 });
  }

  // ==============================
  // NOTIFICATIONS
  // ==============================
  
  async sendNotification(appointment, message) {
    console.log(`Notification: ${message} for appointment ${appointment._id}`);

    // Schedule reminders for new appointments
    if (message.includes('confirmed')) {
      await this.scheduleReminders(appointment);
    }
  }

  async scheduleReminders(appointment) {
    try {
      const scheduledAt = new Date(appointment.scheduledAt);
      const now = new Date();

      // 24-hour reminder
      const reminder24h = new Date(scheduledAt.getTime() - (24 * 60 * 60 * 1000));
      if (reminder24h > now) {
        console.log(`24h reminder scheduled for appointment ${appointment._id}`);
      }

      // 2-hour reminder
      const reminder2h = new Date(scheduledAt.getTime() - (2 * 60 * 60 * 1000));
      if (reminder2h > now) {
        console.log(`2h reminder scheduled for appointment ${appointment._id}`);
      }
    } catch (error) {
      console.error('Failed to schedule reminders:', error);
    }
  }

  // ==============================
  // ANALYTICS
  // ==============================
  
  async getAppointmentAnalytics(salonId, startDate = null, endDate = null) {
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.scheduledAt = { $gte: startDate, $lte: endDate };
    }

    const baseQuery = { tenantId: salonId, ...dateFilter };

    const totalAppointments = await Appointment.countDocuments(baseQuery);
    const completed = await Appointment.countDocuments({ ...baseQuery, status: "completed" });
    const cancelled = await Appointment.countDocuments({ ...baseQuery, status: "cancelled" });
    const noShows = await Appointment.countDocuments({ ...baseQuery, status: "no-show" });

    // Revenue calculation
    const revenueData = await Appointment.aggregate([
      { $match: { ...baseQuery, status: "completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
    ]);

    return {
      totalAppointments,
      completed,
      cancelled,
      noShows,
      completionRate: totalAppointments > 0 ? ((completed / totalAppointments) * 100).toFixed(2) : 0,
      totalRevenue: revenueData[0]?.totalRevenue || 0
    };
  }

  // Reschedule appointment
  async rescheduleAppointment(appointmentId, newScheduledAt, newStaffId, salonId) {
    const appointment = await Appointment.findOne({ _id: appointmentId, tenantId: salonId });
    if (!appointment) throw new Error("Appointment not found");

    const staffId = newStaffId || appointment.staffId;
    const available = await this.checkStaffAvailability(staffId, newScheduledAt, appointment.duration, appointmentId);
    if (!available) throw new Error("Staff not available at requested time");

    const updated = await Appointment.findOneAndUpdate(
      { _id: appointmentId, tenantId: salonId },
      { scheduledAt: newScheduledAt, staffId, status: "rescheduled" },
      { new: true }
    );

    await this.sendNotification(updated, "Appointment rescheduled");
    return updated;
  }
}

// Export service instance
module.exports = new AppointmentService();
