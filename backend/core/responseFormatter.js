class ResponseFormatter {
    constructor() {
        this.defaultSuccessStatus = 200;
        this.defaultErrorStatus = 500;
    }

    sendSuccess(res, data, context) {
        const response = this.formatSuccessResponse(data, context);
        const statusCode = this.getSuccessStatusCode(context);
        
        // Add performance metrics
        const responseTime = Date.now() - context.startTime;
        response.meta = {
            responseTime: `${responseTime}ms`,
            instance: context.instanceId
        };

        res.status(statusCode).json(response);
        
        // Log success
        this.logResponse(context, statusCode, responseTime);
    }

    sendError(res, error, req) {
        const response = this.formatErrorResponse(error, req);
        const statusCode = error.statusCode || this.defaultErrorStatus;
        
        // Add performance metrics if available
        if (req.startTime) {
            const responseTime = Date.now() - req.startTime;
            response.meta = {
                responseTime: `${responseTime}ms`,
                instance: req.instanceId
            };
        }

        res.status(statusCode).json(response);
        
        // Log error
        this.logError(error, req, statusCode);
    }

    formatSuccessResponse(data, context) {
        return {
            success: true,
            data: this.sanitizeData(data),
            requestId: context.requestId,
            version: context.version,
            timestamp: new Date().toISOString()
        };
    }

    formatErrorResponse(error, req) {
        const isProduction = process.env.NODE_ENV === 'production';
        
        const response = {
            success: false,
            error: {
                code: error.code || 'UNKNOWN_ERROR',
                message: error.message || 'An unknown error occurred'
            },
            requestId: req.id,
            timestamp: new Date().toISOString()
        };

        // Add debug info in development
        if (!isProduction && error.stack) {
            response.debug = {
                stack: error.stack,
                details: error.details || null
            };
        }

        // Add validation errors if present
        if (error.validationErrors) {
            response.error.validationErrors = error.validationErrors;
        }

        return response;
    }

    getSuccessStatusCode(context) {
        // Determine status code based on method
        switch (context.req.method) {
            case 'POST':
                return 201; // Created
            case 'DELETE':
                return 204; // No Content
            case 'PUT':
            case 'PATCH':
                return 200; // OK
            case 'GET':
            default:
                return 200; // OK
        }
    }

    sanitizeData(data) {
        if (data === null || data === undefined) {
            return null;
        }

        // Handle arrays
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeData(item));
        }

        // Handle objects
        if (typeof data === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                // Skip private fields (starting with _)
                if (key.startsWith('_')) {
                    continue;
                }
                
                // Remove sensitive fields
                if (this.isSensitiveField(key)) {
                    sanitized[key] = '[REDACTED]';
                    continue;
                }
                
                sanitized[key] = this.sanitizeData(value);
            }
            return sanitized;
        }

        // Return primitives as-is
        return data;
    }

    isSensitiveField(fieldName) {
        const sensitiveFields = [
            'password', 'passwd', 'pwd',
            'secret', 'token', 'key',
            'auth', 'authorization',
            'credit', 'creditcard', 'ccnumber',
            'ssn', 'socialsecurity',
            'api_key', 'apikey',
            'private_key', 'privatekey'
        ];

        const lowerField = fieldName.toLowerCase();
        return sensitiveFields.some(sensitive => 
            lowerField.includes(sensitive)
        );
    }

    logResponse(context, statusCode, responseTime) {
        const logLevel = statusCode >= 400 ? 'warn' : 'info';
        const message = `${context.req.method} /api/${context.version}/${context.module}/${context.method} ${statusCode} ${responseTime}ms`;
        
        console.log(`[${context.requestId}] ${message}`);
        
        // Log slow requests
        if (responseTime > 1000) {
            console.warn(`[${context.requestId}] SLOW REQUEST: ${message}`);
        }
    }

    logError(error, req, statusCode) {
        const message = `${req.method} ${req.path} ${statusCode} - ${error.message}`;
        console.error(`[${req.id}] ERROR: ${message}`);
        
        // Log stack trace in development
        if (process.env.NODE_ENV === 'development' && error.stack) {
            console.error(`[${req.id}] Stack:`, error.stack);
        }
    }

    // Helper method to create paginated responses
    createPaginatedResponse(data, pagination, context) {
        const response = this.formatSuccessResponse({
            items: data,
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || 20,
                total: pagination.total || 0,
                totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 20)),
                hasNext: pagination.hasNext || false,
                hasPrev: pagination.hasPrev || false
            }
        }, context);

        return response;
    }

    // Helper method to create standard list responses
    createListResponse(items, meta = {}, context) {
        const response = this.formatSuccessResponse({
            items: items || [],
            count: items?.length || 0,
            ...meta
        }, context);

        return response;
    }

    // Helper method for validation error responses
    createValidationErrorResponse(validationErrors, req) {
        const error = {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            statusCode: 400,
            validationErrors
        };

        return this.formatErrorResponse(error, req);
    }
}

module.exports = ResponseFormatter;