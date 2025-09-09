// backend/core/wrapper.js
// Enhanced Module Wrapper with User Context and Role Utilities

class ModuleWrapper {
    constructor(databaseService, loggingService, errorHandler) {
        this.db = databaseService;
        this.logger = loggingService;
        this.errorHandler = errorHandler;
    }

    // Wrap a complete module with all dependency injection
    wrapModule(moduleInstance, context) {
        const wrapped = {};
        
        // Copy configuration (prefixed with _)
        for (const [key, value] of Object.entries(moduleInstance)) {
            if (key.startsWith('_')) {
                wrapped[key] = value;
            }
        }

        // Wrap all business logic methods
        for (const [methodName, method] of Object.entries(moduleInstance)) {
            if (typeof method === 'function' && !methodName.startsWith('_')) {
                wrapped[methodName] = this.wrapMethod(method, methodName, context);
            }
        }

        return wrapped;
    }

    // Wrap individual method with error handling and dependency injection
    wrapMethod(originalMethod, methodName, baseContext) {
        return async (req, data) => {
            // Create method-specific context
            const context = {
                ...baseContext,
                method: methodName,
                req: req,
                user: req.user || baseContext.user,
                requestId: req.id || baseContext.requestId,
                instanceId: req.instanceId || baseContext.instanceId,
                startTime: req.startTime || baseContext.startTime
            };

            // Create the execution context with injected dependencies
            const executionContext = this.createExecutionContext(context);

            // Create wrapped method with error handling
            const wrappedMethod = this.errorHandler.wrapMethod(originalMethod, executionContext);

            // Execute the method
            return await wrappedMethod(req, data);
        };
    }

    // Create execution context with all injected services
    createExecutionContext(context) {
        const executionContext = {
            // Inject database service
            db: this.createDatabaseProxy(context),
            
            // Inject logging service
            log: this.createLoggerProxy(context),
            
            // Inject utility functions
            util: this.createUtilityProxy(context),
            
            // Enhanced context with user management
            context: this.createEnhancedContextProxy(context),
            
            // Inject cache operations
            cache: this.createCacheProxy(context)
        };

        return executionContext;
    }

    createDatabaseProxy(context) {
        return {
            // Main query method with automatic logging
            query: async (sql, params = [], cacheKey = null, ttlSeconds = 300) => {
                const startTime = Date.now();
                
                try {
                    this.logDatabaseOperation('query', { sql, cacheKey, ttl: ttlSeconds }, context);
                    
                    const result = await this.db.query(sql, params, cacheKey, ttlSeconds);
                    const queryTime = Date.now() - startTime;
                    
                    this.logDatabaseResult('query', result, queryTime, context);
                    
                    return result;
                    
                } catch (error) {
                    this.logDatabaseError('query', error, Date.now() - startTime, context);
                    throw error;
                }
            },

            // Transaction support
            transaction: async (callback) => {
                const startTime = Date.now();
                
                try {
                    this.logDatabaseOperation('transaction', {}, context);
                    
                    const result = await this.db.transaction(callback);
                    const transactionTime = Date.now() - startTime;
                    
                    this.logDatabaseResult('transaction', { success: true }, transactionTime, context);
                    
                    return result;
                    
                } catch (error) {
                    this.logDatabaseError('transaction', error, Date.now() - startTime, context);
                    throw error;
                }
            },

            // Helper methods with logging
            findById: async (table, id, cacheKey = null, ttl = 300) => {
                return await this.db.findById(table, id, cacheKey, ttl);
            },

            findByField: async (table, field, value, cacheKey = null, ttl = 300) => {
                return await this.db.findByField(table, field, value, cacheKey, ttl);
            },

            insert: async (table, data) => {
                const startTime = Date.now();
                
                try {
                    this.logDatabaseOperation('insert', { table, fields: Object.keys(data) }, context);
                    
                    const result = await this.db.insert(table, data);
                    const queryTime = Date.now() - startTime;
                    
                    this.logDatabaseResult('insert', { id: result.id }, queryTime, context);
                    
                    return result;
                    
                } catch (error) {
                    this.logDatabaseError('insert', error, Date.now() - startTime, context);
                    throw error;
                }
            },

            update: async (table, id, data) => {
                const startTime = Date.now();
                
                try {
                    this.logDatabaseOperation('update', { table, id, fields: Object.keys(data) }, context);
                    
                    const result = await this.db.update(table, id, data);
                    const queryTime = Date.now() - startTime;
                    
                    this.logDatabaseResult('update', { id: result?.id }, queryTime, context);
                    
                    return result;
                    
                } catch (error) {
                    this.logDatabaseError('update', error, Date.now() - startTime, context);
                    throw error;
                }
            },

            delete: async (table, id) => {
                const startTime = Date.now();
                
                try {
                    this.logDatabaseOperation('delete', { table, id }, context);
                    
                    const result = await this.db.delete(table, id);
                    const queryTime = Date.now() - startTime;
                    
                    this.logDatabaseResult('delete', { deleted: result }, queryTime, context);
                    
                    return result;
                    
                } catch (error) {
                    this.logDatabaseError('delete', error, Date.now() - startTime, context);
                    throw error;
                }
            }
        };
    }

    createLoggerProxy(context) {
        // Create module-specific logger
        const moduleLogger = this.logger.createModuleLogger({
            module: context.module,
            method: context.method,
            requestId: context.requestId,
            instanceId: context.instanceId,
            userId: context.user?.id,
            ipAddress: context.req?.ip,
            userAgent: context.req?.get('User-Agent')
        });

        // Return simple logging interface
        return (message, level = 'info') => {
            moduleLogger.log(message, level);
        };
    }

    createUtilityProxy(context) {
        return {
            // ID generation
            generateId: () => require('uuid').v4(),
            generateShortId: () => require('uuid').v4().substring(0, 8),
            
            // Time utilities
            getCurrentTimestamp: () => new Date().toISOString(),
            getUnixTimestamp: () => Math.floor(Date.now() / 1000),
            formatDate: (date, format = 'ISO') => {
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
            
            // Validation utilities
            validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            validatePhone: (phone) => /^\+?[\d\s\-\(\)]{10,}$/.test(phone),
            validateUrl: (url) => {
                try {
                    new URL(url);
                    return true;
                } catch {
                    return false;
                }
            },
            
            // String utilities
            sanitizeString: (str) => str?.toString().trim() || '',
            slugify: (str) => str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '',
            capitalize: (str) => str?.charAt(0).toUpperCase() + str?.slice(1).toLowerCase() || '',
            
            // Number utilities
            parseInteger: (value, defaultValue = 0) => {
                const parsed = parseInt(value, 10);
                return isNaN(parsed) ? defaultValue : parsed;
            },
            parseFloat: (value, defaultValue = 0.0) => {
                const parsed = parseFloat(value);
                return isNaN(parsed) ? defaultValue : parsed;
            },
            roundTo: (num, decimals = 2) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals),
            
            // Array utilities
            chunk: (array, size) => {
                const chunks = [];
                for (let i = 0; i < array.length; i += size) {
                    chunks.push(array.slice(i, i + size));
                }
                return chunks;
            },
            unique: (array) => [...new Set(array)],
            
            // Object utilities
            pick: (obj, keys) => {
                const result = {};
                keys.forEach(key => {
                    if (key in obj) result[key] = obj[key];
                });
                return result;
            },
            omit: (obj, keys) => {
                const result = { ...obj };
                keys.forEach(key => delete result[key]);
                return result;
            },
            
            // Async utilities
            delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
            timeout: (promise, ms) => {
                return Promise.race([
                    promise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Operation timed out')), ms)
                    )
                ]);
            },
            retry: async (fn, maxAttempts = 3, delayMs = 1000) => {
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        return await fn();
                    } catch (error) {
                        if (attempt === maxAttempts) throw error;
                        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
                    }
                }
            },
            
            // Enhanced validation helper
            validate: (data, rules) => {
                const errors = [];
                
                for (const [field, rule] of Object.entries(rules)) {
                    const value = data[field];
                    
                    if (rule.required && (value === undefined || value === null || value === '')) {
                        errors.push(`${field} is required`);
                        continue;
                    }
                    
                    if (value !== undefined && value !== null && value !== '') {
                        if (rule.type === 'email' && !this.validateEmail(value)) {
                            errors.push(`${field} must be a valid email`);
                        }
                        
                        if (rule.type === 'number' && isNaN(Number(value))) {
                            errors.push(`${field} must be a number`);
                        }
                        
                        if (rule.minLength && value.toString().length < rule.minLength) {
                            errors.push(`${field} must be at least ${rule.minLength} characters`);
                        }
                        
                        if (rule.maxLength && value.toString().length > rule.maxLength) {
                            errors.push(`${field} must not exceed ${rule.maxLength} characters`);
                        }
                        
                        if (rule.pattern && !rule.pattern.test(value)) {
                            errors.push(`${field} format is invalid`);
                        }

                        if (rule.min && Number(value) < rule.min) {
                            errors.push(`${field} must be at least ${rule.min}`);
                        }

                        if (rule.max && Number(value) > rule.max) {
                            errors.push(`${field} must not exceed ${rule.max}`);
                        }
                    }
                }
                
                if (errors.length > 0) {
                    throw {
                        code: 'VALIDATION_ERROR',
                        message: 'Validation failed',
                        statusCode: 400,
                        validationErrors: errors
                    };
                }
            }
        };
    }

    // Enhanced context with user management utilities
    createEnhancedContextProxy(context) {
        return {
            // Request information
            requestId: context.requestId,
            instanceId: context.instanceId,
            startTime: context.startTime,
            
            // User information (enhanced)
            user: context.user,
            userId: context.user?.id || null,
            userEmail: context.user?.email || null,
            username: context.user?.username || null,
            
            // Module information
            module: context.module,
            method: context.method,
            version: context.version,
            
            // Request details
            ip: context.req?.ip,
            userAgent: context.req?.get('User-Agent'),
            method: context.req?.method,
            originalUrl: context.req?.originalUrl,
            
            // Authentication helpers
            isAuthenticated: () => !!context.user,
            
            // Enhanced role checking
            hasRole: (role) => {
                if (!context.user || !context.user.roles) return false;
                const userRoles = Array.isArray(context.user.roles) ? context.user.roles : [context.user.roles];
                return userRoles.includes(role);
            },
            
            // Enhanced permission checking
            hasPermission: (permission) => {
                if (!context.user || !context.user.permissions) return false;
                const userPermissions = Array.isArray(context.user.permissions) ? context.user.permissions : [context.user.permissions];
                return userPermissions.includes(permission);
            },
            
            // Check if user has any of the specified roles
            hasAnyRole: (roles) => {
                if (!context.user || !context.user.roles) return false;
                const userRoles = Array.isArray(context.user.roles) ? context.user.roles : [context.user.roles];
                const requiredRoles = Array.isArray(roles) ? roles : [roles];
                return requiredRoles.some(role => userRoles.includes(role));
            },
            
            // Check if user has all specified roles
            hasAllRoles: (roles) => {
                if (!context.user || !context.user.roles) return false;
                const userRoles = Array.isArray(context.user.roles) ? context.user.roles : [context.user.roles];
                const requiredRoles = Array.isArray(roles) ? roles : [roles];
                return requiredRoles.every(role => userRoles.includes(role));
            },
            
            // Check if user has any of the specified permissions
            hasAnyPermission: (permissions) => {
                if (!context.user || !context.user.permissions) return false;
                const userPermissions = Array.isArray(context.user.permissions) ? context.user.permissions : [context.user.permissions];
                const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
                return requiredPermissions.some(permission => userPermissions.includes(permission));
            },
            
            // Check if user has all specified permissions
            hasAllPermissions: (permissions) => {
                if (!context.user || !context.user.permissions) return false;
                const userPermissions = Array.isArray(context.user.permissions) ? context.user.permissions : [context.user.permissions];
                const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
                return requiredPermissions.every(permission => userPermissions.includes(permission));
            },
            
            // Admin helper
            isAdmin: () => {
                return context.user && context.user.roles && 
                       (Array.isArray(context.user.roles) ? context.user.roles : [context.user.roles]).includes('admin');
            },
            
            // Owner check helper (useful for checking if user owns a resource)
            isOwner: (resourceUserId) => {
                return context.user && context.user.id === resourceUserId;
            },
            
            // Permission enforcement (throws error if not authorized)
            requireRole: (role) => {
                if (!this.hasRole(role)) {
                    throw {
                        code: 'INSUFFICIENT_PERMISSIONS',
                        message: `Role '${role}' required`,
                        statusCode: 403,
                        requiredRole: role,
                        userRoles: context.user?.roles || []
                    };
                }
            },
            
            requirePermission: (permission) => {
                if (!this.hasPermission(permission)) {
                    throw {
                        code: 'INSUFFICIENT_PERMISSIONS',
                        message: `Permission '${permission}' required`,
                        statusCode: 403,
                        requiredPermission: permission,
                        userPermissions: context.user?.permissions || []
                    };
                }
            },
            
            requireAdmin: () => {
                if (!this.isAdmin()) {
                    throw {
                        code: 'ADMIN_REQUIRED',
                        message: 'Administrator access required',
                        statusCode: 403
                    };
                }
            },
            
            requireOwnership: (resourceUserId) => {
                if (!this.isOwner(resourceUserId) && !this.isAdmin()) {
                    throw {
                        code: 'OWNERSHIP_REQUIRED',
                        message: 'You can only access your own resources',
                        statusCode: 403
                    };
                }
            },
            
            // Timing
            getElapsedTime: () => Date.now() - context.startTime,
            
            // Request data helpers
            getHeader: (name) => context.req?.get(name),
            getQueryParam: (name, defaultValue = null) => context.req?.query?.[name] || defaultValue,
            getBodyParam: (name, defaultValue = null) => context.req?.body?.[name] || defaultValue,
            
            // User context helpers
            getUserRoles: () => context.user?.roles || [],
            getUserPermissions: () => context.user?.permissions || [],
            getUserId: () => context.user?.id || null,
            getUserEmail: () => context.user?.email || null,
            getUsername: () => context.user?.username || null
        };
    }

    createCacheProxy(context) {
        return {
            get: async (key) => {
                try {
                    return await this.db.getFromCache(key);
                } catch (error) {
                    this.logger.warn('Cache get failed', { key, error: error.message, ...context });
                    return null;
                }
            },
            
            set: async (key, value, ttlSeconds = 300) => {
                try {
                    return await this.db.setCache(key, value, ttlSeconds);
                } catch (error) {
                    this.logger.warn('Cache set failed', { key, ttl: ttlSeconds, error: error.message, ...context });
                    return false;
                }
            },
            
            del: async (key) => {
                try {
                    return await this.db.invalidateCache(key);
                } catch (error) {
                    this.logger.warn('Cache delete failed', { key, error: error.message, ...context });
                    return false;
                }
            },
            
            invalidate: async (pattern) => {
                try {
                    return await this.db.invalidateCache(pattern);
                } catch (error) {
                    this.logger.warn('Cache invalidation failed', { pattern, error: error.message, ...context });
                    return 0;
                }
            }
        };
    }

    // Database operation logging helpers
    logDatabaseOperation(operation, details, context) {
        if (process.env.NODE_ENV === 'development') {
            this.logger.debug(`Database ${operation} started`, {
                operation,
                ...details,
                module: context.module,
                method: context.method,
                requestId: context.requestId,
                userId: context.user?.id
            });
        }
    }

    logDatabaseResult(operation, result, queryTime, context) {
        const logLevel = queryTime > 1000 ? 'warn' : 'debug';
        
        this.logger.log(logLevel, `Database ${operation} completed`, {
            operation,
            queryTime,
            ...result,
            module: context.module,
            method: context.method,
            requestId: context.requestId,
            userId: context.user?.id
        });
    }

    logDatabaseError(operation, error, queryTime, context) {
        this.logger.error(`Database ${operation} failed`, {
            operation,
            queryTime,
            error: error.message,
            module: context.module,
            method: context.method,
            requestId: context.requestId,
            userId: context.user?.id,
            error_details: this.errorHandler.sanitizeError ? this.errorHandler.sanitizeError(error) : error
        });
    }
}

module.exports = ModuleWrapper;