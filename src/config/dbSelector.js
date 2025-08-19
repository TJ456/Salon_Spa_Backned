const { superAdminConnection, salonAdminConnection } = require("./db");


const SUPER_ADMIN_MODELS = [
  "User", 
  "Subscription", 
  "Notification", 
];

const SALON_ADMIN_MODELS = [
  "Salon",
  "Staff",
  "Customer",
  "Appointment",
  "Service",
  "Invoice",
  "Inventory",
  "Review",
  "Loyalty",
  "WalletTransaction",
];

/**
 * Get the appropriate database connection for a model
 * @param {string} modelName - The name of the model
 * @returns {mongoose.Connection} - The appropriate database connection
 */
function getConnection(modelName) {
  if (SUPER_ADMIN_MODELS.includes(modelName)) {
    return superAdminConnection;
  } else if (SALON_ADMIN_MODELS.includes(modelName)) {
    return salonAdminConnection;
  } else {
    
    return salonAdminConnection;
  }
}

/**
 * 
 * @param {string} modelName - The name of the model
 * @param {mongoose.Schema} schema - The mongoose schema
 * @returns {mongoose.Model} - The model with correct connection
 */
function createModel(modelName, schema) {
  const connection = getConnection(modelName);
  return connection.model(modelName, schema);
}

module.exports = {
  getConnection,
  createModel,
  SUPER_ADMIN_MODELS,
  SALON_ADMIN_MODELS,
};
