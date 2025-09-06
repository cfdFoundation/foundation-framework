const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

class MiddlewarePipeline {
    constructor() {
        this.rateLimiters = new Map();
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    }

    async process(req, res, registry) {
        const context = this.createContext(req);
        
        try {
            // 1. Extract route parameters
            await this.extractRouteInfo(context, req);
            
            // 2. Validate route exists
            if (!this.validateRoute(context, registry, res)) {
                return { response: true }; // Response already sent
            }
            
            // 3. Version validation
            if (!this.validateVersion(context, res)) {
                return { response: true };
            }
            
            // 4. Rate limiting
            if (!await this.applyRateLimit(context, req, res, registry)) {
                return { response: true };
            }
            
            // 5. Authentication
            if (!await this.authenticateRequest(context, req, res, registry)) {
                return { response: true };
            }
            
            // 6. Input validation
            if (!this.validateInput(context, req, res)) {
                return { response: true };
            }
            
            // 7. Extract request data
            this.extractRequestData(context, req);
            
            return context;
            
        } catch (error) {
            this.sendError(res, {
                code: 'MIDDLEWARE_ERROR',
                message: 'Internal middleware error',
                statusCode: 500
            }, req);
            return { response: true };
        }
    }

    createContext(req) {
        return {
            requestId: req.id,
            instanceId: req.instanceId,
            startTime: req.startTime,
            req: req
        };
    }

    async extractRouteInfo(context, req) {
        const { version, module, method } = req.params;
        
        context.version = version;
        context.module = module;
        context.method = method;
        
        // Log the request
        console.log(`[${context.requestId}] ${req.method} /api/${version}/${module}/${method}`);
    }

    validateRoute(context, registry, res) {
        if (!registry.isMethodAllowed(context.module, context.method, context.version)) {
            this.sendError(res, {
                code: 'ROUTE_NOT_FOUND',
                message: `Route ${context.module}.${context.method} not found`,
                statusCode: 404
            }, context.req);
            return false;
        }
        return true;
    }

    validateVersion(context, res) {
        const supportedVersions = ['v1', 'v2']; // Expand as needed
        
        if (!supportedVersions.includes(context.version)) {
            this.sendError(res, {
                code: 'UNSUPPORTED_VERSION',
                message: `API version '${context.version}' not supported. Supported versions: ${supportedVersions.join(', ')}`,
                statusCode: 400
            }, context.req);
            return false;
        }
        return true;
    }

    async applyRateLimit(context, req, res, registry) {
        const methodConfig = registry.getMethodConfig(context.module, context.method, context.version);
        
        if (!methodConfig?.rateLimit) {
            return true; // No rate limiting configured
        }

        const rateLimitKey = `${context.module}:${context.method}:${context.version}`;
        
        if (!this.rateLimiters.has(rateLimitKey)) {
            const limiter = this.createRateLimiter(methodConfig.rateLimit, rateLimitKey);
            this.rateLimiters.set(rateLimitKey, limiter);
        }

        const limiter = this.rateLimiters.get(rateLimitKey);
        
        return new Promise((resolve) => {
            limiter(req, res, (err) => {
                if (err) {
                    // Rate limit exceeded - response already sent by express-rate-limit
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    createRateLimiter(rateLimitConfig, key) {
        // Parse rate limit string like "100/hour", "10/minute"
        const [limit, window] = rateLimitConfig.split('/');
        
        const windowMs = this.parseTimeWindow(window);
        
        return rateLimit({
            windowMs,
            max: parseInt(limit, 10),
            message: {
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: `Rate limit exceeded for ${key}. Limit: ${rateLimitConfig}`,
                    retryAfter: Math.ceil(windowMs / 1000)
                },
                timestamp: new Date().toISOString()
            },
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => {
                // Use IP + user ID if available for more precise limiting
                return req.ip + (req.user?.id || '');
            }
        });
    }

    parseTimeWindow(window) {
        const timeMap = {
            'second': 1000,
            'minute': 60 * 1000,
            'hour': 60 * 60 * 1000,
            'day': 24 * 60 * 60 * 1000
        };
        
        return timeMap[window] || timeMap['minute'];
    }

    async authenticateRequest(context, req, res, registry) {
        const methodConfig = registry.getMethodConfig(context.module, context.method, context.version);
        
        // Skip auth for public methods
        if (methodConfig?.public === true) {
            context.user = null;
            return true;
        }
        
        // Skip auth if not required
        if (!methodConfig?.authRequired) {
            context.user = null;
            return true;
        }

        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            this.sendError(res, {
                code: 'MISSING_TOKEN',
                message: 'Authorization token required',
                statusCode: 401
            }, req);
            return false;
        }

        const token = authHeader.substring(7);
        
        try {
            // Verify JWT token
            const decoded = jwt.verify(token, this.jwtSecret);
            context.user = decoded;
            
            // Add user info to request for logging
            req.user = decoded;
            
            return true;
            
        } catch (error) {
            let message = 'Invalid token';
            if (error.name === 'TokenExpiredError') {
                message = 'Token expired';
            } else if (error.name === 'JsonWebTokenError') {
                message = 'Malformed token';
            }
            
            this.sendError(res, {
                code: 'INVALID_TOKEN',
                message,
                statusCode: 401
            }, req);
            return false;
        }
    }

    validateInput(context, req, res) {
        // Basic input validation
        if (req.method === 'POST' || req.method === 'PUT') {
            if (!req.body) {
                this.sendError(res, {
                    code: 'MISSING_BODY',
                    message: 'Request body required',
                    statusCode: 400
                }, req);
                return false;
            }
        }

        // Validate content type for POST/PUT
        if ((req.method === 'POST' || req.method === 'PUT') && 
            !req.is('application/json')) {
            this.sendError(res, {
                code: 'INVALID_CONTENT_TYPE',
                message: 'Content-Type must be application/json',
                statusCode: 400
            }, req);
            return false;
        }

        return true;
    }

    extractRequestData(context, req) {
        // Extract data based on method
        switch (req.method) {
            case 'GET':
            case 'DELETE':
                context.data = req.query;
                break;
            case 'POST':
            case 'PUT':
            case 'PATCH':
                context.data = req.body;
                break;
            default:
                context.data = {};
        }
    }

    sendError(res, error, req) {
        const statusCode = error.statusCode || 500;
        
        res.status(statusCode).json({
            success: false,
            error: {
                code: error.code || 'UNKNOWN_ERROR',
                message: error.message || 'An unknown error occurred'
            },
            requestId: req.id,
            timestamp: new Date().toISOString()
        });
    }

    // Utility method to generate JWT tokens (for testing)
    static generateToken(payload, expiresIn = '1h') {
        const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        return jwt.sign(payload, secret, { expiresIn });
    }
}

module.exports = MiddlewarePipeline;