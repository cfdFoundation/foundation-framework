// Example API module demonstrating the framework
// This module will be enhanced with real database operations in Chat 2

// Module configuration - this is what the registry looks for
const _moduleConfig = {
    routerName: 'demo',
    version: 'v1',
    authRequired: false, // Global auth setting
    rateLimit: '100/hour', // Global rate limit
    methods: {
        // Method-specific overrides
        getPublicData: { 
            public: true, // No auth required
            rateLimit: '200/hour' // Higher limit for public endpoint
        },
        getPrivateData: { 
            authRequired: true, // Override global setting
            rateLimit: '50/hour'
        },
        createRecord: { 
            authRequired: true,
            rateLimit: '20/hour'
        },
        updateRecord: { 
            authRequired: true 
        },
        deleteRecord: { 
            authRequired: true,
            rateLimit: '10/hour'
        }
    }
};

// Business logic methods
// Notice how clean these are - no error handling, no auth checks, no logging setup
// The framework handles all of that automatically

async function getPublicData(req, data) {
    // Use injected logger
    this.log('Fetching public data');
    
    // Use injected database (placeholder for Chat 2)
    const result = await this.db.query(
        'SELECT id, name, description FROM public_items WHERE active = true',
        'public_items_active',
        300 // 5 minute cache
    );

    // Use injected utilities
    const timestamp = this.util.getCurrentTimestamp();
    
    return {
        items: result.rows || [
            { id: 1, name: 'Demo Item 1', description: 'This is a demo item' },
            { id: 2, name: 'Demo Item 2', description: 'Another demo item' }
        ],
        retrievedAt: timestamp,
        fromCache: result.fromCache || false
    };
}

async function getPrivateData(req, data) {
    this.log(`Fetching private data for user ${this.context.user.id}`);
    
    // Access user context injected by the framework
    const userId = this.context.user.id;
    
    const result = await this.db.query(
        'SELECT * FROM user_private_data WHERE user_id = $1',
        `private_data_${userId}`,
        600 // 10 minute cache
    );

    return {
        data: result.rows || [
            { id: 1, secret: 'User secret data', userId }
        ],
        user: this.context.user,
        requestId: this.context.requestId
    };
}

async function createRecord(req, data) {
    this.log('Creating new record');
    
    // Simple validation using injected utilities
    const name = this.util.sanitizeString(data.name);
    const description = this.util.sanitizeString(data.description);
    
    if (!name) {
        // The framework will catch this and return a proper error response
        throw {
            code: 'VALIDATION_ERROR',
            message: 'Name is required',
            statusCode: 400
        };
    }

    // Generate ID using utility
    const id = this.util.generateId();
    const timestamp = this.util.getCurrentTimestamp();
    
    const result = await this.db.query(
        'INSERT INTO demo_records (id, name, description, created_at, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        null, // No caching for writes
        null
    );

    // Log the creation
    this.log(`Created record ${id} by user ${this.context.user.id}`);

    return {
        id,
        name,
        description,
        createdAt: timestamp,
        createdBy: this.context.user.id,
        message: 'Record created successfully'
    };
}

async function updateRecord(req, data) {
    this.log(`Updating record ${data.id}`);
    
    const id = this.util.sanitizeString(data.id);
    const name = this.util.sanitizeString(data.name);
    const description = this.util.sanitizeString(data.description);
    
    if (!id) {
        throw {
            code: 'VALIDATION_ERROR',
            message: 'Record ID is required',
            statusCode: 400
        };
    }

    // Check if record exists and user has permission
    const existing = await this.db.query(
        'SELECT * FROM demo_records WHERE id = $1',
        `record_${id}`,
        60
    );

    if (!existing.rows || existing.rows.length === 0) {
        throw {
            code: 'RECORD_NOT_FOUND',
            message: 'Record not found',
            statusCode: 404
        };
    }

    const result = await this.db.query(
        'UPDATE demo_records SET name = $1, description = $2, updated_at = $3, updated_by = $4 WHERE id = $5 RETURNING *',
        null, // No caching for writes
        null
    );

    this.log(`Updated record ${id}`);

    return {
        id,
        name,
        description,
        updatedAt: this.util.getCurrentTimestamp(),
        updatedBy: this.context.user.id,
        message: 'Record updated successfully'
    };
}

async function deleteRecord(req, data) {
    this.log(`Deleting record ${data.id}`);
    
    const id = this.util.sanitizeString(data.id);
    
    if (!id) {
        throw {
            code: 'VALIDATION_ERROR',
            message: 'Record ID is required',
            statusCode: 400
        };
    }

    const result = await this.db.query(
        'DELETE FROM demo_records WHERE id = $1 RETURNING id',
        null,
        null
    );

    if (!result.rows || result.rows.length === 0) {
        throw {
            code: 'RECORD_NOT_FOUND',
            message: 'Record not found',
            statusCode: 404
        };
    }

    this.log(`Deleted record ${id}`);

    return {
        id,
        deletedAt: this.util.getCurrentTimestamp(),
        deletedBy: this.context.user.id,
        message: 'Record deleted successfully'
    };
}

// Health check method for this module
async function health(req, data) {
    return {
        module: 'demo',
        status: 'healthy',
        timestamp: this.util.getCurrentTimestamp(),
        database: 'connected', // Will be real status in Chat 2
        cache: 'connected'
    };
}

// Export module with configuration
module.exports = {
    _moduleConfig,
    getPublicData,
    getPrivateData,
    createRecord,
    updateRecord,
    deleteRecord,
    health
};