# Project Structure and Feature Mapping

## **🗄️ Dual Database Architecture**

This project uses **two separate MongoDB databases** for enhanced security and scalability:

### **Super Admin Database**

- **Purpose:** System-wide management and authentication
- **Models:** User, Subscription, Notification
- **Connection:** `SUPER_ADMIN_MONGO_URI`

### **Salon Admin Database**

- **Purpose:** Tenant-specific salon operations
- **Models:** Salon, Staff, Customer, Appointment, Service, Invoice, Inventory, Review, Loyalty, WalletTransaction
- **Connection:** `SALON_ADMIN_MONGO_URI`

**📋 See:** `DUAL_DATABASE_SETUP.md` for detailed configuration guide

---

## **Super Admin Portal Features**

### 1. **Subscription Management**

**Files & Folders Responsible:**

- **Model:** `src/models/Subscription.js`
- **Service:** `src/services/superAdminService.js`
- **Controller:** `src/controllers/superAdminController.js`
- **Routes:** `src/routes/v1/superAdminRoutes.js`
- **Workers:** `src/workers/kpiDailyWorker.js`

**Key Endpoints:**

- `GET /api/v1/super-admin/subscriptions/expiring` - Get expiring subscriptions
- `PATCH /api/v1/super-admin/subscriptions/:tenantId` - Update subscription
- `GET /api/v1/super-admin/tenants` - Get all tenants with subscription info

---

### 2. **Tenant (Salon) Management**

**Files & Folders Responsible:**

- **Model:** `src/models/Salon.js`
- **Service:** `src/services/superAdminService.js`
- **Controller:** `src/controllers/superAdminController.js`
- **Routes:** `src/routes/v1/superAdminRoutes.js`
- **Dashboard:** `src/dashboards/superAdmin/tenants.js`

**Key Endpoints:**

- `GET /api/v1/super-admin/tenants` - List all salon tenants
- `GET /api/v1/super-admin/tenants/:id` - Get specific tenant details
- `PATCH /api/v1/super-admin/tenants/:id/status` - Update tenant status

---

### 3. **Monthly/Yearly Dashboards**

**Files & Folders Responsible:**

- **Service:** `src/services/analyticsService.js`
- **Controller:** `src/controllers/superAdminController.js`
- **Routes:** `src/routes/v1/superAdminRoutes.js`

**Key Endpoints:**

- `GET /api/v1/super-admin/analytics/revenue` - Revenue analytics
- `GET /api/v1/super-admin/analytics/subscriptions` - Subscription analytics
- `GET /api/v1/super-admin/analytics/tenants` - Tenant growth analytics

---

### 4. **Notification System for Subscription Renewals**

**Files & Folders Responsible:**

- **Model:** `src/models/Notification.js`
- **Service:** `src/services/notificationService.js`
- **Controller:** `src/controllers/notificationController.js`
- **Routes:** `src/routes/v1/notificationRoutes.js`
- **Workers:** `src/workers/kpiDailyWorker.js`

**Key Endpoints:**

- `GET /api/v1/notifications` - Get notifications
- `PATCH /api/v1/notifications/:id/read` - Mark as read
- `POST /api/v1/notifications` - Send renewal notifications

---

### 5. **Analytics and Reporting**

**Files & Folders Responsible:**

- **Service:** `src/services/analyticsService.js`
- **Controller:** `src/controllers/superAdminController.js`
- **Routes:** `src/routes/v1/superAdminRoutes.js`

**Key Endpoints:**

- `GET /api/v1/super-admin/analytics/overview` - Overall system analytics
- `GET /api/v1/super-admin/analytics/revenue-trends` - Revenue trends across all tenants

---

## **Salon Admin Portal Features**

### 1. **Registration with Salon Details and Facilities**

**Files & Folders Responsible:**

- **Model:** `src/models/Salon.js`, `src/models/User.js`
- **Controller:** `src/controllers/authController.js`, `src/controllers/salonController.js`
- **Routes:** `src/routes/v1/authRoutes.js`, `src/routes/v1/salonRoutes.js`
- **Service:** `src/services/customerService.js`

**Key Endpoints:**

- `POST /api/v1/auth/register-salon` - Register new salon
- `PUT /api/v1/salon/profile` - Update salon profile
- `POST /api/v1/salon/facilities` - Add/update facilities

---

### 2. **Dashboard with Sales Analytics (Charts/Graphs)**

**Files & Folders Responsible:**

- **Controller:** `src/controllers/dashboardController.js`
- **Routes:** `src/routes/v1/dashboardRoutes.js`
- **Service:** `src/services/analyticsService.js`, `src/services/billingService.js`
- **Dashboard:** `src/dashboards/salon/dashboard.js`

**Key Endpoints:**

- `GET /api/v1/dashboard` - Main dashboard data
- `GET /api/v1/dashboard/analytics/sales` - Sales analytics
- `GET /api/v1/dashboard/analytics/revenue-trends` - Revenue trends
- `GET /api/v1/dashboard/analytics/top-services` - Top performing services

---

### 3. **Appointments Management with Calendar**

**Files & Folders Responsible:**

- **Model:** `src/models/Appointment.js`
- **Service:** `src/services/appointmentService.js`
- **Controller:** `src/controllers/appointmentController.js`
- **Routes:** `src/routes/v1/appointmentRoutes.js`

**Key Endpoints:**

- `GET /api/v1/appointments` - Get all appointments
- `POST /api/v1/appointments` - Create appointment
- `PUT /api/v1/appointments/:id` - Update appointment
- `GET /api/v1/appointments/calendar/:startDate/:endDate` - Calendar view
- `PATCH /api/v1/appointments/:id/status` - Update status

---

### 4. **Billing and Invoice Generation**

**Files & Folders Responsible:**

- **Model:** `src/models/Invoice.js`
- **Service:** `src/services/billingService.js`
- **Controller:** `src/controllers/billingController.js`
- **Routes:** `src/routes/v1/billingRoutes.js`

**Key Endpoints:**

- `GET /api/v1/billing/invoices` - Get invoices
- `POST /api/v1/billing/invoices` - Create invoice
- `GET /api/v1/billing/invoices/:id/pdf` - Generate PDF
- `POST /api/v1/billing/payments` - Process payment
- `GET /api/v1/billing/reports/daily/:date` - Daily sales report

---

### 5. **Staff Management**

**Files & Folders Responsible:**

- **Model:** `src/models/Staff.js`
- **Service:** `src/services/staffService.js`
- **Controller:** `src/controllers/staffController.js`
- **Routes:** `src/routes/v1/staffRoutes.js`

**Key Endpoints:**

- `GET /api/v1/staff` - Get all staff
- `POST /api/v1/staff` - Add staff member
- `PUT /api/v1/staff/:id` - Update staff
- `DELETE /api/v1/staff/:id` - Remove staff
- `GET /api/v1/staff/:id/schedule` - Staff schedule
- `GET /api/v1/staff/analytics/performance` - Performance analytics

---

### 6. **Customer Management with Visit Tracking**

**Files & Folders Responsible:**

- **Model:** `src/models/Customer.js`
- **Service:** `src/services/customerService.js`
- **Controller:** `src/controllers/customerController.js`
- **Routes:** `src/routes/v1/customerRoutes.js`

**Key Endpoints:**

- `GET /api/v1/customers` - Get all customers
- `POST /api/v1/customers` - Add customer
- `PUT /api/v1/customers/:id` - Update customer
- `GET /api/v1/customers/:id/visits` - Visit history
- `GET /api/v1/customers/analytics` - Customer analytics

---

### 7. **Inventory Management**

**Files & Folders Responsible:**

- **Model:** `src/models/Inventory.js`
- **Service:** `src/services/inventoryService.js`
- **Controller:** `src/controllers/inventoryController.js`
- **Routes:** `src/routes/v1/inventoryRoutes.js`

**Key Endpoints:**

- `GET /api/v1/inventory` - Get inventory items
- `POST /api/v1/inventory` - Add inventory item
- `PATCH /api/v1/inventory/:id/stock` - Update stock
- `GET /api/v1/inventory/alerts/low-stock` - Low stock alerts
- `GET /api/v1/inventory/analytics/summary` - Inventory analytics

---

### 8. **Settings for Profile and Facilities Updates**

**Files & Folders Responsible:**

- **Model:** `src/models/Salon.js`, `src/models/User.js`
- **Controller:** `src/controllers/salonController.js`
- **Routes:** `src/routes/v1/salonRoutes.js`

**Key Endpoints:**

- `GET /api/v1/salon/profile` - Get salon profile
- `PUT /api/v1/salon/profile` - Update profile
- `PUT /api/v1/salon/facilities` - Update facilities
- `POST /api/v1/salon/upload-logo` - Upload salon logo

---

## **Core Infrastructure Files**

### **Configuration**

- `src/config/db.js` - Database configuration
- `src/config/logger.js` - Logging configuration
- `.env.example` - Environment variables template

### **Middleware**

- `src/middlewares/authMiddleware.js` - Authentication
- `src/middlewares/tenantMiddleware.js` - Multi-tenant context
- `src/middlewares/superAdminMiddleware.js` - Super admin authorization
- `src/middlewares/errorMiddleware.js` - Error handling

### **Main Application Files**

- `server.js` - Main server entry point
- `src/app.js` - Express app configuration
- `package.json` - Dependencies and scripts

### **Background Workers**

- `src/workers/kpiDailyWorker.js` - Daily KPI calculations and notifications

---

## **Data Models Overview**

### **User Management**

- `User.js` - All system users (super admin, salon admin, staff, customers)
- `Salon.js` - Salon/tenant information
- `Staff.js` - Staff member details and schedules

### **Business Operations**

- `Appointment.js` - Appointment bookings and scheduling
- `Customer.js` - Customer profiles and visit tracking
- `Service.js` - Available services and pricing
- `Invoice.js` - Billing and payment records

### **Core Infrastructure Files**

- `src/config/db.js` - Dual database connections
- `src/config/dbSelector.js` - Database routing logic
- `src/config/logger.js` - Logging configuration
- `.env.example` - Environment variables template (updated for dual DB)

### **Database Distribution**

#### **Super Admin Database Models:**

- `User.js` - All system users (authentication)
- `Subscription.js` - Subscription management
- `Notification.js` - System notifications

#### **Salon Admin Database Models:**

- `Salon.js` - Salon profiles and information
- `Staff.js` - Staff management
- `Customer.js` - Customer profiles and visits
- `Appointment.js` - Appointment bookings
- `Service.js` - Services and pricing
- `Invoice.js` - Billing and invoicing
- `Inventory.js` - Product inventory management
- `Review.js` - Customer reviews and ratings
- `Loyalty.js` - Loyalty program management
- `WalletTransaction.js` - Payment transactions

### **Middleware**

- `src/middlewares/authMiddleware.js` - Authentication
- `src/middlewares/tenantMiddleware.js` - Multi-tenant context
- `src/middlewares/superAdminMiddleware.js` - Super admin authorization
- `src/middlewares/errorMiddleware.js` - Error handling

### **Main Application Files**

- `server.js` - Main server entry point
- `src/app.js` - Express app configuration with dual DB support
- `package.json` - Dependencies and scripts (Redis removed)

### **Background Workers**

- `src/workers/kpiDailyWorker.js` - Daily KPI calculations and notifications (MongoDB-based, no Redis)

---

## **API Routes Structure**

```
/api/v1/
├── auth/                 # Authentication routes
├── super-admin/          # Super admin management
├── salon/               # Salon profile management
├── dashboard/           # Dashboard analytics
├── appointments/        # Appointment management
├── billing/            # Billing and invoicing
├── staff/              # Staff management
├── customers/          # Customer management
├── inventory/          # Inventory management
├── notifications/      # Notification system
└── analytics/          # Analytics endpoints
```

---

## **Role-Based Access Control**

### **Super Admin**

- Full system access
- Subscription management
- Tenant management
- System analytics

### **Salon Admin**

- Salon-specific full access
- Staff management
- Customer management
- Billing and reporting

### **Staff**

- Appointment management
- Customer interaction
- Basic billing operations

### **Customer**

- Profile management
- Appointment booking
- Payment history

---

This structure ensures complete separation of concerns between Super Admin and Salon Admin functionalities while maintaining scalable, maintainable code architecture.
