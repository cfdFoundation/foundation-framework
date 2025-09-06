class ErrorHandler {
    constructor(logger = null) {
        this.logger = logger;
        this.errorCounts = new Map();
        this.errorThresholds = {
            warning: 10,   // Log warning after 10 errors of same type
            critical: 50   // Log critical after 50 errors of same type
        };
    }

    // Wrap business logic methods with error handling
    wrapMethod(fn, context) {
        return async (...args) => {
            const startTime = Date.now();
            
            try {
                const result = await fn.apply(context, args);
                this.logSuccess(context, startTime);
                return result;
                
            } catch (error) {
                this.handleError(error, context, startTime, args);
                throw this.formatError(error, context);
            }
        };
    }

    // Main error handling logic
    handleError(error, context, startTime, args = []) {
        const responseTime = Date.now() - startTime;
        const errorInfo = this.analyzeError(error, context, args);
        
        // Track error frequency
        this.trackErrorFrequency(errorInfo.type, context);
        
        // Log the error
        this.logError(errorInfo, context, responseTime);
        
        // Handle critical errors
        if (this.isCriticalError(error)) {
            this.handleCriticalError(errorInfo, context);
        }
    }

    analyzeError(error, context, args) {
        const errorInfo = {
            type: this.determineErrorType(error),
            category: this.categorizeError(error),
            severity: this.determineSeverity(error),
            isOperational: this.isOperationalError(error),
            originalError: error,
            context: {
                module: context.module,
                method: context.method,
                userId: context.user?.id,
                requestId: context.requestId,
                args: this.sanitizeArgs(args)
            }
        };

        return errorInfo;
    }

    determineErrorType(error) {
        // Database errors
        if (error.code === 'DATABASE_ERROR' || error.originalError?.code) {
            return 'DATABASE_ERROR';
        }
        
        // Validation errors
        if (error.code === 'VALIDATION_ERROR' || error.statusCode === 400) {
            return 'VALIDATION_ERROR';
        }
        
        // Authentication errors
        if (error.code === 'INVALID_TOKEN' || error.statusCode === 401) {
            return 'AUTH_ERROR';
        }
        
        // Authorization errors
        if (error.statusCode === 403) {
            return 'AUTHORIZATION_ERROR';
        }
        
        // Not found errors
        if (error.statusCode === 404) {
            return 'NOT_FOUND_ERROR';
        }
        
        // Rate limit errors
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
            return 'RATE_LIMIT_ERROR';
        }
        
        // External service errors
        if (error.code === 'SERVICE_UNAVAILABLE' || error.statusCode >= 500) {
            return 'SERVICE_ERROR';
        }
        
        // Network/timeout errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return 'NETWORK_ERROR';
        }
        
        // Unknown errors
        return 'UNKNOWN_ERROR';
    }

    categorizeError(error) {
        const categories = {
            'DATABASE_ERROR': 'infrastructure',
            'VALIDATION_ERROR': 'client',
            'AUTH_ERROR': 'security',
            'AUTHORIZATION_ERROR': 'security',
            'NOT_FOUND_ERROR': 'client',
            'RATE_LIMIT_ERROR': 'protection',
            'SERVICE_ERROR': 'infrastructure',
            'NETWORK_ERROR': 'infrastructure',
            'UNKNOWN_ERROR': 'application'
        };

        const type = this.determineErrorType(error);
        return categories[type] || 'application';
    }

    determineSeverity(error) {
        // Critical: Service outages, data corruption
        if (error.code === 'DATABASE_ERROR' && error.originalError?.code === '42P01') {
            return 'critical'; // Table doesn't exist
        }
        
        if (error.type === 'SERVICE_ERROR' && error.statusCode >= 500) {
            return 'critical';
        }
        
        // High: Authentication/authorization failures, data validation
        if (['AUTH_ERROR', 'AUTHORIZATION_ERROR'].includes(this.determineErrorType(error))) {
            return 'high';
        }
        
        // Medium: Business logic errors, external service issues
        if (['VALIDATION_ERROR', 'NETWORK_ERROR'].includes(this.determineErrorType(error))) {
            return 'medium';
        }
        
        // Low: Not found, rate limiting
        if (['NOT_FOUND_ERROR', 'RATE_LIMIT_ERROR'].includes(this.determineErrorType(error))) {
            return 'low';
        }
        
        return 'medium';
    }

    isOperationalError(error) {
        // Operational errors are expected and handled gracefully
        const operationalTypes = [
            'VALIDATION_ERROR',
            'NOT_FOUND_ERROR',
            'RATE_LIMIT_ERROR',
            'AUTH_ERROR',
            'AUTHORIZATION_ERROR'
        ];
        
        return operationalTypes.includes(this.determineErrorType(error));
    }

    isCriticalError(error) {
        return this.determineSeverity(error) === 'critical';
    }

    formatError(error, context) {
        // If error is already formatted, return as-is
        if (error.code && error.message && error.statusCode) {
            return error;
        }

        const errorType = this.determineErrorType(error);
        const severity = this.determineSeverity(error);
        
        // Default formatted error
        const formatted = {
            code: errorType,
            message: this.getHumanReadableMessage(error, errorType),
            statusCode: this.getStatusCode(error, errorType),
            severity: severity,
            timestamp: new Date().toISOString(),
            requestId: context.requestId
        };

        // Add details based on environment
        if (process.env.NODE_ENV === 'development') {
            formatted.originalError = {
                message: error.message,
                stack: error.stack,
                code: error.code
            };
            formatted.context = {
                module: context.module,
                method: context.method,
                userId: context.user?.id
            };
        }

        // Add validation details if present
        if (error.validationErrors) {
            formatted.validationErrors = error.validationErrors;
        }

        return formatted;
    }

    getHumanReadableMessage(error, errorType) {
        const messages = {
            'DATABASE_ERROR': 'A database error occurred. Please try again later.',
            'VALIDATION_ERROR': error.message || 'Invalid input provided.',
            'AUTH_ERROR': 'Authentication failed. Please check your credentials.',
            'AUTHORIZATION_ERROR': 'You do not have permission to perform this action.',
            'NOT_FOUND_ERROR': error.message || 'The requested resource was not found.',
            'RATE_LIMIT_ERROR': 'Too many requests. Please try again later.',
            'SERVICE_ERROR': 'A service error occurred. Please try again later.',
            'NETWORK_ERROR': 'Network error. Please check your connection and try again.',
            'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again later.'
        };

        return messages[errorType] || error.message || 'An error occurred.';
    }

    getStatusCode(error, errorType) {
        // If error already has status code, use it
        if (error.statusCode) {
            return error.statusCode;
        }

        const statusCodes = {
            'DATABASE_ERROR': 500,
            'VALIDATION_ERROR': 400,
            'AUTH_ERROR': 401,
            'AUTHORIZATION_ERROR': 403,
            'NOT_FOUND_ERROR': 404,
            'RATE_LIMIT_ERROR': 429,
            'SERVICE_ERROR': 503,
            'NETWORK_ERROR': 502,
            'UNKNOWN_ERROR': 500
        };

        return statusCodes[errorType] || 500;
    }

    trackErrorFrequency(errorType, context) {
        const key = `${errorType}:${context.module}:${context.method}`;
        const count = (this.errorCounts.get(key) || 0) + 1;
        this.errorCounts.set(key, count);

        // Check thresholds
        if (count === this.errorThresholds.warning) {
            this.logErrorThreshold('warning', errorType, context, count);
        } else if (count === this.errorThresholds.critical) {
            this.logErrorThreshold('critical', errorType, context, count);
        }
    }

    logSuccess(context, startTime) {
        if (!this.logger) return;

        const responseTime = Date.now() - startTime;
        
        // Only log slow requests to avoid spam
        if (responseTime > 1000) {
            this.logger.warn('Slow response detected', {
                module: context.module,
                method: context.method,
                responseTime,
                requestId: context.requestId,
                userId: context.user?.id
            });
        }
    }

    logError(errorInfo, context, responseTime) {
        if (!this.logger) {
            // Fallback to console if no logger
            console.error(`[ERROR] ${context.module}.${context.method}:`, errorInfo.originalError.message);
            return;
        }

        const logLevel = this.getLogLevel(errorInfo.severity);
        const message = `${context.module}.${context.method} failed: ${errorInfo.originalError.message}`;

        const logContext = {
            module: context.module,
            method: context.method,
            requestId: context.requestId,
            userId: context.user?.id,
            responseTime,
            errorType: errorInfo.type,
            errorCategory: errorInfo.category,
            severity: errorInfo.severity,
            isOperational: errorInfo.isOperational,
            error_details: this.sanitizeError(errorInfo.originalError)
        };

        this.logger.log(logLevel, message, logContext);
    }

    logErrorThreshold(level, errorType, context, count) {
        if (!this.logger) return;

        const message = `Error threshold reached: ${errorType} in ${context.module}.${context.method}`;
        
        this.logger.log(level, message, {
            module: context.module,
            method: context.method,
            errorType,
            count,
            threshold: level
        });
    }

    handleCriticalError(errorInfo, context) {
        // Log critical error immediately
        if (this.logger) {
            this.logger.error('CRITICAL ERROR DETECTED', {
                module: context.module,
                method: context.method,
                errorType: errorInfo.type,
                severity: errorInfo.severity,
                error_details: errorInfo.originalError
            });
        }

        // Additional critical error handling could go here
        // e.g., send alerts, trigger circuit breakers, etc.
    }

    getLogLevel(severity) {
        const levelMap = {
            'critical': 'error',
            'high': 'error',
            'medium': 'warn',
            'low': 'info'
        };

        return levelMap[severity] || 'error';
    }

    sanitizeArgs(args) {
        return args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                return this.sanitizeObject(arg);
            }
            return arg;
        });
    }

    sanitizeObject(obj) {
        const sensitiveFields = [
            'password', 'token', 'secret', 'key', 'auth',
            'authorization', 'credit', 'ssn', 'private'
        ];

        const sanitized = {};
        
        for (const [key, value] of Object.entries(obj)) {
            const keyLower = key.toLowerCase();
            const isSensitive = sensitiveFields.some(field => keyLower.includes(field));
            
            if (isSensitive) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    sanitizeError(error) {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                code: error.code || null,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            };
        }
        
        if (typeof error === 'object' && error !== null) {
            return this.sanitizeObject(error);
        }
        
        return { error: String(error) };
    }

    // Get error statistics
    getErrorStats() {
        const stats = {
            totalErrors: 0,
            errorsByType: {},
            errorsByModule: {},
            frequentErrors: []
        };

        for (const [key, count] of this.errorCounts.entries()) {
            const [type, module, method] = key.split(':');
            
            stats.totalErrors += count;
            stats.errorsByType[type] = (stats.errorsByType[type] || 0) + count;
            stats.errorsByModule[module] = (stats.errorsByModule[module] || 0) + count;
            
            if (count >= this.errorThresholds.warning) {
                stats.frequentErrors.push({ key, count, type, module, method });
            }
        }

        // Sort frequent errors by count
        stats.frequentErrors.sort((a, b) => b.count - a.count);

        return stats;
    }

    // Reset error counts (useful for testing or periodic resets)
    resetErrorCounts() {
        this.errorCounts.clear();
    }

    // Create error response for API
    createErrorResponse(error, req) {
        const formatted = this.formatError(error, {
            requestId: req.id,
            module: req.params?.module,
            method: req.params?.method,
            user: req.user
        });

        return {
            success: false,
            error: {
                code: formatted.code,
                message: formatted.message,
                ...(formatted.validationErrors && { validationErrors: formatted.validationErrors })
            },
            requestId: formatted.requestId,
            timestamp: formatted.timestamp,
            ...(process.env.NODE_ENV === 'development' && formatted.originalError && {
                debug: formatted.originalError
            })
        };
    }
}

module.exports = ErrorHandler;