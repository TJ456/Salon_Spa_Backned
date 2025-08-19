# Dual MongoDB Setup Configuration

## Overview

This project now uses **two separate MongoDB databases** instead of Redis:

1. **Super Admin Database** - Handles system-wide data
2. **Salon Admin Database** - Handles tenant-specific salon data

## Database Configuration

### Environment Variables

Update your `.env` file with:

```env
# Super Admin Database
SUPER_ADMIN_MONGO_URI=mongodb://localhost:27017/salon_saas_super_admin

# Salon Admin Database
SALON_ADMIN_MONGO_URI=mongodb://localhost:27017/salon_saas_salon_admin

JWT_SECRET=your_jwt_secret
NODE_ENV=development
PORT=3000
```

### Production URLs Example

```env
# For MongoDB Atlas or production
SUPER_ADMIN_MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/salon_saas_super_admin
SALON_ADMIN_MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/salon_saas_salon_admin
```

## Database Model Distribution

### Super Admin Database Models

These models are stored in the **Super Admin Database**:

- **User** - All user authentication (super admin, salon admin, staff, customers)
- **Subscription** - Subscription management and billing
- **Notification** - System-wide notifications

### Salon Admin Database Models

These models are stored in the **Salon Admin Database**:

- **Salon** - Salon profiles and information
- **Staff** - Staff management
- **Customer** - Customer profiles
- **Appointment** - Appointment bookings
- **Service** - Services offered
- **Invoice** - Billing and invoicing
- **Inventory** - Product inventory
- **Review** - Customer reviews
- **Loyalty** - Loyalty programs
- **WalletTransaction** - Payment transactions

## Technical Implementation

### Database Selector (`src/config/dbSelector.js`)

Automatically routes models to the correct database connection based on the model type.

### Database Connections (`src/config/db.js`)

- `superAdminConnection` - Connection to super admin database
- `salonAdminConnection` - Connection to salon admin database
- `connectDB()` - Connects to both databases simultaneously

### Model Creation

All models now use the `createModel()` function which automatically selects the appropriate database connection:

```javascript
const { createModel } = require("../config/dbSelector");
module.exports = createModel("ModelName", schema);
```

## Benefits of This Architecture

### 1. **Data Isolation**

- Super admin data is completely separated from tenant data
- Enhanced security and data privacy
- Easier compliance with data protection regulations

### 2. **Scalability**

- Each database can be scaled independently
- Salon databases can be sharded by tenant
- Super admin database remains centralized

### 3. **Performance**

- Reduced cross-database queries
- Better indexing strategies per use case
- Independent query optimization

### 4. **Security**

- Different access controls per database
- Super admin data is isolated
- Tenant data isolation prevents cross-tenant access

### 5. **Backup & Recovery**

- Independent backup strategies
- Super admin data can be backed up more frequently
- Tenant data can have different retention policies

## Cross-Database Operations

### User Authentication

Users are stored in the Super Admin database but need to access tenant data:

```javascript
// User login (Super Admin DB)
const user = await User.findByCredentials(email, password);

// Access tenant data (Salon Admin DB)
const salon = await Salon.findById(user.tenantId);
```

### Subscription Management

```javascript
// Super Admin manages subscriptions (Super Admin DB)
const subscription = await Subscription.findOne({ tenantId: salonId });

// Update salon status based on subscription (Salon Admin DB)
await Salon.findByIdAndUpdate(salonId, { subscriptionStatus: "active" });
```

## Migration Notes

### From Single Database

If migrating from a single database setup:

1. **Export existing data** by model type
2. **Import User, Subscription, Notification** to Super Admin DB
3. **Import all other models** to Salon Admin DB
4. **Update references** if needed

### Data Relationships

- Cross-database references use ObjectId but queries need to be handled manually
- Use `tenantId` field to link salon-specific data
- User authentication remains centralized

## Monitoring & Maintenance

### Health Checks

Monitor both database connections:

```javascript
// Check Super Admin DB
superAdminConnection.readyState === 1; // Connected

// Check Salon Admin DB
salonAdminConnection.readyState === 1; // Connected
```

### Indexing Strategy

- **Super Admin DB**: Focus on user authentication and subscription queries
- **Salon Admin DB**: Focus on tenant-specific operations and date-based queries

### Backup Strategy

- **Super Admin DB**: Daily backups (critical system data)
- **Salon Admin DB**: Regular backups based on business requirements

## Troubleshooting

### Connection Issues

1. Verify both MongoDB URIs are correct
2. Check network connectivity to both databases
3. Ensure proper authentication credentials
4. Verify database names exist

### Model Loading

If models fail to load:

1. Ensure `dbSelector.js` is correctly configured
2. Check model names match the arrays in `dbSelector.js`
3. Verify imports are using `createModel` function

### Cross-Database Queries

- Remember that MongoDB joins don't work across databases
- Use application-level joins when needed
- Consider denormalizing data if frequent cross-database queries are needed

## Performance Optimization

### Connection Pooling

Each database connection has its own pool settings:

```javascript
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};
```

### Query Optimization

- Use appropriate indexes for each database
- Monitor slow queries in both databases
- Consider read replicas for heavy read operations

This dual-database architecture provides better separation of concerns, improved security, and enhanced scalability for the salon SaaS application.
