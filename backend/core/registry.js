// backend/core/registry.js
// Enhanced Registry with Core Module Support and Role-Based Configuration

const fs = require('fs');
const path = require('path');

class Registry {
    constructor() {
        this.modules = new Map();
        this.moduleConfigs = new Map();
        this.coreModulesRegistered = false;
    }

    async discoverAndRegister(routesPath) {
        // First, register core modules
        if (!this.coreModulesRegistered) {
            await this.registerCoreModules();
            this.coreModulesRegistered = true;
        }

        // Then register user modules
        const absolutePath = path.resolve(routesPath);
        
        if (!fs.existsSync(absolutePath)) {
            console.log(`[Registry] Routes directory ${absolutePath} not found, creating...`);
            fs.mkdirSync(absolutePath, { recursive: true });
            return;
        }

        const files = fs.readdirSync(absolutePath);
        const jsFiles = files.filter(file => file.endsWith('.js'));

        console.log(`[Registry] Discovering user modules in ${absolutePath}...`);

        for (const file of jsFiles) {
            const filePath = path.join(absolutePath, file);
            await this.registerModule(filePath, false);
        }

        console.log(`[Registry] Registered ${this.modules.size} total modules (${this.getCoreModuleCount()} core + ${this.getUserModuleCount()} user)`);
    }

    async registerCoreModules() {
        console.log('[Registry] Registering core modules...');
        
        const coreModulesPath = path.join(__dirname, 'modules');
        
        if (!fs.existsSync(coreModulesPath)) {
            console.log('[Registry] No core modules directory found');
            return;
        }

        const files = fs.readdirSync(coreModulesPath);
        const jsFiles = files.filter(file => file.endsWith('.js'));

        for (const file of jsFiles) {
            const filePath = path.join(coreModulesPath, file);
            await this.registerModule(filePath, true);
        }

        console.log(`[Registry] Registered ${this.getCoreModuleCount()} core modules`);
    }

    async registerModule(filePath, isCore = false) {
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
            config.isCore = isCore; // Mark if this is a core module
            config.filePath = filePath; // Store file path for reloading

            // Check for conflicts with existing modules
            const moduleKey = `${config.routerName}:${config.version}`;
            
            if (this.modules.has(moduleKey)) {
                const existingConfig = this.moduleConfigs.get(moduleKey);
                
                // Core modules can be overridden by user modules
                if (existingConfig.isCore && !isCore) {
                    console.log(`[Registry] User module ${config.routerName}@${config.version} overriding core module`);
                } else if (!existingConfig.isCore && isCore) {
                    console.log(`[Registry] Skipping core module ${config.routerName}@${config.version} - user module already exists`);
                    return;
                } else {
                    console.warn(`[Registry] Module conflict: ${config.routerName}@${config.version} already registered`);
                    return;
                }
            }
            
            // Store module and config
            this.modules.set(moduleKey, moduleExports);
            this.moduleConfigs.set(moduleKey, config);

            const moduleType = isCore ? '[CORE]' : '[USER]';
            console.log(`[Registry] ${moduleType} Registered: ${config.routerName}@${config.version} (${this.getMethodCount(moduleExports)} methods)`);
            
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

    getCoreModuleCount() {
        let count = 0;
        for (const config of this.moduleConfigs.values()) {
            if (config.isCore) count++;
        }
        return count;
    }

    getUserModuleCount() {
        let count = 0;
        for (const config of this.moduleConfigs.values()) {
            if (!config.isCore) count++;
        }
        return count;
    }

    getModuleCount() {
        return this.modules.size;
    }

    logModuleMethods(routerName, moduleExports, config) {
        const methods = Object.keys(moduleExports).filter(key => 
            typeof moduleExports[key] === 'function' && !key.startsWith('_')
        );

        const moduleType = config.isCore ? '[CORE]' : '[USER]';
        console.log(`[Registry] ${moduleType} Methods for ${routerName}:`);
        
        methods.forEach(method => {
            const methodConfig = config.methods[method] || {};
            const authRequired = methodConfig.authRequired ?? config.authRequired;
            const rateLimit = methodConfig.rateLimit || config.rateLimit;
            const isPublic = methodConfig.public === true;
            const roles = methodConfig.roles;
            
            let flags = [];
            if (isPublic) flags.push('public');
            if (authRequired) flags.push('auth');
            if (roles) flags.push(`roles:${Array.isArray(roles) ? roles.join('|') : roles}`);
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
                isCore: config.isCore,
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

    // Enhanced method configuration with role support
    getMethodConfig(routerName, methodName, version = 'v1') {
        const config = this.getModuleConfig(routerName, version);
        if (!config) return null;

        const globalConfig = {
            authRequired: config.authRequired,
            rateLimit: config.rateLimit,
            roles: config.roles || null
        };

        const methodConfig = config.methods[methodName] || {};
        
        // Method config overrides global config
        return {
            authRequired: methodConfig.authRequired ?? globalConfig.authRequired,
            rateLimit: methodConfig.rateLimit || globalConfig.rateLimit,
            public: methodConfig.public === true,
            roles: methodConfig.roles || globalConfig.roles,
            permissions: methodConfig.permissions || config.permissions,
            ...methodConfig
        };
    }

    // Get all modules with their statistics
    getModuleStats() {
        const stats = {
            totalModules: this.modules.size,
            coreModules: this.getCoreModuleCount(),
            userModules: this.getUserModuleCount(),
            modules: []
        };

        for (const [moduleKey, config] of this.moduleConfigs) {
            const module = this.modules.get(moduleKey);
            const methods = Object.keys(module).filter(key => 
                typeof module[key] === 'function' && !key.startsWith('_')
            );

            stats.modules.push({
                key: moduleKey,
                routerName: config.routerName,
                version: config.version,
                isCore: config.isCore,
                methodCount: methods.length,
                authRequired: config.authRequired,
                rateLimit: config.rateLimit,
                roles: config.roles
            });
        }

        return stats;
    }

    // Check if a module exists
    hasModule(routerName, version = 'v1') {
        const moduleKey = `${routerName}:${version}`;
        return this.modules.has(moduleKey);
    }

    // Get all available versions for a module
    getModuleVersions(routerName) {
        const versions = [];
        for (const [moduleKey, config] of this.moduleConfigs) {
            if (config.routerName === routerName) {
                versions.push(config.version);
            }
        }
        return versions;
    }

    // Get all module names
    getModuleNames() {
        const names = new Set();
        for (const [, config] of this.moduleConfigs) {
            names.add(config.routerName);
        }
        return Array.from(names);
    }

    // Get core modules only
    getCoreModules() {
        const coreModules = [];
        for (const [moduleKey, config] of this.moduleConfigs) {
            if (config.isCore) {
                coreModules.push({
                    key: moduleKey,
                    config,
                    module: this.modules.get(moduleKey)
                });
            }
        }
        return coreModules;
    }

    // Get user modules only
    getUserModules() {
        const userModules = [];
        for (const [moduleKey, config] of this.moduleConfigs) {
            if (!config.isCore) {
                userModules.push({
                    key: moduleKey,
                    config,
                    module: this.modules.get(moduleKey)
                });
            }
        }
        return userModules;
    }

    // Check if user management is available
    hasUserManagement() {
        return this.hasModule('users');
    }

    // Get available authentication methods
    getAuthMethods() {
        const userModule = this.getModule('users');
        if (!userModule) return [];

        const methods = [];
        if (typeof userModule.register === 'function') methods.push('register');
        if (typeof userModule.login === 'function') methods.push('login');
        
        return methods;
    }

    // Reload a specific module (for development)
    async reloadModule(routerName, version = 'v1') {
        const moduleKey = `${routerName}:${version}`;
        const config = this.moduleConfigs.get(moduleKey);
        
        if (!config || !config.filePath) {
            throw new Error(`Module ${routerName}@${version} not found or no file path stored`);
        }

        console.log(`[Registry] Reloading module: ${routerName}@${version}`);
        
        // Remove from registry
        this.modules.delete(moduleKey);
        this.moduleConfigs.delete(moduleKey);
        
        // Re-register
        await this.registerModule(config.filePath, config.isCore);
    }

    // Helper method to validate role access
    hasRoleAccess(userRoles, requiredRoles) {
        if (!requiredRoles || requiredRoles.length === 0) {
            return true; // No role requirement
        }

        if (!userRoles || userRoles.length === 0) {
            return false; // User has no roles but roles are required
        }

        const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        const user = Array.isArray(userRoles) ? userRoles : [userRoles];

        return required.some(role => user.includes(role));
    }
}

module.exports = Registry;