class DependencyContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        console.log('[DependencyContainer] Initializing services...');
        
        // Register core services
        this.registerService('config', () => this.createConfigService());
        this.registerService('logger', () => this.createLoggerService());
        this.registerService('db', () => this.createDatabaseService());
        this.registerService('cache', () => this.createCacheService());
        this.registerService('util', () => this.createUtilService());

        // Initialize singleton services
        await this.initializeSingletons();
        
        this.initialized = true;
        console.log('[DependencyContainer] Services initialized');
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

    async initializeSingletons() {
        const singletonServices = Array.from(this.services.entries())
            .filter(([_, service]) => service.singleton);

        for (const [name, _] of singletonServices) {
            await this.getService(name);
        }
    }

    // Wrap a module with injected dependencies
    wrapModule(moduleInstance, context) {
        const wrapper = {};
        
        // Copy all methods from the module
        for (const [key, value] of Object.entries(moduleInstance)) {
            if (typeof value === 'function' && !key.startsWith('_')) {
                wrapper[key] = value.bind(wrapper);
            }
        }

        // Inject dependencies
        this.injectDependencies(wrapper, context);
        
        return wrapper;
    }

    injectDependencies(wrapper, context) {
        // Inject basic services (these will be enhanced in Chat 2)
        wrapper.log = (message, level = 'info') => {
            // Placeholder for logger - will be implemented in Chat 2
            console.log(`[${context.module}] ${message}`);
        };

        wrapper.db = {
            // Placeholder for database - will be implemented in Chat 2
            query: async (sql, cacheKey, ttl) => {
                console.log(`[DB] Query: ${sql} (cache: ${cacheKey}, ttl: ${ttl})`);
                return { placeholder: 'Database service coming in Chat 2' };
            }
        };

        wrapper.util = {
            // Basic utility functions
            generateId: () => require('uuid').v4(),
            getCurrentTimestamp: () => new Date().toISOString(),
            validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            sanitizeString: (str) => str?.toString().trim() || '',
            parseInteger: (value, defaultValue = 0) => {
                const parsed = parseInt(value, 10);
                return isNaN(parsed) ? defaultValue : parsed;
            }
        };

        // Inject context information
        wrapper.context = {
            requestId: context.req.id,
            instanceId: context.req.instanceId,
            user: context.user || null,
            startTime: context.req.startTime,
            module: context.module,
            method: context.method,
            version: context.version
        };
    }

    // Service factory methods (placeholders for Chat 2)
    createConfigService() {
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
            isDevelopment: () => process.env.NODE_ENV === 'development',
            isProduction: () => process.env.NODE_ENV === 'production'
        };
    }

    createLoggerService() {
        // Placeholder - will be enhanced in Chat 2
        return {
            info: (message, meta = {}) => console.log(`[INFO] ${message}`, meta),
            warn: (message, meta = {}) => console.warn(`[WARN] ${message}`, meta),
            error: (message, meta = {}) => console.error(`[ERROR] ${message}`, meta),
            debug: (message, meta = {}) => {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[DEBUG] ${message}`, meta);
                }
            }
        };
    }

    createDatabaseService() {
        // Placeholder - will be implemented in Chat 2
        return {
            query: async (sql, params = []) => {
                console.log('[DB] Placeholder query:', sql, params);
                return { rows: [] };
            },
            transaction: async (callback) => {
                console.log('[DB] Placeholder transaction');
                return await callback();
            }
        };
    }

    createCacheService() {
        // Placeholder - will be implemented in Chat 2
        return {
            get: async (key) => {
                console.log('[Cache] Placeholder get:', key);
                return null;
            },
            set: async (key, value, ttl = 300) => {
                console.log('[Cache] Placeholder set:', key, ttl);
                return true;
            },
            del: async (key) => {
                console.log('[Cache] Placeholder delete:', key);
                return true;
            }
        };
    }

    createUtilService() {
        return {
            generateHash: (data) => {
                return require('crypto').createHash('sha256').update(data).digest('hex');
            },
            formatDate: (date, format = 'ISO') => {
                const d = new Date(date);
                switch (format) {
                    case 'ISO':
                        return d.toISOString();
                    case 'date':
                        return d.toISOString().split('T')[0];
                    case 'time':
                        return d.toISOString().split('T')[1].split('.')[0];
                    default:
                        return d.toString();
                }
            },
            delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
            retry: async (fn, maxAttempts = 3, delayMs = 1000) => {
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        return await fn();
                    } catch (error) {
                        if (attempt === maxAttempts) throw error;
                        await this.delay(delayMs * attempt);
                    }
                }
            }
        };
    }

    async cleanup() {
        console.log('[DependencyContainer] Cleaning up services...');
        
        // Cleanup each singleton service
        for (const [name, instance] of this.singletons) {
            if (instance && typeof instance.cleanup === 'function') {
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
    }
}

module.exports = DependencyContainer;