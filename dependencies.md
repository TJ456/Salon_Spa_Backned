Salon SaaS Boilerplate
======================

This scaffold targets a multi-tenant salon SaaS: SuperAdmin (platform owner), SalonAdmin (tenant), Customers.

Folders of interest:
- src/config
- src/models
- src/controllers
- src/services
- src/routes/v1
- src/middlewares
- src/dashboards

Run:
1. copy .env.example to .env and adjust
2. npm install
3. npm run dev

This zip contains skeletons and production-ready comments for further development.
=======================
Super Admin Portal:

Subscription management
Tenant (salon) management
Monthly/Yearly dashboards
Notification system for subscription renewals
Analytics and reporting
Salon Admin Portal:

Registration with salon details and facilities
Dashboard with sales analytics (charts/graphs)
Appointments management with calendar
Billing and invoice generation
Staff management
Customer management with visit tracking
Inventory management
Settings for profile and facilities updates
=======================
Added Essential Dependencies - Added 50+ packages needed for a comprehensive salon/spa backend:

Core: Express, Mongoose, JWT, bcryptjs, Winston
Security: Helmet, CORS, express-rate-limit, xss-clean, hpp
File Handling: Multer, Sharp, PDFKit, ExcelJS, CSV tools
Payments: Stripe, Razorpay (removed Twilio)
Cloud Services: AWS SDK, Cloudinary, Firebase Admin
Real-time: Socket.io, Bull (job queues)
Utilities: Moment, Day.js, Lodash, UUID, Joi validation
Email: Nodemailer with Handlebars templates
Development Tools: ESLint, Prettier, Jest, Supertest
