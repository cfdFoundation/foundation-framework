const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const Registry = require('./core/registry');
const DependencyContainer = require('./core/dependencyContainer');
const MiddlewarePipeline = require('./core/middlewarePipeline');
const ResponseFormatter = require('./core/responseFormatter');

class APIFramework {
    constructor() {
        this.app = express();
        this.registry = new Registry();
        this.container = new DependencyContainer();
        this.pipeline = new MiddlewarePipeline();
        this.formatter = new ResponseFormatter();
        this.port = process.env.PORT || 3000;
        this.instanceId = uuidv4().substring(0, 8);
    }

    async initialize() {
        // Basic Express setup
        this.setupExpress();
        
        // Initialize dependency container
        await this.container.initialize();
        
        // Register API modules
        await this.registry.discoverAndRegister('./routes');
        
        // Setup middleware pipeline
        this.setupMiddleware();
        
        // Setup routes
        this.setupRoutes();
        
        // Setup error handling
        this.setupErrorHandling();
        
        console.log(`[Framework] Instance ${this.instanceId} initialized`);
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
        // Health check endpoint (bypass all middleware)
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                instance: this.instanceId,
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // API info endpoint
        this.app.get('/api/info', (req, res) => {
            const registeredModules = this.registry.getModuleInfo();
            res.json({
                framework: 'Auto-Registry API',
                version: '1.0.0',
                instance: this.instanceId,
                modules: registeredModules,
                timestamp: new Date().toISOString()
            });
        });
    }

    setupRoutes() {
        // Main API routing with middleware pipeline
        this.app.all('/api/:version/:module/:method', async (req, res) => {
            try {
                // Run through middleware pipeline
                const context = await this.pipeline.process(req, res, this.registry);
                
                if (context.response) {
                    // Middleware handled the response (auth failure, rate limit, etc.)
                    return;
                }

                // Execute the business logic
                const result = await this.executeBusinessLogic(context);
                
                // Format and send response
                this.formatter.sendSuccess(res, result, context);
                
            } catch (error) {
                // Error handling will be added in Chat 2
                this.formatter.sendError(res, error, req);
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

        // Inject dependencies (will be enhanced in Chat 2)
        const wrappedModule = this.container.wrapModule(moduleInstance, context);
        
        // Execute the method
        return await wrappedModule[method](req, data);
    }

    setupErrorHandling() {
        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`[Framework] Received ${signal}, shutting down gracefully...`);
            
            // Close server
            if (this.server) {
                this.server.close();
            }
            
            // Cleanup dependencies
            await this.container.cleanup();
            
            console.log(`[Framework] Instance ${this.instanceId} shut down`);
            process.exit(0);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon
    }

    async start() {
        await this.initialize();
        
        this.server = this.app.listen(this.port, () => {
            console.log(`[Framework] Instance ${this.instanceId} listening on port ${this.port}`);
        });
    }
}

// Start the framework
const framework = new APIFramework();
framework.start().catch(error => {
    console.error('[Framework] Failed to start:', error);
    process.exit(1);
});

module.exports = APIFramework;