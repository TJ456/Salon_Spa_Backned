// ======================================
// INVENTORY SERVICE - SERVICE LAYER
// ======================================

const Inventory = require("../models/inventory");
const Supplier = require("../models/supplier");
const PurchaseOrder = require("../models/purchaseOrder");
const InventoryMovement = require("../models/inventoryMovement");
const Service = require("../models/service");
const Appointment = require("../models/appointment");

// Utilities
const { format } = require("date-fns");

class InventoryService {
  // ==============================
  // INVENTORY ITEM MANAGEMENT
  // ==============================
  
  async getInventory(salonId, filters = {}, page = 1, limit = 10, search = null) {
    const query = { tenantId: salonId, ...filters };

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { sku: searchRegex }
      ];
    }

    const items = await Inventory.find(query)
      .populate("supplierId", "name contact email")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Inventory.countDocuments(query);

    return {
      items,
      meta: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getInventoryById(itemId, salonId) {
    return await Inventory.findOne({ _id: itemId, tenantId: salonId })
      .populate("supplierId", "name contact email")
      .populate("movements")
      .populate("servicesUsed");
  }

  async createInventory(data, salonId) {
    const inventory = new Inventory({
      ...data,
      tenantId: salonId,
      sku: data.sku || this.generateSKU(),
      createdAt: new Date()
    });
    await inventory.save();
    this.sendNotification(`Inventory item created: ${inventory.name}`);
    return inventory;
  }

  generateSKU() {
    return 'SKU-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  async updateInventory(itemId, updateData, salonId) {
    const updated = await Inventory.findOneAndUpdate(
      { _id: itemId, tenantId: salonId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    this.sendNotification(`Inventory item updated: ${updated.name}`);
    return updated;
  }

  async deleteInventory(itemId, salonId) {
    const deleted = await Inventory.findOneAndDelete({ _id: itemId, tenantId: salonId });
    this.sendNotification(`Inventory item deleted: ${deleted?.name || itemId}`);
    return deleted;
  }

  // ==============================
  // STOCK LEVEL MANAGEMENT
  // ==============================

  async updateStock(itemId, quantity, type, reason, salonId, userId) {
    const item = await Inventory.findOne({ _id: itemId, tenantId: salonId });
    if (!item) throw new Error("Inventory item not found");

    const change = type === "add" ? quantity : -quantity;
    const newStockLevel = item.stockLevel + change;

    if (newStockLevel < 0) {
      throw new Error("Insufficient stock available");
    }

    item.stockLevel = newStockLevel;
    item.lastMovement = new Date();
    await item.save();

    const movement = new InventoryMovement({
      itemId,
      tenantId: salonId,
      quantity: change,
      type,
      reason,
      userId,
      balanceAfter: newStockLevel,
      createdAt: new Date(),
    });
    await movement.save();

    // Check for low stock alerts
    if (item.stockLevel <= item.minStock) {
      this.sendLowStockAlert(item);
    }

    this.sendNotification(
      `Stock updated for ${item.name}: ${type} ${quantity} units. New balance: ${newStockLevel}`
    );
    return movement;
  }

  async adjustStockLevels(adjustments, salonId, userId) {
    const results = [];
    for (const adj of adjustments) {
      const movement = await this.updateStock(
        adj.itemId,
        adj.quantity,
        adj.type,
        adj.reason,
        salonId,
        userId
      );
      results.push(movement);
    }
    return results;
  }

  async performStockCount(salonId, countData, userId) {
    const adjustments = [];
    for (const { itemId, physicalCount } of countData) {
      const item = await Inventory.findOne({ _id: itemId, salonId });
      if (!item) continue;
      const diff = physicalCount - item.stockLevel;
      if (diff !== 0) {
        const movement = await this.updateStock(
          itemId,
          Math.abs(diff),
          diff > 0 ? "add" : "remove",
          "Stock count adjustment",
          salonId,
          userId
        );
        adjustments.push(movement);
      }
    }
    return adjustments;
  }

  async setReorderPoints(itemId, minStock, maxStock, reorderQty) {
    return await Inventory.findByIdAndUpdate(
      itemId,
      { minStock, maxStock, reorderQuantity: reorderQty, updatedAt: new Date() },
      { new: true }
    );
  }

  // Automatic reordering
  async checkAndCreateReorders(salonId) {
    const lowStockItems = await Inventory.find({
      tenantId: salonId,
      stockLevel: { $lte: { $expr: "$minStock" } },
      autoReorder: true
    });

    const reorders = [];
    for (const item of lowStockItems) {
      if (item.supplierId && item.reorderQuantity > 0) {
        const po = await this.createPurchaseOrder(salonId, {
          supplierId: item.supplierId,
          items: [{ itemId: item._id, quantity: item.reorderQuantity, unitPrice: item.costPrice }],
          type: 'auto-reorder'
        }, 'system');
        reorders.push(po);
      }
    }
    return reorders;
  }

  sendLowStockAlert(item) {
    this.sendNotification(`LOW STOCK ALERT: ${item.name} - Current: ${item.stockLevel}, Min: ${item.minStock}`);
  }

  // ==============================
  // SUPPLIER & PURCHASE ORDERS
  // ==============================

  async manageSuppliers(salonId, supplierData) {
    const supplier = new Supplier({ ...supplierData, tenantId: salonId });
    await supplier.save();
    this.sendNotification(`Supplier added: ${supplier.name}`);
    return supplier;
  }

  async getSuppliers(salonId) {
    return await Supplier.find({ tenantId: salonId }).sort({ name: 1 });
  }

  async createPurchaseOrder(salonId, orderData, userId) {
    const poNumber = await this.generatePONumber(salonId);
    const totalAmount = orderData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const po = new PurchaseOrder({
      ...orderData,
      tenantId: salonId,
      poNumber,
      totalAmount,
      createdBy: userId,
      status: "pending",
      createdAt: new Date(),
    });
    await po.save();
    this.sendNotification(`Purchase order created: ${po.poNumber}`);
    return po;
  }

  async generatePONumber(salonId) {
    const count = await PurchaseOrder.countDocuments({ tenantId: salonId });
    return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }

  async receivePurchaseOrder(orderId, receivingData, userId) {
    const po = await PurchaseOrder.findById(orderId);
    if (!po) throw new Error("Purchase order not found");

    po.status = "received";
    po.receivedAt = new Date();
    po.receivedBy = userId;
    await po.save();

    for (const { itemId, quantity, actualCost } of receivingData) {
      await this.updateStock(itemId, quantity, "add", `Purchase received - PO: ${po.poNumber}`, po.tenantId, userId);

      // Update item cost if provided
      if (actualCost) {
        await Inventory.findByIdAndUpdate(itemId, { costPrice: actualCost });
      }
    }

    this.sendNotification(`Purchase order received: ${po.poNumber}`);
    return po;
  }

  async getPurchaseOrders(salonId, status = null) {
    const query = { tenantId: salonId };
    if (status) query.status = status;

    return await PurchaseOrder.find(query)
      .populate('supplierId', 'name')
      .sort({ createdAt: -1 });
  }

  // ==============================
  // PRODUCT USAGE TRACKING
  // ==============================

  async trackServiceUsage(appointmentId, serviceId, usedProducts) {
    for (const { itemId, quantity } of usedProducts) {
      await this.updateStock(itemId, quantity, "remove", `Used in service ${serviceId}`, null, null);
    }
    this.sendNotification(`Products used for service ${serviceId} in appointment ${appointmentId}`);
    return usedProducts;
  }

  async calculateServiceCosts(serviceId) {
    const service = await Service.findById(serviceId).populate("productsUsed");
    if (!service) return { serviceId, totalCost: 0 };

    let totalCost = 0;
    if (service.productsUsed) {
      service.productsUsed.forEach(prod => totalCost += (prod.costPrice || 0));
    }
    return { serviceId, totalCost, margin: service.price - totalCost };
  }

  async analyzeProductUsage(salonId, startDate = null, endDate = null) {
    const matchQuery = { tenantId: salonId, type: 'remove' };
    if (startDate && endDate) {
      matchQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    const usage = await InventoryMovement.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$itemId",
          totalUsed: { $sum: { $abs: "$quantity" } },
          usageCount: { $sum: 1 }
        }
      },
      { $lookup: { from: "inventories", localField: "_id", foreignField: "_id", as: "item" } },
      { $unwind: "$item" },
      {
        $project: {
          itemName: "$item.name",
          totalUsed: 1,
          usageCount: 1,
          totalCost: { $multiply: ["$totalUsed", "$item.costPrice"] }
        }
      },
      { $sort: { totalUsed: -1 } }
    ]);

    return usage;
  }

  // ==============================
  // NOTIFICATIONS
  // ==============================
  
  sendNotification(message) {
    console.log(`Inventory Notification: ${message}`);
  }

  // ==============================
  // ANALYTICS
  // ==============================

  async getInventoryAnalytics(salonId, startDate = null, endDate = null) {
    const query = { tenantId: salonId };

    const totalItems = await Inventory.countDocuments(query);
    const lowStock = await Inventory.countDocuments({
      ...query,
      $expr: { $lte: ["$stockLevel", "$minStock"] }
    });
    const outOfStock = await Inventory.countDocuments({ ...query, stockLevel: 0 });

    // Calculate total inventory value
    const inventoryValue = await Inventory.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$stockLevel", "$costPrice"] } }
        }
      }
    ]);

    // Movement analytics
    const movementQuery = { tenantId: salonId };
    if (startDate && endDate) {
      movementQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    const movements = await InventoryMovement.aggregate([
      { $match: movementQuery },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalQuantity: { $sum: { $abs: "$quantity" } }
        }
      }
    ]);

    return {
      totalItems,
      lowStock,
      outOfStock,
      totalValue: inventoryValue[0]?.totalValue || 0,
      movements: movements.reduce((acc, m) => {
        acc[m._id] = { count: m.count, quantity: m.totalQuantity };
        return acc;
      }, {})
    };
  }

  // Get low stock items
  async getLowStockItems(salonId) {
    return await Inventory.find({
      tenantId: salonId,
      $expr: { $lte: ["$stockLevel", "$minStock"] }
    }).sort({ stockLevel: 1 });
  }

  // Get inventory valuation report
  async getInventoryValuation(salonId) {
    return await Inventory.aggregate([
      { $match: { tenantId: salonId } },
      {
        $project: {
          name: 1,
          sku: 1,
          stockLevel: 1,
          costPrice: 1,
          totalValue: { $multiply: ["$stockLevel", "$costPrice"] }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);
  }
}

// Export service instance
module.exports = new InventoryService();
