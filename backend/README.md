# API Framework - Chat 2: Complete Infrastructure

This is **Chat 2** of a 3-part API framework build. Chat 2 implements bulletproof infrastructure: database layer, logging system, and error handling.

## 🏗️ What's Built in Chat 2

### 💾 Database Layer
- **PostgreSQL + Redis Integration**: Automatic connection pooling with graceful fallbacks
- **Smart Caching**: `query(sql, params, cacheKey, ttl)` method with automatic Redis caching
- **Helper Methods**: `findById`, `insert`, `update`, `delete` with cache invalidation
- **Transaction Support**: Full ACID transaction wrapper
- **Error Handling**: PostgreSQL error codes mapped to user-friendly messages

### 📝 Logging System
- **Dual Logging**: Console + Database with batch flushing for performance
- **Structured Logging**: Request context, performance metrics, error details
- **Module Integration**: `.log()` method injected into business objects
- **Automatic Sanitization**: Removes sensitive data from logs
- **Performance Optimized**: Batched database writes to minimize I/O impact

### 🛡️ Error Handling
- **Comprehensive Error Wrapping**: Catches all errors from business logic
- **Error Classification**: Categorizes errors by type, severity, and operational impact
- **Pretty API Responses**: Consistent error format for REST clients
- **Error Frequency Tracking**: Monitors error patterns and thresholds
- **Development vs Production**: Detailed stack traces in dev, sanitized in prod

### 🔧 Module Wrapper
- **Complete Dependency Injection**: Database, logging, utilities, context, cache
- **Method Wrapping**: Automatic error handling applied to every business method
- **Security Features**: Input sanitization, permission checks, rate limiting
- **Performance Monitoring**: Execution time and memory usage tracking

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup PostgreSQL Database
```bash
# Make sure PostgreSQL is running
npm run db:setup
```

### 3. Setup Redis (Optional but Recommended)
```bash
# Install and start Redis
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu
# Start Redis
redis-server
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database and Redis settings
```

### 5. Start Development Server
```bash
npm run dev
```

### 6. Test the Framework
```bash
# Health check
npm run health

# Test public endpoint
curl http://localhost:3000/api/v1/demo/getPublicData

# Generate test token
node -e "console.log(require('./core/middlewarePipeline').generateToken({id: 'user123', name: 'Test User', roles: ['user']}))"

# Test private endpoint (replace YOUR_TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/demo/getPrivateData

# Test create record
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Record","description":"Created via API","category":"test","tags":["api","test"]}' \
  http://localhost:3000/api/v1/demo/createRecord
```

## 🎯 For Junior Developers

### Zero Infrastructure Code Needed
You write **only business logic**. The framework provides:

```javascript
async function createUser(req, data) {
    // Automatic input validation
    this.util.validate(data, {
        email: { required: true, type: 'email' },
        name: { required: true, minLength: 2 }
    });

    // Automatic logging with context
    this.log('Creating new user');

    // Smart database with auto-caching
    const user = await this.db.insert('users', {
        email: this.util.sanitizeString(data.email),
        name: this.util.sanitizeString(data.name),
        created_by: this.context.user.id
    });

    // Automatic cache invalidation
    await this.cache.invalidate('users:*');

    // Automatic error handling wraps everything
    return user;
}
```

### What You Get Automatically

✅ **Database Queries**: PostgreSQL with automatic Redis caching  
✅ **Error Handling**: All errors caught, formatted, and logged  
✅ **Input Validation**: Declarative validation rules  
✅ **Logging**: Every operation logged with full context  
✅ **Performance Monitoring**: Query timing and memory tracking  
✅ **Security**: Authentication, authorization, input sanitization  
✅ **Caching**: Smart Redis caching with automatic invalidation  

## 📊 Monitoring & Health Checks

### Health Check
```bash
curl http://localhost:3000/health
```

### API Information
```bash
curl http://localhost:3000/api/info
```

### System Metrics
```bash
curl http://localhost:3000/api/metrics
```

### Query Logs
```bash
npm run logs:query
```

## 🔧 Creating New APIs

Creating a new API is incredibly simple:

### 1. Create Module File
Create `routes/users.js`:

```javascript
const _moduleConfig = {
    routerName: 'users',
    version: 'v1',
    authRequired: true,
    rateLimit: '100/hour',
    methods: {
        getProfile: { public: true },
        updateProfile: { rateLimit: '10/hour' }
    }
};

async function getProfile(req, data) {
    this.log('Getting user profile');
    
    const user = await this.db.findById('users', data.id, `user:${data.id}`, 300);
    
    return {
        id: user.id,
        name: user.name,
        email: user.email
    };
}

async function updateProfile(req, data) {
    this.util.validate(data, {
        name: { required: true, minLength: 2 }
    });

    const user = await this.db.update('users', this.context.user.id, {
        name: this.util.sanitizeString(data.name)
    });

    await this.cache.invalidate(`user:${user.id}`);
    
    return user;
}

module.exports = {
    _moduleConfig,
    getProfile,
    updateProfile
};
```

### 2. That's It!
Your API is automatically:
- Registered and available at `/api/v1/users/getProfile`
- Protected by authentication (if configured)
- Rate limited
- Logged and monitored
- Error-wrapped
- Cached appropriately

## 🗄️ Database Operations

### Simple Queries
```javascript
// Automatic caching
const users = await this.db.query(
    'SELECT * FROM users WHERE active = $1',
    [true],
    'active_users',  // Cache key
    600             // Cache TTL (seconds)
);

// Helper methods
const user = await this.db.findById('users', userId);
const newUser = await this.db.insert('users', userData);
const updated = await this.db.update('users', userId, changes);
const deleted = await this.db.delete('users', userId);
```

### Transactions
```javascript
const result = await this.db.transaction(async (tx) => {
    const user = await tx.query('INSERT INTO users (...) RETURNING *', []);
    const profile = await tx.query('INSERT INTO profiles (...) RETURNING *', []);
    return { user, profile };
});
```

## 📝 Logging

### Automatic Context Logging
Every method call is automatically logged with:
- Request ID
- User ID
- Module and method
- Execution time
- Memory usage
- Error details (if any)

### Manual Logging
```javascript
this.log('User created successfully');
this.log('Slow operation detected', 'warn');
this.log('Critical error occurred', 'error');
```

## 🛡️ Error Handling

### Automatic Error Formatting
```javascript
// Business logic - just throw simple errors
if (!user) {
    throw {
        code: 'USER_NOT_FOUND',
        message: 'User does not exist',
        statusCode: 404
    };
}

// Framework automatically:
// 1. Catches the error
// 2. Logs it with full context
// 3. Formats pretty JSON response
// 4. Tracks error frequency
// 5. Handles different environments
```

### Validation Errors
```javascript
this.util.validate(data, {
    email: { required: true, type: 'email' },
    age: { required: true, type: 'number', min: 18 }
});
// Automatically throws formatted validation errors
```

## 🚀 Advanced Features

### Smart Caching
```javascript
// Cache with automatic invalidation
const result = await this.db.query(sql, params, 'cache_key', 300);

// Manual cache operations
await this.cache.set('key', data, 600);
const cached = await this.cache.get('key');
await this.cache.invalidate('pattern:*');
```

### Performance Monitoring
```javascript
// Automatic query timing
const result = await this.db.query(sql); // Logged: "Query completed in 45ms"

// Manual performance measurement
const { result, performance } = await this.util.measurePerformance(async () => {
    return await expensiveOperation();
});
```

### Batch Operations
```javascript
// Transaction-wrapped batch operations
const results = await this.db.batchQuery([
    { sql: 'INSERT INTO users ...', params: [...] },
    { sql: 'INSERT INTO profiles ...', params: [...] }
]);
```

## 🔧 Configuration

### Environment Variables
See `.env` file for all configuration options:
- Database connection settings
- Redis configuration
- Logging preferences
- Performance thresholds
- Security settings

### Module Configuration
```javascript
const _moduleConfig = {
    routerName: 'myapi',
    version: 'v1',
    authRequired: false,
    rateLimit: '100/hour',
    methods: {
        methodName: {
            public: true,           // Skip authentication
            authRequired: true,     // Override global auth
            rateLimit: '50/hour'    // Override global rate limit
        }
    }
};
```

## 🧪 Testing

### Run Tests
```bash
npm test                # All tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
```

### Manual Testing
```bash
# Health checks
npm run health

# Database operations
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Test","category":"demo"}' \
  http://localhost:3000/api/v1/demo/createRecord

# Search functionality
curl "http://localhost:3000/api/v1/demo/searchRecords?query=test&limit=5"

# Statistics
curl http://localhost:3000/api/v1/demo/getRecordStats
```

## 🗂️ Project Structure

```
api-framework/
├── core/                     # Chat 2 Infrastructure
│   ├── database.js          # PostgreSQL + Redis layer
│   ├── logger.js            # Dual logging system
│   ├── errorHandler.js      # Error wrapping & formatting
│   ├── wrapper.js           # Dependency injection
│   ├── dependencyContainer.js # Service orchestration
│   ├── registry.js          # Module discovery (Chat 1)
│   ├── middlewarePipeline.js # Auth, rate limiting (Chat 1)
│   └── responseFormatter.js # Response formatting (Chat 1)
├── routes/                  # API modules
│   └── demo.js             # Enhanced demo with real DB ops
├── scripts/                # Utility scripts
│   ├── queryLogs.js       # Log analysis
│   └── cleanupLogs.js     # Log cleanup
├── tests/                  # Test suites
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── server.js              # Enhanced server with Chat 2
├── package.json           # Dependencies & scripts
├── .env                   # Environment configuration
├── database_setup.sql     # Database initialization
└── README.md             # This file
```

## 🎓 What You Learned

### Chat 1 Foundation
- Registry pattern for auto-discovery
- Dependency injection container
- Middleware pipeline
- Response formatting

### Chat 2 Infrastructure
- Database abstraction with caching
- Structured logging system
- Comprehensive error handling
- Module wrapper with dependency injection
- Performance monitoring
- Security features

## 🚀 Coming in Chat 3

- **Docker Stack**: nginx + Node.js + PostgreSQL + Redis
- **Production Deployment**: Environment management and secrets
- **Load Balancing**: nginx configuration
- **Monitoring Stack**: Complete health monitoring
- **Demo APIs**: Full working examples

## 🎯 Framework Benefits

✅ **Zero Boilerplate**: Focus only on business logic  
✅ **Auto Registration**: Drop file → instant API  
✅ **Built-in Security**: Auth, rate limiting, validation  
✅ **Performance**: Caching, connection pooling, monitoring  
✅ **Monitoring**: Logging, metrics, health checks  
✅ **Error Proof**: Framework handles all error cases  
✅ **Junior Friendly**: Simple patterns, minimal complexity  
✅ **Production Ready**: Bulletproof infrastructure  

The framework is designed so junior developers can create robust, production-ready APIs without worrying about infrastructure concerns, while senior developers get the performance and reliability they need.

---

**Need Help?** Check the `/tests` directory for examples, or look at the enhanced `demo.js` module to see all features in action.