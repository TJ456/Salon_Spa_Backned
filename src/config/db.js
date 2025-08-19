const mongoose = require("mongoose");
const logger = require("./logger");

// Super Admin Database Connection
const superAdminConnection = mongoose.createConnection();

// Salon Admin Database Connection
const salonAdminConnection = mongoose.createConnection();

const connectSuperAdminDB = async () => {
  const uri = process.env.SUPER_ADMIN_MONGO_URI;
  if (!uri) {
    logger.error("SUPER_ADMIN_MONGO_URI not set in env");
    return;
  }
  try {
    await superAdminConnection.openUri(uri, {});
    logger.info("Super Admin MongoDB connected");
  } catch (e) {
    logger.error("Super Admin MongoDB connection error", e);
    process.exit(1);
  }
};

const connectSalonAdminDB = async () => {
  const uri = process.env.SALON_ADMIN_MONGO_URI;
  if (!uri) {
    logger.error("SALON_ADMIN_MONGO_URI not set in env");
    return;
  }
  try {
    await salonAdminConnection.openUri(uri, {});
    logger.info("Salon Admin MongoDB connected");
  } catch (e) {
    logger.error("Salon Admin MongoDB connection error", e);
    process.exit(1);
  }
};

const connectDB = async () => {
  await Promise.all([connectSuperAdminDB(), connectSalonAdminDB()]);
};

module.exports = {
  connectDB,
  superAdminConnection,
  salonAdminConnection,
};
