const DatabaseService = require('./database');
const LoggingService = require('./logger');
const ErrorHandler = require('./errorHandler');
const ModuleWrapper = require('./wrapper');

class DependencyContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.initialized = false;
        
        // Core infrastructure services
        this.databaseService = null;
        this.loggingService = null;
        this.errorHandler = null;
        this.moduleWrapper = null;
    }

    async initialize() {
        if (this.initialized) return;

        console.log('[DependencyContainer] Initializing Chat 2 infrastructure services...');
        
        try {
            // Initialize database service first
            this.databaseService = new DatabaseService();
            await this.databaseService.initialize();
            console.log('[DependencyContainer] Database service initialized');

            // Initialize logging service with database
            this.loggingService = new LoggingService(this.databaseService);
            console.log('[DependencyContainer] Logging service initialized');

            // Initialize error handler with logger
            this.errorHandler = new ErrorHandler(this.loggingService);
            console.log('[DependencyContainer] Error handler initialized');

            // Initialize module wrapper with all services
            this.moduleWrapper = new ModuleWrapper(
                this.databaseService,
                this.loggingService,
                this.errorHandler
            );
            console.log('[DependencyContainer] Module wrapper initialized');

            // Register enhanced services
            this.registerEnhancedServices();
            
            this.initialized = true;
            console.log('[DependencyContainer] Chat 2 services fully initialized');
            
            // Test all services
            await this.runHealthChecks();
            
        } catch (error) {
            console.error('[DependencyContainer] Initialization failed:', error.message);
            throw error;
        }
    }

    registerEnhancedServices() {
        // Register database service
        this.registerService('database', () => this.databaseService);
        this.registerService('db', () => this.databaseService);

        // Register logging service
        this.registerService('logger', () => this.loggingService);
        this.registerService('log', () => this.loggingService);

        // Register error handler
        this.registerService('errorHandler', () => this.errorHandler);
        this.registerService('errors', () => this.errorHandler);

        // Register module wrapper
        this.registerService('wrapper', () => this.moduleWrapper);

        // Register enhanced config service
        this.registerService('config', () => this.createEnhancedConfigService());

        // Register utility services
        this.registerService('util', () => this.createEnhancedUtilService());

        // Register monitoring service
        this.registerService('monitor', () => this.createMonitoringService());
    }

    registerService(name, factory, singleton = true) {
        this.services.set(name, { factory, singleton });
    }

    async getService(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' not registered`);
        }

        if (service.singleton) {
            if (!this.singletons.has(name)) {
                const instance = await service.factory();
                this.singletons.set(name, instance);
            }
            return this.singletons.get(name);
        }

        return await service.factory();
    }

    // Enhanced module wrapping with Chat 2 features
    wrapModule(moduleInstance, context) {
        if (!this.moduleWrapper) {
            throw new Error('Module wrapper not initialized. Call initialize() first.');
        }

        return this.moduleWrapper.wrapModule(moduleInstance, context);
    }

    // Create enhanced configuration service
    createEnhancedConfigService() {
        return {
            get: (key, defaultValue = null) => {
                return process.env[key] || defaultValue;
            },
            
            getRequired: (key) => {
                const value = process.env[key];
                if (!value) {
                    throw new Error(`Required environment variable '${key}' not set`);
                }
                return value;
            },
            
            getInt: (key, defaultValue = 0) => {
                const value = process.env[key];
                if (!value) return defaultValue;
                const parsed = parseInt(value, 10);
                return isNaN(parsed) ? defaultValue : parsed;
            },
            
            getFloat: (key, defaultValue = 0.0) => {
                const value = process.env[key];
                if (!value) return defaultValue;
                const parsed = parseFloat(value);
                return isNaN(parsed) ? defaultValue : parsed;
            },
            
            getBool: (key, defaultValue = false) => {
                const value = process.env[key];
                if (!value) return defaultValue;
                return value.toLowerCase() === 'true';
            },
            
            getArray: (key, separator = ',', defaultValue = []) => {
                const value = process.env[key];
                if (!value) return defaultValue;
                return value.split(separator).map(item => item.trim());
            },
            
            isDevelopment: () => process.env.NODE_ENV === 'development',
            isProduction: () => process.env.NODE_ENV === 'production',
            isTesting: () => process.env.NODE_ENV === 'test',
            
            // Database configuration
            getDatabaseConfig: () => ({
                host: this.get('DB_HOST', 'localhost'),
                port: this.getInt('DB_PORT', 5432),
                database: this.get('DB_NAME', 'api_framework'),
                user: this.get('DB_USER', 'api_user'),
                password: this.get('DB_PASSWORD', 'api_password'),
                poolMin: this.getInt('DB_POOL_MIN', 2),
                poolMax: this.getInt('DB_POOL_MAX', 10)
            }),
            
            // Redis configuration
            getRedisConfig: () => ({
                host: this.get('REDIS_HOST', 'localhost'),
                port: this.getInt('REDIS_PORT', 6379),
                password: this.get('REDIS_PASSWORD'),
                db: this.getInt('REDIS_DB', 0),
                clusterNodes: this.getArray('REDIS_CLUSTER_NODES'),
                keyPrefix: this.get('REDIS_KEY_PREFIX', 'api')
            }),
            
            // Security configuration
            getSecurityConfig: () => ({
                jwtSecret: this.getRequired('JWT_SECRET'),
                allowedOrigins: this.getArray('ALLOWED_ORIGINS'),
                encryptionKey: this.get('ENCRYPTION_KEY'),
                hashRounds: this.getInt('HASH_ROUNDS', 12)
            })
        };
    }

    // Create enhanced utility service
    createEnhancedUtilService() {
        return {
            // Crypto utilities
            generateHash: (data, algorithm = 'sha256') => {
                return require('crypto').createHash(algorithm).update(data).digest('hex');
            },
            
            generateSecureRandom: (length = 32) => {
                return require('crypto').randomBytes(length).toString('hex');
            },
            
            // Enhanced date utilities
            formatDate: (date, format = 'ISO', timezone = 'UTC') => {
                const d = new Date(date);
                
                switch (format) {
                    case 'ISO':
                        return d.toISOString();
                    case 'date':
                        return d.toISOString().split('T')[0];
                    case 'time':
                        return d.toISOString().split('T')[1].split('.')[0];
                    case 'datetime':
                        return d.toISOString().replace('T', ' ').split('.')[0];
                    case 'timestamp':
                        return Math.floor(d.getTime() / 1000);
                    case 'human':
                        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
                    default:
                        return d.toString();
                }
            },
            
            parseDate: (dateString) => {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    throw new Error(`Invalid date string: ${dateString}`);
                }
                return date;
            },
            
            addDays: (date, days) => {
                const result = new Date(date);
                result.setDate(result.getDate() + days);
                return result;
            },
            
            diffDays: (date1, date2) => {
                const oneDay = 24 * 60 * 60 * 1000;
                return Math.round((new Date(date1) - new Date(date2)) / oneDay);
            },
            
            // Enhanced async utilities
            delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
            
            timeout: (promise, ms, errorMessage = 'Operation timed out') => {
                return Promise.race([
                    promise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(errorMessage)), ms)
                    )
                ]);
            },
            
            retry: async (fn, options = {}) => {
                const defaults = {
                    maxAttempts: 3,
                    delayMs: 1000,
                    backoff: 'linear', // linear, exponential
                    maxDelay: 10000
                };
                
                const config = { ...defaults, ...options };
                
                for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
                    try {
                        return await fn();
                    } catch (error) {
                        if (attempt === config.maxAttempts) {
                            throw error;
                        }
                        
                        let delay = config.delayMs;
                        if (config.backoff === 'exponential') {
                            delay = Math.min(config.delayMs * Math.pow(2, attempt - 1), config.maxDelay);
                        } else if (config.backoff === 'linear') {
                            delay = config.delayMs * attempt;
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            },
            
            // Batch processing utilities
            batchProcess: async (items, batchSize, processor) => {
                const results = [];
                
                for (let i = 0; i < items.length; i += batchSize) {
                    const batch = items.slice(i, i + batchSize);
                    const batchResults = await Promise.all(batch.map(processor));
                    results.push(...batchResults);
                }
                
                return results;
            },
            
            // Performance utilities
            measurePerformance: async (fn, label = 'operation') => {
                const startTime = Date.now();
                const startMemory = process.memoryUsage();
                
                try {
                    const result = await fn();
                    const endTime = Date.now();
                    const endMemory = process.memoryUsage();
                    
                    return {
                        result,
                        performance: {
                            executionTime: endTime - startTime,
                            memoryUsage: {
                                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                                heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                                rss: endMemory.rss - startMemory.rss
                            }
                        }
                    };
                } catch (error) {
                    const endTime = Date.now();
                    throw {
                        ...error,
                        executionTime: endTime - startTime
                    };
                }
            }
        };
    }

    // Create monitoring service
    createMonitoringService() {
        return {
            // Health check aggregator
            checkHealth: async () => {
                const health = {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    services: {}
                };

                try {
                    // Check database health
                    health.services.database = await this.databaseService.healthCheck();
                } catch (error) {
                    health.services.database = { status: 'unhealthy', error: error.message };
                    health.status = 'degraded';
                }

                // Check memory usage
                const memory = process.memoryUsage();
                health.services.memory = {
                    status: memory.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning', // 500MB threshold
                    heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
                    heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
                    rss: Math.round(memory.rss / 1024 / 1024) + 'MB'
                };

                // Check uptime
                health.services.uptime = {
                    status: 'healthy',
                    seconds: Math.floor(process.uptime()),
                    human: this.formatUptime(process.uptime())
                };

                return health;
            },

            // Get system metrics
            getMetrics: async () => {
                const metrics = {
                    timestamp: new Date().toISOString(),
                    process: {
                        pid: process.pid,
                        uptime: process.uptime(),
                        memory: process.memoryUsage(),
                        cpu: process.cpuUsage()
                    }
                };

                // Add database stats if available
                if (this.databaseService) {
                    metrics.database = this.databaseService.getStats();
                }

                // Add error stats if available
                if (this.errorHandler) {
                    metrics.errors = this.errorHandler.getErrorStats();
                }

                return metrics;
            },

            formatUptime: (seconds) => {
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);

                const parts = [];
                if (days > 0) parts.push(`${days}d`);
                if (hours > 0) parts.push(`${hours}h`);
                if (minutes > 0) parts.push(`${minutes}m`);
                if (secs > 0) parts.push(`${secs}s`);

                return parts.join(' ') || '0s';
            }
        };
    }

    async runHealthChecks() {
        console.log('[DependencyContainer] Running health checks...');

        try {
            // Test database connection
            if (this.databaseService) {
                const dbHealth = await this.databaseService.healthCheck();
                if (dbHealth.postgres) {
                    console.log('[DependencyContainer] ✅ Database connection healthy');
                } else {
                    console.warn('[DependencyContainer] ⚠️ Database connection issues');
                }
            }

            // Test logging
            if (this.loggingService) {
                this.loggingService.info('Health check: Logging service operational');
                console.log('[DependencyContainer] ✅ Logging service healthy');
            }

            // Test error handling
            if (this.errorHandler) {
                console.log('[DependencyContainer] ✅ Error handler ready');
            }

            console.log('[DependencyContainer] All health checks completed');

        } catch (error) {
            console.error('[DependencyContainer] Health check failed:', error.message);
            throw error;
        }
    }

    async cleanup() {
        console.log('[DependencyContainer] Cleaning up Chat 2 services...');
        
        try {
            // Cleanup logging service first (flush pending logs)
            if (this.loggingService) {
                await this.loggingService.cleanup();
                console.log('[DependencyContainer] Logging service cleaned up');
            }

            // Cleanup database connections
            if (this.databaseService) {
                await this.databaseService.cleanup();
                console.log('[DependencyContainer] Database service cleaned up');
            }

            // Cleanup other singletons
            for (const [name, instance] of this.singletons) {
                if (instance && typeof instance.cleanup === 'function' && 
                    name !== 'logger' && name !== 'database') {
                    try {
                        await instance.cleanup();
                        console.log(`[DependencyContainer] Cleaned up service: ${name}`);
                    } catch (error) {
                        console.error(`[DependencyContainer] Error cleaning up service ${name}:`, error);
                    }
                }
            }

            this.singletons.clear();
            this.initialized = false;
            console.log('[DependencyContainer] Chat 2 cleanup completed');

        } catch (error) {
            console.error('[DependencyContainer] Error during cleanup:', error.message);
        }
    }
}

module.exports = DependencyContainer;