const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Foundation Infrastructure
const DependencyContainer = require('./core/dependencyContainer');
const Registry = require('./core/registry');
const MiddlewarePipeline = require('./core/middlewarePipeline');
const ResponseFormatter = require('./core/responseFormatter');

class APIFramework {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.instanceId = `${process.env.INSTANCE_NAME || 'api'}-${uuidv4().substring(0, 8)}`;
        
        // Foundation Infrastructure Services
        this.container = new DependencyContainer();
        this.registry = new Registry();
        this.middleware = new MiddlewarePipeline();
        this.formatter = new ResponseFormatter();
        
        this.server = null;
    }

    async initialize() {
        console.log(`[Framework] Initializing Foundation framework instance: ${this.instanceId}`);
        
        // Initialize Foundation infrastructure first
        await this.container.initialize();
        console.log('[Framework] Foundation infrastructure initialized');

        // Setup middleware
        this.setupMiddleware();
        
        // Discover and register modules
        await this.registry.discoverAndRegister('./routes');
        
        // Setup routes with Foundation integration
        this.setupRoutes();
        
        // Setup error handling
        this.setupErrorHandling();
        
        console.log(`[Framework] Foundation framework ready with ${this.registry.getModuleCount()} modules`);
    }

    setupMiddleware() {
        // Basic middleware
        this.app.use(helmet());
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request ID and timing for Foundation logging
        this.app.use((req, res, next) => {
            req.id = uuidv4();
            req.startTime = Date.now();
            req.instanceId = this.instanceId;
            next();
        });

        // Apply middleware pipeline (auth, rate limiting, etc.)
        this.middleware.apply(this.app);
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', async (req, res) => {
            try {
                const dbHealth = await this.container.getService('database').then(db => db.healthCheck());
                
                res.json({
                    status: 'healthy',
                    instance: this.instanceId,
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString(),
                    database: dbHealth,
                    framework: 'Foundation API Framework'
                });
            } catch (error) {
                res.status(503).json({
                    status: 'unhealthy',
                    instance: this.instanceId,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // API info endpoint
        this.app.get('/api/info', (req, res) => {
            this.formatter.sendSuccess(res, {
                framework: 'Foundation API Framework',
                version: '2.0.0',
                instance: this.instanceId,
                modules: this.registry.getModuleInfo(),
                features: [
                    'Auto-discovery',
                    'Database abstraction with caching',
                    'Structured logging',
                    'Error handling',
                    'Authentication',
                    'Rate limiting',
                    'Performance monitoring'
                ]
            });
        });

        // Metrics endpoint (internal)
        this.app.get('/api/metrics', async (req, res) => {
            try {
                const monitor = await this.container.getService('monitor');
                const metrics = monitor.getMetrics();
                res.json(metrics);
            } catch (error) {
                res.status(500).json({ error: 'Metrics unavailable' });
            }
        });

        // Main API routes with Foundation infrastructure
        this.app.all('/api/:version/:module/:method?', async (req, res) => {
            const logger = await this.container.getService('logger').catch(() => null);
            const errorHandler = await this.container.getService('errorHandler').catch(() => null);
            
            try {
                // Extract route parameters
                const { version, module, method } = req.params;
                const data = { ...req.query, ...req.body };

                // Create execution context for Foundation
                const context = {
                    module,
                    method,
                    version,
                    data,
                    req,
                    user: req.user,
                    requestId: req.id,
                    instanceId: req.instanceId,
                    startTime: req.startTime
                };

                // Log incoming request
                if (logger) {
                    if (typeof logger.log === 'function') {
                        logger.log('info', 'Processing request', {
                            module: context.module,
                            method: context.method,
                            requestId: context.requestId,
                            userId: context.user?.id,
                            ip: req.ip
                        });
                    }
                }

                // Check if method is provided
                if (!method) {
                    this.formatter.sendError(res, {
                        code: 'METHOD_REQUIRED',
                        message: `Method required for ${req.path}`,
                        statusCode: 400
                    }, req);
                    return;
                }

                // Execute the business logic with Foundation infrastructure
                const result = await this.executeBusinessLogic(context);
                
                // Format and send response
                this.formatter.sendSuccess(res, result, context);
                
                // Log successful request
                if (logger) {
                    if (typeof logger.log === 'function') {
                        logger.log('info', 'Request completed successfully', {
                            module: context.module,
                            method: context.method,
                            requestId: context.requestId,
                            responseTime: Date.now() - context.startTime,
                            userId: context.user?.id
                        });
                    }
                }
                
            } catch (error) {
                // Foundation error handling - creates pretty responses and logs everything
                const formattedResponse = errorHandler ? 
                    errorHandler.createErrorResponse(error, req) :
                    { error: error.message };
                
                // Log the error with full context
                if (logger) {
                    if (typeof logger.log === 'function') {
                        logger.log('error', 'Request failed', {
                            module: req.params.module,
                            method: req.params.method,
                            requestId: req.id,
                            responseTime: Date.now() - req.startTime,
                            userId: req.user?.id,
                            error_details: error
                        });
                    }
                }
                
                // Send formatted error response
                res.status(error.statusCode || 500).json(formattedResponse);
            }
        });

        // Fallback for unknown routes
        this.app.all('*', (req, res) => {
            this.formatter.sendError(res, {
                code: 'ROUTE_NOT_FOUND',
                message: `Route ${req.method} ${req.path} not found`,
                statusCode: 404
            }, req);
        });
    }

    async executeBusinessLogic(context) {
        const { module, method, version, data, req } = context;
        
        // Get the registered module
        const moduleInstance = this.registry.getModule(module, version);
        if (!moduleInstance) {
            throw {
                code: 'MODULE_NOT_FOUND',
                message: `Module '${module}' version '${version}' not found`,
                statusCode: 404
            };
        }

        // Check if method exists
        if (!moduleInstance[method] || typeof moduleInstance[method] !== 'function') {
            throw {
                code: 'METHOD_NOT_FOUND',
                message: `Method '${method}' not found in module '${module}'`,
                statusCode: 404
            };
        }

        // Wrap module with Foundation infrastructure (database, logging, error handling)
        const wrappedModule = this.container.wrapModule(moduleInstance, context);
        
        // Execute the method - now with bulletproof infrastructure
        return await wrappedModule[method](req, data);
    }

    setupErrorHandling() {
        // Graceful shutdown with Foundation cleanup
        const gracefulShutdown = async (signal) => {
            console.log(`[Framework] Received ${signal}, shutting down gracefully...`);
            
            const logger = await this.container.getService('logger').catch(() => null);
            
            if (logger) {
                if (typeof logger.log === 'function') {
                    logger.log('info', 'Framework shutdown initiated', {
                        signal,
                        instance: this.instanceId,
                        uptime: process.uptime()
                    });
                } else {
                    console.log('[Framework] ✅ Framework shutdown initiated');
                }
            }
            
            // Close server
            if (this.server) {
                this.server.close();
            }
            
            // Cleanup Foundation infrastructure (flush logs, close DB connections)
            await this.container.cleanup();
            
            console.log(`[Framework] Foundation instance ${this.instanceId} shut down cleanly`);
            process.exit(0);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon

        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('[Framework] Uncaught Exception:', error);
            
            try {
                const logger = await this.container.getService('logger');
                if (typeof logger.log === 'function') {
                    logger.log('error', 'Uncaught exception', {
                        error: error.message,
                        stack: error.stack,
                        instance: this.instanceId
                    });
                }
                
                // Give logger time to flush
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (logError) {
                console.error('[Framework] Failed to log uncaught exception:', logError);
            }
            
            process.exit(1);
        });

        // Handle unhandled rejections
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('[Framework] Unhandled Rejection at:', promise, 'reason:', reason);
            
            try {
                const logger = await this.container.getService('logger');
                if (typeof logger.log === 'function') {
                    logger.log('error', 'Unhandled promise rejection', {
                        reason: reason?.message || reason,
                        stack: reason?.stack,
                        instance: this.instanceId
                    });
                }
            } catch (logError) {
                console.error('[Framework] Failed to log unhandled rejection:', logError);
            }
        });
    }

    async start() {
        try {
            await this.initialize();
            
            this.server = this.app.listen(this.port, () => {
                console.log(`[Framework] 🚀 Foundation instance ${this.instanceId} listening on port ${this.port}`);
                console.log(`[Framework] 📊 Health: http://localhost:${this.port}/health`);
                console.log(`[Framework] 📋 Info: http://localhost:${this.port}/api/info`);
                console.log(`[Framework] 📈 Metrics: http://localhost:${this.port}/api/metrics`);
            });
            
            // Log startup success
            const logger = await this.container.getService('logger');
            if (typeof logger.log === 'function') {
                logger.log('info', 'Framework started successfully', {
                    instance: this.instanceId,
                    port: this.port,
                    environment: process.env.NODE_ENV || 'development'
                });
            } else {
                console.log('[Framework] ✅ Framework started successfully');
            }
            
        } catch (error) {
            console.error('[Framework] Failed to start Foundation framework:', error);
            process.exit(1);
        }
    }
}

// Start the enhanced framework
const framework = new APIFramework();
framework.start().catch(error => {
    console.error('[Framework] Critical startup failure:', error);
    process.exit(1);
});

module.exports = APIFramework;