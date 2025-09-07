# Complete Docker Infrastructure + Demo APIs

## 🚀 Quick Start

### Prerequisites
- Docker 20.0+ with Docker Compose
- 4GB+ RAM recommended
- Ports 80, 5432, 6379, 6380, 8080, 8081 available

### 1. One-Command Startup
```bash
chmod +x scripts/start-chat3.sh
./scripts/start-chat3.sh
```

This script will:
- ✅ Check Docker installation
- ✅ Create necessary directories
- ✅ Build all Docker images
- ✅ Start services in correct order
- ✅ Wait for health checks
- ✅ Test API endpoints
- ✅ Display service URLs

### 2. Manual Setup (Alternative)
```bash
# Copy environment configuration
cp config/production.env .env

# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

## 🌐 Service URLs

### API Endpoints
- **🌐 Main API**: http://localhost/api
- **🏥 Health Check**: http://localhost/health
- **📊 API Info**: http://localhost/api/info
- **📈 Metrics**: http://localhost/metrics (internal network only)

### Management Interfaces
- **🗄️ Database Admin (Adminer)**: http://localhost:8080
- **🔴 Redis Commander**: http://localhost:8081

### Specific API Modules
- **👥 Users API**: http://localhost/api/v1/users
- **🛍️ Products API**: http://localhost/api/v1/products  
- **🎯 Demo API**: http://localhost/api/v1/demo

## 🧪 API Testing

### Test Authentication Flow
```bash
# Register new user
curl -X POST http://localhost/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'

# Login to get token
curl -X POST http://localhost/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "test@example.com",
    "password": "password123"
  }'

# Use token for authenticated requests
TOKEN="your-jwt-token-here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/users/getProfile
```

### Test Products API
```bash
# Get all products
curl http://localhost/api/v1/products/getProducts

# Get specific product
curl http://localhost/api/v1/products/getProduct?product=professional-laptop-15-intel-i7

# Search products
curl "http://localhost/api/v1/products/searchProducts?query=laptop&limit=5"

# Get categories
curl http://localhost/api/v1/products/getCategories?include_count=true

# Get products by category
curl http://localhost/api/v1/products/getProductsByCategory?category=electronics
```

### Test Demo API
```bash
# Public data (no auth required)
curl http://localhost/api/v1/demo/getPublicData

# Create record (requires auth)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Record","description":"API Test","category":"test"}' \
  http://localhost/api/v1/demo/createRecord
```

## 🔑 Default Accounts

The system comes with pre-configured test accounts:

### Admin Account
- **Email**: admin@example.com
- **Password**: password123
- **Roles**: admin, user
- **Permissions**: Full access

### Demo User
- **Email**: demo@example.com  
- **Password**: password123
- **Roles**: user
- **Permissions**: read, write

### Product Manager
- **Email**: manager@example.com
- **Password**: password123
- **Roles**: manager, user
- **Permissions**: read, write, manage_products

## 🗄️ Database Schema

The system includes comprehensive database schemas:

### Users Table (`api_users`)
- Complete user management with roles/permissions
- Authentication tracking and security features
- Profile management and preferences
- API quota and rate limiting support

### Products System
- **Categories** (`product_categories`): Hierarchical product categorization
- **Products** (`products`): Full e-commerce product catalog
- Advanced search, inventory, analytics, and SEO features

### Infrastructure Tables
- **Logs** (`api_logs`): Comprehensive application logging
- **Sessions** (`user_sessions`): Session management
- **API Keys** (`api_keys`): API authentication and rate limiting

## 🔧 Configuration

### Environment Variables
Key configuration in `.env`:

```bash
# Application
NODE_ENV=production
PORT=3000

# Security (CHANGE IN PRODUCTION!)
JWT_SECRET=your-secure-secret-here
ENCRYPTION_KEY=your-32-char-key-here

# Database
DB_HOST=postgres
DB_PASSWORD=secure_password_123

# Redis
REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379
REDIS_PASSWORD=redis_password_123

# Features
ENABLE_METRICS=true
DEFAULT_RATE_LIMIT=1000/hour
```

### Nginx Load Balancer
- **Sticky Sessions**: IP-based session affinity
- **Rate Limiting**: Per-endpoint rate limiting
- **Health Checks**: Automatic failover
- **SSL Ready**: Self-signed certs for development

## 📊 Monitoring & Health

### Health Checks
```bash
# Overall system health
curl http://localhost/health

# Individual service health  
curl http://localhost/api/v1/users/health
curl http://localhost/api/v1/products/health
curl http://localhost/api/v1/demo/health
```

### Performance Metrics
```bash
# System metrics (internal network only)
docker-compose exec api-node-1 curl http://localhost:3000/api/metrics

# Database stats
curl http://localhost/api/info
```

### Logging
```bash
# View all logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f api-node-1
docker-compose logs -f nginx
docker-compose logs -f postgres

# Application logs (in database)
# Use Adminer at http://localhost:8080 to query api_logs table
```

## 🔄 Scaling & Operations

### Horizontal Scaling
```bash
# Scale API instances
docker-compose up -d --scale api-node-1=3 --scale api-node-2=2

# Check scaled services
docker-compose ps
```

### Service Management
```bash
# Restart specific service
docker-compose restart api-node-1

# Update and redeploy
docker-compose build api-node-1
docker-compose up -d api-node-1

# Rolling restart (zero downtime)
docker-compose restart api-node-1
sleep 10
docker-compose restart api-node-2
```

### Database Operations
```bash
# Database backup
docker-compose exec postgres pg_dump -U api_user api_framework > backup.sql

# Database restore
docker-compose exec -T postgres psql -U api_user api_framework < backup.sql

# Access database directly
docker-compose exec postgres psql -U api_user api_framework
```

## 🛠️ Development Workflow

### For Junior Developers

Creating a new API module is incredibly simple:

1. **Create module file** (`routes/orders.js`):
```javascript
const _moduleConfig = {
    routerName: 'orders',
    version: 'v1',
    authRequired: true,
    methods: {
        getOrders: { rateLimit: '100/hour' },
        createOrder: { rateLimit: '20/hour' }
    }
};

async function getOrders(req, data) {
    this.log('Fetching user orders');
    
    const orders = await this.db.query(
        'SELECT * FROM orders WHERE user_id = $1',
        [this.context.user.id],
        `orders:${this.context.user.id}`,
        300 // 5 min cache
    );
    
    return { orders: orders.rows };
}

async function createOrder(req, data) {
    this.util.validate(data, {
        product_id: { required: true },
        quantity: { required: true, type: 'number' }
    });
    
    const order = await this.db.insert('orders', {
        user_id: this.context.user.id,
        product_id: data.product_id,
        quantity: data.quantity
    });
    
    return { order };
}

module.exports = { _moduleConfig, getOrders, createOrder };
```

2. **That's it!** Your API is automatically:
   - ✅ Registered at `/api/v1/orders/*`
   - ✅ Load balanced across instances
   - ✅ Rate limited and authenticated  
   - ✅ Logged and monitored
   - ✅ Cached appropriately
   - ✅ Error-wrapped and formatted

### Advanced Features

The framework provides advanced features out of the box:

- **Database Transactions**: `await this.db.transaction(callback)`
- **Cache Operations**: `await this.cache.set/get/invalidate()`
- **Input Validation**: `this.util.validate(data, rules)`
- **Logging**: `this.log(message, level)`
- **Context Access**: `this.context.user`, `this.context.requestId`
- **Utilities**: Date formatting, ID generation, async helpers

## 🔧 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker resources
docker system df
docker system prune

# Check port conflicts
netstat -tulpn | grep :80
```

**Database connection issues:**
```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres pg_isready -U api_user
```

**API errors:**
```bash
# Check API logs
docker-compose logs api-node-1 api-node-2

# Check application logs in database
# Use Adminer to query api_logs table
```

### Performance Tuning

**For high load:**
1. Increase API instances: `docker-compose up -d --scale api-node-1=4`
2. Tune PostgreSQL settings in `docker-compose.yml`
3. Increase Redis memory: `maxmemory 512mb`
4. Adjust nginx worker connections

**For development:**
1. Reduce cache TTL for faster iteration
2. Enable debug logging: `LOG_LEVEL=debug`
3. Disable rate limiting: `DEFAULT_RATE_LIMIT=10000/hour`

## 📁 Project Structure

```
chat3-api-framework/
├── 🐳 Docker Infrastructure
│   ├── docker-compose.yml        # Complete orchestration
│   ├── Dockerfile                # Node.js API container
│   └── nginx/
│       ├── Dockerfile             # Nginx container
│       └── nginx.conf             # Load balancer config
├── 🗄️ Database Setup
│   └── sql/init/
│       ├── 01-init.sql           # Schema and indexes
│       └── 02-sample-data.sql    # Demo data
├── 🎯 API Modules (Chat 1-2 + New)
│   ├── routes/
│   │   ├── users.js              # Complete user management
│   │   ├── products.js           # E-commerce catalog
│   │   └── demo.js               # Enhanced demo API
│   └── core/                     # Framework infrastructure
├── ⚙️ Configuration
│   ├── config/production.env     # Environment template
│   └── .env                      # Active configuration
├── 📝 Scripts & Tools
│   ├── scripts/start-chat3.sh    # One-command setup
│   └── scripts/                  # Utility scripts
└── 📚 Documentation
    ├── README-CHAT3.md           # This guide
    └── README.md                 # Framework overview
```

## 🎯 Framework Benefits

### For Developers
- **Zero Boilerplate**: Write only business logic
- **Auto-Discovery**: Drop file → instant API
- **Production Ready**: Monitoring, logging, caching built-in
- **Type Safety**: Input validation and error handling
- **Performance**: Automatic caching and optimization

### For Operations
- **Docker Native**: Complete containerization
- **Load Balanced**: Nginx with sticky sessions
- **Highly Available**: Multi-instance with failover
- **Monitored**: Health checks and metrics
- **Scalable**: Horizontal scaling support

### For Business
- **Fast Development**: Junior developers productive immediately
- **Reliable**: Bulletproof error handling and logging
- **Secure**: Authentication, authorization, rate limiting
- **Maintainable**: Clean patterns and documentation

## 🚀 Next Steps

1. **Customize Configuration**: Update `.env` with your settings
2. **Add Your APIs**: Create new modules in `routes/`
3. **Setup Domain**: Configure nginx for your domain
4. **Add SSL Certificates**: Replace self-signed certs
5. **Setup Monitoring**: Add external monitoring tools
6. **Configure Backups**: Setup automated database backups

## 📞 Support

**Framework Architecture**: Built on enterprise patterns from Chats 1-2
**Docker Infrastructure**: Production-ready orchestration
**Demo APIs**: Complete working examples
**Documentation**: Comprehensive guides and examples

The Chat 3 framework is ready for production use with minimal configuration changes. The combination of the robust infrastructure from Chats 1-2 plus the complete Docker orchestration makes this a enterprise-grade API platform.

---

**🎉 Congratulations!** You now have a complete, production-ready API framework that rivals enterprise solutions, but remains simple enough for junior developers to use effectively.