const { Pool } = require('pg');
const Redis = require('redis');
const crypto = require('crypto');

class DatabaseService {
    constructor() {
        this.pgPool = null;
        this.redisClient = null;
        this.redisCluster = null;
        this.isInitialized = false;
        this.stats = {
            queries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0
        };
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('[Database] Initializing PostgreSQL and Redis connections...');

        try {
            await this.initializePostgres();
            await this.initializeRedis();
            
            this.isInitialized = true;
            console.log('[Database] Successfully initialized all connections');
            
            // Test connections
            await this.testConnections();
            
        } catch (error) {
            console.error('[Database] Initialization failed:', error.message);
            throw error;
        }
    }

    async initializePostgres() {
        const config = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'api_framework',
            user: process.env.DB_USER || 'api_user',
            password: process.env.DB_PASSWORD || 'api_password',
            min: parseInt(process.env.DB_POOL_MIN || '2'),
            max: parseInt(process.env.DB_POOL_MAX || '10'),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            statement_timeout: 30000,
            query_timeout: 30000
        };

        this.pgPool = new Pool(config);
        
        // Handle pool errors
        this.pgPool.on('error', (err) => {
            console.error('[Database] PostgreSQL pool error:', err);
            this.stats.errors++;
        });

        // Test connection
        const client = await this.pgPool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        console.log(`[Database] PostgreSQL connected (pool: ${config.min}-${config.max})`);
    }

    async initializeRedis() {
        try {
            // Debug Redis environment
            console.log('[Database] Redis Configuration:');
            console.log('  REDIS_HOST:', process.env.REDIS_HOST || 'redis-1');
            console.log('  REDIS_PORT:', process.env.REDIS_PORT || '6379');
            console.log('  REDIS_CLUSTER_NODES:', process.env.REDIS_CLUSTER_NODES || 'not set');
            console.log('  REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '[SET]' : '[NOT SET]');

            // Try cluster first if nodes are configured
            const clusterNodes = process.env.REDIS_CLUSTER_NODES;
            
            if (clusterNodes) {
                console.log('[Database] Attempting Redis cluster connection...');
                const nodes = clusterNodes.split(',').map(node => {
                    const [host, port] = node.trim().split(':');
                    return { host, port: parseInt(port) };
                });

                console.log('[Database] Cluster nodes:', nodes);

                try {
                    // FIXED: Use correct Redis cluster configuration
                    const Redis = require('redis');
                    
                    this.redisCluster = Redis.createCluster({
                        rootNodes: nodes,
                        defaults: {
                            password: process.env.REDIS_PASSWORD || undefined,
                            socket: {
                                connectTimeout: 10000,
                                commandTimeout: 5000,
                                reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
                            }
                        },
                        useReplicas: true
                    });

                    // Add error handlers before connecting
                    this.redisCluster.on('error', (err) => {
                        console.error('[Database] Redis cluster error:', err.message);
                    });

                    this.redisCluster.on('connect', () => {
                        console.log('[Database] Redis cluster connecting...');
                    });

                    this.redisCluster.on('ready', () => {
                        console.log('[Database] Redis cluster ready');
                    });

                    await this.redisCluster.connect();
                    console.log(`[Database] ✅ Redis cluster connected (${nodes.length} nodes)`);
                    return;
                } catch (clusterError) {
                    console.warn('[Database] Cluster connection failed:', clusterError.message);
                    console.log('[Database] Falling back to single Redis instance...');
                    
                    // Clean up failed cluster
                    if (this.redisCluster) {
                        try {
                            await this.redisCluster.quit();
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                        this.redisCluster = null;
                    }
                }
            }

            // Fallback to single Redis instance - COMPLETELY REWRITTEN
            const redisHost = process.env.REDIS_HOST || 'redis-1';
            const redisPort = parseInt(process.env.REDIS_PORT || '6379');
            
            console.log(`[Database] Attempting single Redis connection to ${redisHost}:${redisPort}`);

            // FIXED: Use correct Redis v4+ syntax
            const Redis = require('redis');
            
            this.redisClient = Redis.createClient({
                socket: {
                    host: redisHost,
                    port: redisPort,
                    connectTimeout: 10000,
                    commandTimeout: 5000,
                    reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
                },
                password: process.env.REDIS_PASSWORD || undefined,
                database: parseInt(process.env.REDIS_DB || '0')
            });

            // Add event handlers before connecting
            this.redisClient.on('error', (err) => {
                console.error(`[Database] Redis error on ${redisHost}:${redisPort} -`, err.message);
            });

            this.redisClient.on('connect', () => {
                console.log(`[Database] ✅ Redis connecting to ${redisHost}:${redisPort}`);
            });

            this.redisClient.on('ready', () => {
                console.log(`[Database] ✅ Redis ready at ${redisHost}:${redisPort}`);
            });

            this.redisClient.on('reconnecting', () => {
                console.log(`[Database] Redis reconnecting to ${redisHost}:${redisPort}`);
            });

            this.redisClient.on('end', () => {
                console.log(`[Database] Redis connection ended`);
            });

            // Connect to Redis
            await this.redisClient.connect();
            console.log(`[Database] ✅ Successfully connected to Redis at ${redisHost}:${redisPort}`);

        } catch (error) {
            console.warn('[Database] Redis connection failed, continuing without cache:', error.message);
            console.log('[Database] Full error:', error);
            this.redisClient = null;
            this.redisCluster = null;
        }
    }
    
    async testConnections() {
        // Test PostgreSQL
        try {
            const result = await this.pgPool.query('SELECT version(), NOW() as current_time');
            console.log('[Database] PostgreSQL test successful');
        } catch (error) {
            throw new Error(`PostgreSQL test failed: ${error.message}`);
        }

        // Test Redis (if available)
        if (this.getRedisClient()) {
            try {
                const redis = this.getRedisClient();
                await redis.set('test:connection', 'ok', { EX: 5 });
                const result = await redis.get('test:connection');
                if (result === 'ok') {
                    console.log('[Database] Redis test successful');
                }
            } catch (error) {
                console.warn('[Database] Redis test failed:', error.message);
            }
        }
    }

    getRedisClient() {
        return this.redisCluster || this.redisClient;
    }

    // Main query method with automatic caching
    async query(sql, params = [], cacheKey = null, ttlSeconds = 300) {
        this.stats.queries++;
        
        try {
            // Try cache first if cacheKey provided
            if (cacheKey) {
                const cached = await this.getFromCache(cacheKey);
                if (cached !== null) {
                    this.stats.cacheHits++;
                    return {
                        ...cached,
                        fromCache: true,
                        stats: this.getStats()
                    };
                }
                this.stats.cacheMisses++;
            }

            // Execute query
            const startTime = Date.now();
            const result = await this.pgPool.query(sql, params);
            const queryTime = Date.now() - startTime;

            const queryResult = {
                rows: result.rows,
                rowCount: result.rowCount,
                command: result.command,
                queryTime,
                fromCache: false
            };

            // Cache result if cacheKey provided and it's a SELECT
            if (cacheKey && result.command === 'SELECT' && result.rows.length > 0) {
                await this.setCache(cacheKey, queryResult, ttlSeconds);
            }

            return {
                ...queryResult,
                stats: this.getStats()
            };

        } catch (error) {
            this.stats.errors++;
            throw this.formatDatabaseError(error, sql);
        }
    }

    // Transaction support
    async transaction(callback) {
        const client = await this.pgPool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Create a transaction wrapper
            const txWrapper = {
                query: async (sql, params = []) => {
                    const result = await client.query(sql, params);
                    return {
                        rows: result.rows,
                        rowCount: result.rowCount,
                        command: result.command,
                        fromCache: false
                    };
                }
            };

            const result = await callback(txWrapper);
            await client.query('COMMIT');
            return result;

        } catch (error) {
            await client.query('ROLLBACK');
            throw this.formatDatabaseError(error, 'TRANSACTION');
        } finally {
            client.release();
        }
    }

    // Cache operations
    async getFromCache(key) {
        const redis = this.getRedisClient();
        if (!redis) return null;

        try {
            const cached = await redis.get(this.buildCacheKey(key));
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.warn('[Database] Cache get failed:', error.message);
            return null;
        }
    }

    async setCache(key, data, ttlSeconds = 300) {
        const redis = this.getRedisClient();
        if (!redis) return false;

        try {
            const cacheKey = this.buildCacheKey(key);
            const serialized = JSON.stringify(data);
            await redis.set(cacheKey, serialized, { EX: ttlSeconds });
            return true;
        } catch (error) {
            console.warn('[Database] Cache set failed:', error.message);
            return false;
        }
    }

    async invalidateCache(pattern) {
        const redis = this.getRedisClient();
        if (!redis) return 0;

        try {
            const keys = await redis.keys(this.buildCacheKey(pattern));
            if (keys.length > 0) {
                return await redis.del(keys);
            }
            return 0;
        } catch (error) {
            console.warn('[Database] Cache invalidation failed:', error.message);
            return 0;
        }
    }

    buildCacheKey(key) {
        const prefix = process.env.REDIS_KEY_PREFIX || 'api';
        return `${prefix}:${key}`;
    }

    // Helper methods for common patterns
    async findById(table, id, cacheKey = null, ttl = 300) {
        const sql = `SELECT * FROM ${table} WHERE id = $1`;
        const key = cacheKey || `${table}:${id}`;
        const result = await this.query(sql, [id], key, ttl);
        return result.rows[0] || null;
    }

    async findByField(table, field, value, cacheKey = null, ttl = 300) {
        const sql = `SELECT * FROM ${table} WHERE ${field} = $1`;
        const key = cacheKey || `${table}:${field}:${value}`;
        const result = await this.query(sql, [value], key, ttl);
        return result.rows;
    }

    async insert(table, data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        
        const sql = `
            INSERT INTO ${table} (${fields.join(', ')}) 
            VALUES (${placeholders}) 
            RETURNING *
        `;
        
        const result = await this.query(sql, values);
        
        // Invalidate related cache
        await this.invalidateCache(`${table}:*`);
        
        return result.rows[0];
    }

    async update(table, id, data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
        
        const sql = `
            UPDATE ${table} 
            SET ${setClause}, updated_at = NOW() 
            WHERE id = $1 
            RETURNING *
        `;
        
        const result = await this.query(sql, [id, ...values]);
        
        // Invalidate related cache
        await this.invalidateCache(`${table}:*`);
        
        return result.rows[0];
    }

    async delete(table, id) {
        const sql = `DELETE FROM ${table} WHERE id = $1 RETURNING id`;
        const result = await this.query(sql, [id]);
        
        // Invalidate related cache
        await this.invalidateCache(`${table}:*`);
        
        return result.rowCount > 0;
    }

    // Health check
    async healthCheck() {
        const health = {
            postgres: false,
            redis: false,
            stats: this.getStats()
        };

        try {
            await this.pgPool.query('SELECT 1');
            health.postgres = true;
        } catch (error) {
            console.error('[Database] PostgreSQL health check failed:', error.message);
        }

        const redis = this.getRedisClient();
        if (redis) {
            try {
                await redis.ping();
                health.redis = true;
            } catch (error) {
                console.error('[Database] Redis health check failed:', error.message);
            }
        }

        return health;
    }

    getStats() {
        return {
            ...this.stats,
            cacheHitRate: this.stats.queries > 0 
                ? ((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    formatDatabaseError(error, sql) {
        // Format PostgreSQL errors into more user-friendly messages
        const formattedError = {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            statusCode: 500,
            originalError: error.message
        };

        // Common PostgreSQL error codes
        switch (error.code) {
            case '23505': // unique_violation
                formattedError.code = 'DUPLICATE_ENTRY';
                formattedError.message = 'Record already exists';
                formattedError.statusCode = 409;
                break;
            case '23503': // foreign_key_violation
                formattedError.code = 'FOREIGN_KEY_VIOLATION';
                formattedError.message = 'Referenced record does not exist';
                formattedError.statusCode = 400;
                break;
            case '23502': // not_null_violation
                formattedError.code = 'REQUIRED_FIELD_MISSING';
                formattedError.message = 'Required field cannot be empty';
                formattedError.statusCode = 400;
                break;
            case '42703': // undefined_column
                formattedError.code = 'INVALID_FIELD';
                formattedError.message = 'Invalid field in query';
                formattedError.statusCode = 400;
                break;
            case '42P01': // undefined_table
                formattedError.code = 'TABLE_NOT_FOUND';
                formattedError.message = 'Table does not exist';
                formattedError.statusCode = 500;
                break;
        }

        // Add query context in development
        if (process.env.NODE_ENV === 'development') {
            formattedError.query = sql;
        }

        return formattedError;
    }

    async cleanup() {
        console.log('[Database] Cleaning up connections...');
        
        try {
            if (this.pgPool) {
                await this.pgPool.end();
                console.log('[Database] PostgreSQL pool closed');
            }

            if (this.redisClient) {
                await this.redisClient.quit();
                console.log('[Database] Redis client closed');
            }

            if (this.redisCluster) {
                await this.redisCluster.quit();
                console.log('[Database] Redis cluster closed');
            }

        } catch (error) {
            console.error('[Database] Error during cleanup:', error.message);
        }

        this.isInitialized = false;
    }
}

module.exports = DatabaseService;