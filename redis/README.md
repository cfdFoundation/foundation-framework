# Redis Round-Robin Load Balancing Setup

## 🎯 **Architecture Overview**

Instead of complex Redis Cluster, we use a simple and reliable round-robin load balancing approach:

```
Node.js Apps → HAProxy (redis-proxy) → Redis-1, Redis-2
```

## ✅ **Benefits of This Approach**

1. **Simplicity**: No cluster complexity or slot management
2. **Reliability**: HAProxy is battle-tested for load balancing
3. **Easy Scaling**: Add more Redis nodes by just updating HAProxy config
4. **No Code Changes**: Node.js apps connect to single endpoint
5. **Fault Tolerance**: HAProxy handles node failures gracefully

## 🔧 **How It Works**

### **HAProxy Configuration**
- Load balances Redis commands across 2+ Redis instances
- Health checks each Redis node (AUTH + PING)
- Round-robin distribution of requests
- Automatic failover if a node goes down

### **Node.js Connection**
- Apps connect to `redis-proxy:6379`
- HAProxy distributes requests to healthy Redis nodes
- Transparent to the application code

### **Redis Instances**
- Independent Redis instances (not clustered)
- Each has its own data persistence
- Password authentication required

## 📈 **Scaling to More Nodes**

To add a third Redis node:

1. **Add to docker-compose.yml**:
```yaml
redis-3:
  image: redis:7-alpine
  container_name: api_redis_3
  ports:
    - "6381:6379"
  # ... same config as redis-1/redis-2
```

2. **Update HAProxy config** in `redis/haproxy.cfg`:
```
# Uncomment this line:
server redis-3 redis-3:6379 check inter 5s rise 2 fall 3
```

3. **Restart HAProxy**:
```bash
docker-compose restart redis-proxy
```

**That's it!** No Node.js code changes needed.

## 🔍 **Monitoring**

- **HAProxy Stats**: http://localhost:8404/stats
- **Redis Commander**: http://localhost:8081 (shows both nodes)
- **Health Checks**: HAProxy automatically monitors Redis nodes

## 🛡️ **Data Consistency Notes**

Since this isn't a cluster:
- Each Redis instance has independent data
- Cache entries may not be replicated between nodes  
- This is perfect for **cache** use cases (not primary data storage)
- Cache misses simply regenerate from PostgreSQL

## 🚀 **Production Considerations**

- Use Redis Sentinel for high availability
- Consider Redis replication for important cache data
- Monitor HAProxy stats for load distribution
- Set appropriate Redis memory limits and eviction policies

This setup provides excellent performance and reliability for caching workloads while maintaining simplicity and ease of management.