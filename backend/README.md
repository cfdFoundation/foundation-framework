# API Framework - Chat 1: Core Framework

This is **Chat 1** of a 3-part API framework build. This chat implements the core registry pattern, dependency injection, and middleware pipeline.

## What's Built in Chat 1

### 🏗️ Core Architecture
- **Auto-Discovery Registry**: Automatically finds and registers API modules
- **Dependency Injection Container**: Manages shared services and utilities
- **Middleware Pipeline**: Handles auth, rate limiting, versioning, validation
- **Response Formatter**: Standardized JSON responses with error handling
- **Self-Declaring Modules**: Zero-touch API registration

### 🚀 Key Features
- **Convention over Configuration**: Drop a file in `/routes/` → instant API
- **Middleware Pipeline**: Auth → Rate Limiting → Versioning → Validation → Business Logic
- **JWT Authentication**: Token-based auth with method-level overrides
- **Rate Limiting**: Configurable per module/method (e.g., "100/hour", "10/minute")
- **API Versioning**: URL-based versioning (`/api/v1/module/method`)
- **Graceful Shutdown**: Proper cleanup of all services

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Test the Framework**
   ```bash
   # Health check
   curl http://localhost:3000/health
   
   # API info
   curl http://localhost:3000/api/info
   
   # Public endpoint (no auth)
   curl http://localhost:3000/api/v1/demo/getPublicData
   
   # Generate test token
   node -e "console.log(require('./core/middlewarePipeline').generateToken({id: 1, name: 'Test User'}))"
   
   # Private endpoint (with auth)
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/demo/getPrivateData
   ```

## Creating New API Modules

Creating a new API is incredibly simple:

1. **Create a file** in `/routes/` (e.g., `users.js`)
2. **Export module config** and methods:

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
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', 'user_1', 300);
    return result.rows[0];
}

async function updateProfile(req, data) {
    this.log('Updating profile');
    // Business logic here
    return { success: true };
}

module.exports = {
    _moduleConfig,
    getProfile,
    updateProfile
};
```

3. **That's it!** Your API is automatically:
   - Registered and available at `/api/v1/users/getProfile`
   - Protected by authentication (if configured)
   - Rate limited
   - Logged and monitored
   - Error-wrapped

## Module Configuration

Each module can configure:

```javascript
const _moduleConfig = {
    routerName: 'myapi',           // URL path: /api/v1/myapi/method
    version: 'v1',                 // API version
    authRequired: false,           // Global auth requirement
    rateLimit: '100/hour',         // Global rate limit
    methods: {
        methodName: {
            public: true,          // Skip auth for this method
            authRequired: true,    // Override global auth setting
            rateLimit: '50/hour'   // Override global rate limit
        }
    }
};
```

## Available Injected Services

Every method gets these services injected:

```javascript
// Logging
this.log('Message', 'level');  // Logs to console (database in Chat 2)

// Database (placeholder - real implementation in Chat 2)
this.db.query(sql, cacheKey, ttl);

// Utilities
this.util.generateId();
this.util.getCurrentTimestamp();
this.util.validateEmail(email);
this.util.sanitizeString(str);

// Context
this.context.requestId;
this.context.user;
this.context.module;
this.context.method;
```

## API Endpoints

- `GET /health` - System health check
- `GET /api/info` - Framework and module information
- `ALL /api/:version/:module/:method` - Dynamic API routing

## Coming in Chat 2

- **Database Layer**: Real PostgreSQL + Redis caching
- **Enhanced Logging**: Database + console logging with performance metrics
- **Error Handling**: Comprehensive error wrapping and pretty responses
- **Module Wrapper**: Enhanced dependency injection with real services

## Coming in Chat 3

- **Docker Stack**: nginx + 2 Node.js + PostgreSQL + 2 Redis instances
- **Production Config**: Environment management and secrets
- **Demo APIs**: Complete working examples
- **Health Checks**: Full monitoring setup

## Framework Benefits

✅ **Zero Boilerplate**: Focus only on business logic  
✅ **Auto Registration**: Drop file → instant API  
✅ **Built-in Security**: Auth, rate limiting, validation  
✅ **Performance**: Caching, connection pooling (Chat 2)  
✅ **Monitoring**: Logging, metrics, health checks  
✅ **Error Proof**: Framework handles all error cases  
✅ **Junior Friendly**: Simple patterns, minimal complexity  

The framework is designed so junior developers can create robust, production-ready APIs without worrying about infrastructure concerns.