# 💇‍♂️ Salon SaaS Backend

This is a **multi-tenant SaaS backend** for managing **Salons, Customers, and SuperAdmin subscriptions**.  
It is designed in a clean, scalable, production-ready structure.

---

### 1️⃣ `src/config/` → **Foundation**

These files configure your environment and external dependencies.  
Write these **first** before touching business logic.

- **db.js** → Sets up MongoDB connection. Without this, models can’t save data.
- **env.js** → Loads secrets from `.env` file (DB URI, JWT secret, API keys).
- **logger.js** → Central logging using Winston/Pino for debugging & audits.
- _(future)_ **payment.js** → Stripe/Razorpay integration.

---

### 2️⃣ `src/models/` → **Database Schema (the Bricks)**

Models are the **data blueprint**. Write them **before services**.

- **User.js** → Handles roles (`superadmin`, `salonAdmin`, `customer`).
- **Salon.js** → Salon info (name, services, facilities, subscription plan).
- **Subscription.js** → Tracks salon subscriptions (start, end, renewal status).
- **Customer.js** → Stores customers who visit salons.
- **Appointment.js** → Calendar bookings for salons.
- **Invoice.js** → Billing + receipt storage.
- **Staff.js** → Staff members under each salon.
- **Inventory.js** → Products (shampoo, conditioner, etc.).
- **Loyalty.js** → Customer points system.
- **Review.js** → Customers can leave ratings for services/salons.
- **WalletTransaction.js** → Track credit/debit of salon wallets.

---

### 3️⃣ `src/services/` → **Business Logic (the Brain)**

Services contain the **rules & logic** of the app. They never touch `req/res` directly.  
Write these after models.

- **authService.js** → Login, registration, password reset.
- **superAdminService.js** → Manage salon subscriptions, send renewal notices, dashboard analytics.
- **salonService.js** → Salon registration, facilities, staff, inventory, settings.
- **appointmentService.js** → Handle bookings (customer + salon calendar).
- **billingService.js** → Generate invoices, integrate with payment gateways.
- **customerService.js** → Track visits, history, loyalty, reviews.
- **analyticsService.js** → Aggregations for graphs/charts (monthly/yearly reports).
- **notificationService.js** → Send email/SMS notifications.

---

### 4️⃣ `src/controllers/` → **Request Handlers (the Bridge)**

Controllers act as the **translator**:  
They take HTTP requests → validate → call service → send response.

- **authController.js** → Login, register endpoints.
- **superAdminController.js** → Subscription CRUD, analytics dashboard APIs.
- **salonController.js** → Salon setup, staff, inventory APIs.
- **customerController.js** → Customer visit tracking, reviews, history.

---

### 5️⃣ `src/routes/v1/` → **API Endpoints (the Doors)**

Routes define the **API URLs**.  
They are just small files connecting URLs → controller functions.

- **authRoutes.js** → `/api/v1/auth/login` etc.
- **superAdminRoutes.js** → `/api/v1/superadmin/...`
- **salonRoutes.js** → `/api/v1/salon/...`
- **customerRoutes.js** → `/api/v1/customer/...`

---

### 6️⃣ `src/middlewares/` → **Security Guards (the Security System)**

Middlewares protect and validate requests before reaching services.

- **authMiddleware.js** → JWT authentication + role-based access.
- **tenantMiddleware.js** → Ensures one salon’s data doesn’t leak into another.
- **superAdminMiddleware.js** → Allows only superadmin to access subscription APIs.
- **errorMiddleware.js** → Centralized error handling.
- **rateLimit.js** → Prevents spam/abuse.

---

### 7️⃣ `src/utils/` → **Helpers (the Tools)**

Reusable utilities that keep code DRY.

- **mailer.js** → SendGrid/SMTP emails (for invoices, subscription renewal).
- **smsSender.js** → Twilio/WhatsApp notifications.
- **fileUploader.js** → AWS S3/GCP uploads (e.g., salon logos, staff images).
- **cache.js** → Redis caching (sessions, subscriptions, reports).

---

### 8️⃣ `src/workers/` → **Background Jobs (the Robots)**

Long tasks should run in background (not block requests).

- **reminderWorker.js** → Send appointment reminders.
- **invoiceWorker.js** → Auto-generate monthly invoices.
- **subscriptionWorker.js** → Check expiring subscriptions & send renewal notices.
- **campaignWorker.js** → Bulk SMS/email marketing.

---

### 9️⃣ `src/dashboards/` → **Views/Grouping**

APIs grouped by role for clarity.

- **superAdmin/** → Subscription analytics, client management.
- **salon/** → Daily dashboard, appointments, billing.
- **customer/** → Customer-facing APIs (reviews, loyalty, bookings).

---

### 🔟 `src/tests/` → **Quality Check**

Write unit + integration tests to avoid production bugs.

---

### 🔑 Final Flow to Write Code

1. Start with **config/** (DB + env).
2. Write **models/** (data design).
3. Add **services/** (business logic).
4. Build **controllers/** (bridge logic).
5. Wire up **routes/** (APIs).
6. Secure with **middlewares/**.
7. Add helpers in **utils/**.
8. Automate with **workers/**.
9. Expose grouped APIs in **dashboards/**.
10. Write **tests/** before deploying.

---

## 📊 Example Flows

### SuperAdmin

- View all salons & their subscription status.
- Send renewal notifications.
- View monthly/yearly revenue reports.

### Salon Admin

- Register salon, add staff, services, inventory.
- Manage appointments, generate bills.
- View dashboard (sales charts, daily/monthly stats).

### Customer

- Book appointment, view history.
- Earn loyalty points.
- Review services.

---

## 🛠 Tech Stack

- **Node.js + Express**
- **MongoDB (Mongoose)**
- **JWT for Auth**
- **Bull/Agenda (background jobs)**
- **Stripe/Razorpay (payments)**

---

## 🚀 Run Locally

```bash
git clone <repo-url>
cd salon-saas-backend
npm install
cp .env.example .env
npm run dev
```
