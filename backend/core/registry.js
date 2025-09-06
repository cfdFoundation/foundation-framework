const fs = require('fs');
const path = require('path');

class Registry {
    constructor() {
        this.modules = new Map();
        this.moduleConfigs = new Map();
    }

    async discoverAndRegister(routesPath) {
        const absolutePath = path.resolve(routesPath);
        
        if (!fs.existsSync(absolutePath)) {
            console.log(`[Registry] Routes directory ${absolutePath} not found, creating...`);
            fs.mkdirSync(absolutePath, { recursive: true });
            return;
        }

        const files = fs.readdirSync(absolutePath);
        const jsFiles = files.filter(file => file.endsWith('.js'));

        console.log(`[Registry] Discovering modules in ${absolutePath}...`);

        for (const file of jsFiles) {
            const filePath = path.join(absolutePath, file);
            await this.registerModule(filePath);
        }

        console.log(`[Registry] Registered ${this.modules.size} modules`);
    }

    async registerModule(filePath) {
        try {
            // Clear require cache for hot reloading in development
            delete require.cache[require.resolve(filePath)];
            
            const moduleExports = require(filePath);
            
            // Check if module has configuration
            if (!moduleExports._moduleConfig) {
                console.warn(`[Registry] Module ${filePath} missing _moduleConfig, skipping`);
                return;
            }

            const config = moduleExports._moduleConfig;
            const requiredFields = ['routerName'];
            
            for (const field of requiredFields) {
                if (!config[field]) {
                    console.warn(`[Registry] Module ${filePath} missing required config field '${field}', skipping`);
                    return;
                }
            }

            // Set defaults
            config.version = config.version || 'v1';
            config.authRequired = config.authRequired ?? false;
            config.rateLimit = config.rateLimit || null;
            config.methods = config.methods || {};

            // Create module key
            const moduleKey = `${config.routerName}:${config.version}`;
            
            // Store module and config
            this.modules.set(moduleKey, moduleExports);
            this.moduleConfigs.set(moduleKey, config);

            console.log(`[Registry] Registered module: ${config.routerName}@${config.version} (${this.getMethodCount(moduleExports)} methods)`);
            
            // Log methods if in development
            if (process.env.NODE_ENV === 'development') {
                this.logModuleMethods(config.routerName, moduleExports, config);
            }

        } catch (error) {
            console.error(`[Registry] Failed to register module ${filePath}:`, error.message);
        }
    }

    getModule(routerName, version = 'v1') {
        const moduleKey = `${routerName}:${version}`;
        return this.modules.get(moduleKey);
    }

    getModuleConfig(routerName, version = 'v1') {
        const moduleKey = `${routerName}:${version}`;
        return this.moduleConfigs.get(moduleKey);
    }

    getMethodCount(moduleExports) {
        const methods = Object.keys(moduleExports).filter(key => 
            typeof moduleExports[key] === 'function' && !key.startsWith('_')
        );
        return methods.length;
    }

    logModuleMethods(routerName, moduleExports, config) {
        const methods = Object.keys(moduleExports).filter(key => 
            typeof moduleExports[key] === 'function' && !key.startsWith('_')
        );

        console.log(`[Registry]   Methods for ${routerName}:`);
        methods.forEach(method => {
            const methodConfig = config.methods[method] || {};
            const authRequired = methodConfig.authRequired ?? config.authRequired;
            const rateLimit = methodConfig.rateLimit || config.rateLimit;
            const isPublic = methodConfig.public === true;
            
            let flags = [];
            if (isPublic) flags.push('public');
            if (authRequired) flags.push('auth');
            if (rateLimit) flags.push(`rate:${rateLimit}`);
            
            const flagsStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
            console.log(`[Registry]     - ${method}${flagsStr}`);
        });
    }

    getModuleInfo() {
        const info = {};
        
        for (const [moduleKey, config] of this.moduleConfigs) {
            const module = this.modules.get(moduleKey);
            const methods = Object.keys(module).filter(key => 
                typeof module[key] === 'function' && !key.startsWith('_')
            );

            info[moduleKey] = {
                routerName: config.routerName,
                version: config.version,
                authRequired: config.authRequired,
                rateLimit: config.rateLimit,
                methods: methods.map(method => ({
                    name: method,
                    config: config.methods[method] || {}
                }))
            };
        }

        return info;
    }

    getAllModules() {
        return Array.from(this.modules.entries()).map(([key, module]) => ({
            key,
            module,
            config: this.moduleConfigs.get(key)
        }));
    }

    // Method to validate if a route is allowed
    isMethodAllowed(routerName, methodName, version = 'v1') {
        const config = this.getModuleConfig(routerName, version);
        if (!config) return false;

        const module = this.getModule(routerName, version);
        if (!module) return false;

        // Check if method exists and is a function
        return typeof module[methodName] === 'function' && !methodName.startsWith('_');
    }

    // Get method-specific configuration
    getMethodConfig(routerName, methodName, version = 'v1') {
        const config = this.getModuleConfig(routerName, version);
        if (!config) return null;

        const globalConfig = {
            authRequired: config.authRequired,
            rateLimit: config.rateLimit
        };

        const methodConfig = config.methods[methodName] || {};
        
        // Method config overrides global config
        return {
            authRequired: methodConfig.authRequired ?? globalConfig.authRequired,
            rateLimit: methodConfig.rateLimit || globalConfig.rateLimit,
            public: methodConfig.public === true,
            ...methodConfig
        };
    }
}

module.exports = Registry;