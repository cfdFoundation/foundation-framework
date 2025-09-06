const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const Registry = require('./core/registry');
const DependencyContainer = require('./core/dependencyContainer'); // Enhanced Chat 2 version
const MiddlewarePipeline = require('./core/middlewarePipeline');
const ResponseFormatter = require('./core/responseFormatter');

class APIFramework {
    constructor() {
        this.app = express();
        this.registry = new Registry();
        this.container = new DependencyContainer(); // Now with Chat 2 infrastructure
        this.pipeline = new MiddlewarePipeline();
        this.formatter = new ResponseFormatter();
        this.port = process.env.PORT || 3000;
        this.instanceId = uuidv4().substring(0, 8);
    }

    async initialize() {
        console.log(`[Framework] Initializing Chat 2 instance ${this.instanceId}...`);
        
        // Basic Express setup
        this.setupExpress();
        
        // Initialize Chat 2 infrastructure (Database, Logging, Error Handling)
        await this.container.initialize();
        
        // Register API modules
        await this.registry.discoverAndRegister('./routes');
        
        // Setup middleware pipeline
        this.setupMiddleware();
        
        // Setup routes
        this.setupRoutes();
        
        // Setup error handling
        this.setupErrorHandling();
        
        console.log(`[Framework] Chat 2 instance ${this.instanceId} fully initialized`);
    }

    setupExpress() {
        this.app.use(helmet());
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Add request ID and instance tracking
        this.app.use((req, res, next) => {
            req.id = uuidv4();
            req.instanceId = this.instanceId;
            req.startTime = Date.now();
            next();
        });
    }

    setupMiddleware() {
        // Enhanced health check endpoint with Chat 2 diagnostics
        this.app.get('/health', async (req, res) => {
            try {
                const monitor = await this.container.getService('monitor');
                const health = await monitor.checkHealth();
                
                res.json({
                    ...health,
                    instance: this.instanceId,
                    framework: 'Chat 2 Enhanced',
                    uptime: process.uptime()
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

        // Enhanced API info endpoint
        this.app.get('/api/info', async (req, res) => {
            try {
                const registeredModules = this.registry.getModuleInfo();
                const monitor = await this.container.getService('monitor');
                const metrics = await monitor.getMetrics();
                
                res.json({
                    framework: 'Auto-Registry API - Chat 2',
                    version: '2.0.0',
                    instance: this.instanceId,
                    modules: registeredModules,
                    infrastructure: {
                        database: 'PostgreSQL + Redis',
                        logging: 'Dual (Console + Database)',
                        errorHandling: 'Comprehensive',
                        caching: 'Automatic Redis'
                    },
                    metrics,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to get API info',
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Metrics endpoint for monitoring
        this.app.get('/api/metrics', async (req, res) => {
            try {
                const monitor = await this.container.getService('monitor');
                const metrics = await monitor.getMetrics();
                res.json(metrics);
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to get metrics',
                    message: error.message
                });
            }
        });
    }

    setupRoutes() {
        // Main API routing with enhanced error handling
        this.app.all('/api/:version/:module/:method', async (req, res) => {
            const logger = await this.container.getService('logger');
            const errorHandler = await this.container.getService('errorHandler');
            
            try {
                // Run through middleware pipeline
                const context = await this.pipeline.process(req, res, this.registry);
                
                if (context.response) {
                    // Middleware handled the response (auth failure, rate limit, etc.)
                    return;
                }

                // Execute the business logic with Chat 2 infrastructure
                const result = await this.executeBusinessLogic(context);
                
                // Format and send response
                this.formatter.sendSuccess(res, result, context);
                
                // Log successful request
                logger.info('Request completed successfully', {
                    module: context.module,
                    method: context.method,
                    requestId: context.requestId,
                    responseTime: Date.now() - context.startTime,
                    userId: context.user?.id
                });
                
            } catch (error) {
                // Chat 2 error handling - creates pretty responses and logs everything
                const formattedResponse = errorHandler.createErrorResponse(error, req);
                
                // Log the error with full context
                logger.error('Request failed', {
                    module: req.params.module,
                    method: req.params.method,
                    requestId: req.id,
                    responseTime: Date.now() - req.startTime,
                    userId: req.user?.id,
                    error_details: error
                });
                
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

        // Wrap module with Chat 2 infrastructure (database, logging, error handling)
        const wrappedModule = this.container.wrapModule(moduleInstance, context);
        
        // Execute the method - now with bulletproof infrastructure
        return await wrappedModule[method](req, data);
    }

    setupErrorHandling() {
        // Graceful shutdown with Chat 2 cleanup
        const gracefulShutdown = async (signal) => {
            console.log(`[Framework] Received ${signal}, shutting down gracefully...`);
            
            const logger = await this.container.getService('logger').catch(() => null);
            
            if (logger) {
                logger.info('Framework shutdown initiated', {
                    signal,
                    instance: this.instanceId,
                    uptime: process.uptime()
                });
            }
            
            // Close server
            if (this.server) {
                this.server.close();
            }
            
            // Cleanup Chat 2 infrastructure (flush logs, close DB connections)
            await this.container.cleanup();
            
            console.log(`[Framework] Chat 2 instance ${this.instanceId} shut down cleanly`);
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
                logger.error('Uncaught exception', {
                    error: error.message,
                    stack: error.stack,
                    instance: this.instanceId
                });
                
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
                logger.error('Unhandled promise rejection', {
                    reason: reason?.message || reason,
                    stack: reason?.stack,
                    instance: this.instanceId
                });
            } catch (logError) {
                console.error('[Framework] Failed to log unhandled rejection:', logError);
            }
        });
    }

    async start() {
        try {
            await this.initialize();
            
            this.server = this.app.listen(this.port, () => {
                console.log(`[Framework] 🚀 Chat 2 instance ${this.instanceId} listening on port ${this.port}`);
                console.log(`[Framework] 📊 Health: http://localhost:${this.port}/health`);
                console.log(`[Framework] 📋 Info: http://localhost:${this.port}/api/info`);
                console.log(`[Framework] 📈 Metrics: http://localhost:${this.port}/api/metrics`);
            });
            
            // Log startup success
            const logger = await this.container.getService('logger');
            logger.info('Framework started successfully', {
                instance: this.instanceId,
                port: this.port,
                environment: process.env.NODE_ENV || 'development'
            });
            
        } catch (error) {
            console.error('[Framework] Failed to start Chat 2 framework:', error);
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