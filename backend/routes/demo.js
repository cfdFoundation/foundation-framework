// backend/routes/demo.js
// Enhanced demo module showcasing role-based access control
// Now with role-based permissions and user context examples

const _moduleConfig = {
    routerName: 'demo',
    version: 'v1',
    authRequired: false,
    rateLimit: '100/hour',
    methods: {
        // Public endpoints
        getPublicData: { 
            public: true,
            rateLimit: '200/hour'
        },
        getPublicStats: { 
            public: true,
            rateLimit: '50/hour'
        },
        
        // User endpoints (authenticated)
        getPrivateData: { 
            authRequired: true,
            rateLimit: '50/hour'
        },
        createRecord: { 
            authRequired: true,
            rateLimit: '20/hour'
        },
        updateRecord: { 
            authRequired: true,
            rateLimit: '30/hour'
        },
        deleteRecord: { 
            authRequired: true,
            rateLimit: '10/hour'
        },
        getUserRecords: {
            authRequired: true,
            rateLimit: '100/hour'
        },
        
        // Manager endpoints
        getManagerData: {
            authRequired: true,
            roles: ['manager', 'admin'],
            rateLimit: '100/hour'
        },
        approveRecord: {
            authRequired: true,
            roles: ['manager', 'admin'],
            rateLimit: '50/hour'
        },
        bulkUpdate: {
            authRequired: true,
            roles: ['manager', 'admin'],
            rateLimit: '20/hour'
        },
        
        // Admin endpoints
        getAllRecords: {
            authRequired: true,
            roles: ['admin'],
            rateLimit: '100/hour'
        },
        getSystemStats: {
            authRequired: true,
            roles: ['admin'],
            rateLimit: '50/hour'
        },
        adminDeleteRecord: {
            authRequired: true,
            roles: ['admin'],
            rateLimit: '20/hour'
        },
        
        // Support endpoints
        getSupportData: {
            authRequired: true,
            roles: ['support', 'admin'],
            rateLimit: '200/hour'
        },
        
        // Health check
        health: { 
            public: true,
            rateLimit: '100/hour'
        }
    }
};

// Initialize demo data table if needed
async function initializeDemoTable() {
    try {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS demo_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                tags JSONB DEFAULT '[]',
                metadata JSONB DEFAULT '{}',
                status VARCHAR(50) DEFAULT 'active',
                approved BOOLEAN DEFAULT false,
                approval_date TIMESTAMPTZ,
                approved_by UUID,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                created_by UUID,
                updated_by UUID,
                version INTEGER DEFAULT 1
            );
        `;

        await this.db.query(createTableSQL);

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_demo_records_name ON demo_records(name);',
            'CREATE INDEX IF NOT EXISTS idx_demo_records_category ON demo_records(category);',
            'CREATE INDEX IF NOT EXISTS idx_demo_records_status ON demo_records(status);',
            'CREATE INDEX IF NOT EXISTS idx_demo_records_created_by ON demo_records(created_by);',
            'CREATE INDEX IF NOT EXISTS idx_demo_records_approved ON demo_records(approved);',
            'CREATE INDEX IF NOT EXISTS idx_demo_records_created_at ON demo_records(created_at DESC);'
        ];

        for (const indexSQL of indexes) {
            await this.db.query(indexSQL);
        }

        this.log('Demo table initialized successfully');

    } catch (error) {
        this.log('Failed to initialize demo table', 'error');
        throw error;
    }
}

// Public endpoint - showcase caching and performance
async function getPublicData(req, data) {
    this.log('Fetching public demo data');

    await initializeDemoTable.call(this);

    const limit = this.util.parseInteger(data.limit, 10);
    const offset = this.util.parseInteger(data.offset, 0);
    const category = this.util.sanitizeString(data.category);
    const status = this.util.sanitizeString(data.status || 'active');

    let sql = `
        SELECT id, name, description, category, tags, status, created_at, updated_at, approved
        FROM demo_records 
        WHERE status = $1 AND approved = true
    `;
    const params = [status];
    let paramIndex = 2;

    if (category) {
        sql += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const cacheKey = `public_data:${status}:${category || 'all'}:${limit}:${offset}`;
    const result = await this.db.query(sql, params, cacheKey, 300);

    const countSQL = `
        SELECT COUNT(*) as total 
        FROM demo_records 
        WHERE status = $1 AND approved = true ${category ? 'AND category = $2' : ''}
    `;
    const countParams = category ? [status, category] : [status];
    const countCacheKey = `public_data_count:${status}:${category || 'all'}`;
    
    const countResult = await this.db.query(countSQL, countParams, countCacheKey, 600);
    const total = parseInt(countResult.rows[0]?.total || 0);

    this.log(`Retrieved ${result.rows.length} public records (${result.fromCache ? 'cached' : 'fresh'})`);

    return {
        records: result.rows,
        pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total,
            fromCache: result.fromCache
        },
        queryTime: result.queryTime,
        timestamp: this.util.getCurrentTimestamp()
    };
}

// Public statistics
async function getPublicStats(req, data) {
    this.log('Fetching public statistics');

    await initializeDemoTable.call(this);

    const sql = `
        SELECT 
            COUNT(*) as total_records,
            COUNT(*) FILTER (WHERE approved = true) as approved_records,
            COUNT(DISTINCT category) as categories,
            MAX(created_at) as latest_record
        FROM demo_records 
        WHERE status = 'active'
    `;

    const result = await this.db.query(sql, [], 'public_stats', 300);
    const stats = result.rows[0];

    return {
        stats: {
            total_records: parseInt(stats.total_records),
            approved_records: parseInt(stats.approved_records),
            categories: parseInt(stats.categories),
            latest_record: stats.latest_record
        },
        fromCache: result.fromCache,
        generated_at: this.util.getCurrentTimestamp()
    };
}

// Private endpoint - showcase user context
async function getPrivateData(req, data) {
    this.log(`Fetching private data for user ${this.context.user.id}`);

    await initializeDemoTable.call(this);

    const userId = this.context.user.id;

    const sql = `
        SELECT 
            id, name, description, category, tags, metadata, status, approved,
            created_at, updated_at, version
        FROM demo_records 
        WHERE created_by = $1 
        ORDER BY updated_at DESC 
        LIMIT 50
    `;

    const cacheKey = `private_data:${userId}`;
    const result = await this.db.query(sql, [userId], cacheKey, 300);

    const statsSQL = `
        SELECT 
            status,
            approved,
            COUNT(*) as count,
            MAX(updated_at) as last_updated
        FROM demo_records 
        WHERE created_by = $1 
        GROUP BY status, approved
    `;

    const statsResult = await this.db.query(statsSQL, [userId], `user_stats:${userId}`, 600);

    this.log(`Retrieved ${result.rows.length} private records for user ${userId}`);

    return {
        records: result.rows,
        statistics: statsResult.rows,
        user: {
            id: this.context.user.id,
            username: this.context.username,
            roles: this.context.getUserRoles()
        },
        fromCache: result.fromCache,
        requestId: this.context.requestId
    };
}

// Create operation with user context
async function createRecord(req, data) {
    this.log('Creating new demo record');

    await initializeDemoTable.call(this);

    this.util.validate(data, {
        name: { 
            required: true, 
            minLength: 2, 
            maxLength: 255 
        },
        description: { 
            maxLength: 1000 
        },
        category: { 
            required: true,
            pattern: /^[a-zA-Z0-9_-]+$/
        }
    });

    const name = this.util.sanitizeString(data.name);
    const description = this.util.sanitizeString(data.description);
    const category = this.util.sanitizeString(data.category);
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const metadata = typeof data.metadata === 'object' ? data.metadata : {};

    // Check for duplicate names in same category for this user
    const duplicateCheck = await this.db.query(
        'SELECT id FROM demo_records WHERE name = $1 AND category = $2 AND created_by = $3 AND status = $4',
        [name, category, this.context.user.id, 'active']
    );

    if (duplicateCheck.rows.length > 0) {
        throw {
            code: 'DUPLICATE_RECORD',
            message: `You already have a record with name '${name}' in category '${category}'`,
            statusCode: 409
        };
    }

    const recordData = {
        name,
        description,
        category,
        tags: JSON.stringify(tags),
        metadata: JSON.stringify(metadata),
        status: 'active',
        approved: false, // Requires approval
        created_by: this.context.user.id,
        updated_by: this.context.user.id
    };

    const result = await this.db.insert('demo_records', recordData);

    // Invalidate related caches
    await this.cache.invalidate('public_data:*');
    await this.cache.invalidate(`private_data:${this.context.user.id}`);
    await this.cache.invalidate(`user_stats:${this.context.user.id}`);

    this.log(`Created record ${result.id} in category ${category} by user ${this.context.username}`);

    return {
        id: result.id,
        name: result.name,
        description: result.description,
        category: result.category,
        tags: JSON.parse(result.tags || '[]'),
        metadata: JSON.parse(result.metadata || '{}'),
        status: result.status,
        approved: result.approved,
        createdAt: result.created_at,
        createdBy: result.created_by,
        version: result.version,
        message: 'Record created successfully. Pending approval.'
    };
}

// Update with ownership checking
async function updateRecord(req, data) {
    this.log(`Updating record ${data.id}`);

    await initializeDemoTable.call(this);

    this.util.validate(data, {
        id: { required: true },
        version: { required: true, type: 'number' }
    });

    const id = this.util.sanitizeString(data.id);
    const expectedVersion = this.util.parseInteger(data.version);

    const current = await this.db.findById('demo_records', id);
    
    if (!current) {
        throw {
            code: 'RECORD_NOT_FOUND',
            message: 'Record not found',
            statusCode: 404
        };
    }

    // Use context helper for ownership check
    this.context.requireOwnership(current.created_by);

    // Optimistic locking check
    if (current.version !== expectedVersion) {
        throw {
            code: 'VERSION_CONFLICT',
            message: `Record has been modified. Expected version ${expectedVersion}, found ${current.version}`,
            statusCode: 409,
            currentVersion: current.version
        };
    }

    const updateData = {
        updated_by: this.context.user.id,
        version: current.version + 1,
        approved: false // Reset approval on update
    };

    // Update allowed fields
    if (data.name !== undefined) {
        this.util.validate({ name: data.name }, { name: { minLength: 2, maxLength: 255 } });
        updateData.name = this.util.sanitizeString(data.name);
    }

    if (data.description !== undefined) {
        updateData.description = this.util.sanitizeString(data.description);
    }

    if (data.category !== undefined) {
        this.util.validate({ category: data.category }, { category: { pattern: /^[a-zA-Z0-9_-]+$/ } });
        updateData.category = this.util.sanitizeString(data.category);
    }

    if (data.tags !== undefined) {
        updateData.tags = JSON.stringify(Array.isArray(data.tags) ? data.tags : []);
    }

    if (data.metadata !== undefined) {
        updateData.metadata = JSON.stringify(typeof data.metadata === 'object' ? data.metadata : {});
    }

    const result = await this.db.update('demo_records', id, updateData);

    await this.cache.invalidate('public_data:*');
    await this.cache.invalidate(`private_data:${this.context.user.id}`);

    this.log(`Updated record ${id} to version ${result.version} by user ${this.context.username}`);

    return {
        id: result.id,
        name: result.name,
        description: result.description,
        category: result.category,
        tags: JSON.parse(result.tags || '[]'),
        metadata: JSON.parse(result.metadata || '{}'),
        status: result.status,
        approved: result.approved,
        updatedAt: result.updated_at,
        updatedBy: result.updated_by,
        version: result.version,
        message: 'Record updated successfully. Pending re-approval.'
    };
}

// Delete with ownership check
async function deleteRecord(req, data) {
    this.log(`Deleting record ${data.id}`);

    await initializeDemoTable.call(this);

    const id = this.util.sanitizeString(data.id);

    if (!id) {
        throw {
            code: 'VALIDATION_ERROR',
            message: 'Record ID is required',
            statusCode: 400
        };
    }

    const record = await this.db.findById('demo_records', id);
    
    if (!record) {
        throw {
            code: 'RECORD_NOT_FOUND',
            message: 'Record not found',
            statusCode: 404
        };
    }

    // Check ownership or admin access
    this.context.requireOwnership(record.created_by);

    // Soft delete
    const result = await this.db.update('demo_records', id, {
        status: 'deleted',
        updated_by: this.context.user.id,
        version: record.version + 1
    });

    await this.cache.invalidate('public_data:*');
    await this.cache.invalidate(`private_data:${this.context.user.id}`);

    this.log(`Soft deleted record ${id} by user ${this.context.username}`);

    return {
        id,
        deleted: true,
        deletedAt: this.util.getCurrentTimestamp(),
        deletedBy: this.context.user.id,
        message: 'Record deleted successfully'
    };
}

// Get user's own records
async function getUserRecords(req, data) {
    this.log('Fetching user records with filters');

    await initializeDemoTable.call(this);

    const userId = this.context.user.id;
    const status = this.util.sanitizeString(data.status || 'active');
    const approved = data.approved; // can be true, false, or undefined
    const limit = Math.min(this.util.parseInteger(data.limit, 20), 100);
    const offset = this.util.parseInteger(data.offset, 0);

    let sql = `
        SELECT id, name, description, category, tags, status, approved, 
               created_at, updated_at, version
        FROM demo_records 
        WHERE created_by = $1 AND status = $2
    `;
    const params = [userId, status];
    let paramIndex = 3;

    if (approved !== undefined) {
        sql += ` AND approved = $${paramIndex}`;
        params.push(approved);
        paramIndex++;
    }

    sql += ` ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(sql, params);

    return {
        records: result.rows.map(record => ({
            ...record,
            tags: JSON.parse(record.tags || '[]')
        })),
        pagination: {
            limit,
            offset,
            hasMore: result.rows.length === limit
        },
        user: {
            id: userId,
            username: this.context.username
        }
    };
}

// Manager-only endpoint
async function getManagerData(req, data) {
    this.log('Fetching manager data');

    // Role is already checked by middleware, but we can double-check
    this.context.requireRole('manager');

    await initializeDemoTable.call(this);

    const sql = `
        SELECT 
            dr.id, dr.name, dr.description, dr.category, dr.status, dr.approved,
            dr.created_at, dr.updated_at, dr.created_by,
            fu.username as creator_username, fu.first_name, fu.last_name
        FROM demo_records dr
        LEFT JOIN framework_users fu ON dr.created_by = fu.id
        WHERE dr.status = 'active' AND dr.approved = false
        ORDER BY dr.created_at DESC
        LIMIT 50
    `;

    const result = await this.db.query(sql, [], 'pending_approval', 300);

    this.log(`Manager ${this.context.username} retrieved ${result.rows.length} pending records`);

    return {
        pendingRecords: result.rows,
        manager: {
            id: this.context.user.id,
            username: this.context.username,
            roles: this.context.getUserRoles()
        },
        fromCache: result.fromCache
    };
}

// Manager approval function
async function approveRecord(req, data) {
    this.log('Approving record');

    this.context.requireRole('manager');

    this.util.validate(data, {
        id: { required: true },
        approved: { required: true, type: 'boolean' }
    });

    const id = this.util.sanitizeString(data.id);
    const approved = data.approved;

    const record = await this.db.findById('demo_records', id);
    
    if (!record) {
        throw {
            code: 'RECORD_NOT_FOUND',
            message: 'Record not found',
            statusCode: 404
        };
    }

    const result = await this.db.update('demo_records', id, {
        approved: approved,
        approval_date: approved ? new Date() : null,
        approved_by: approved ? this.context.user.id : null,
        updated_by: this.context.user.id
    });

    await this.cache.invalidate('public_data:*');
    await this.cache.invalidate('pending_approval');

    const action = approved ? 'approved' : 'rejected';
    this.log(`Record ${id} ${action} by manager ${this.context.username}`);

    return {
        id: result.id,
        approved: result.approved,
        approvalDate: result.approval_date,
        approvedBy: result.approved_by,
        message: `Record ${action} successfully`,
        approver: {
            id: this.context.user.id,
            username: this.context.username
        }
    };
}

// Admin-only: Get all records
async function getAllRecords(req, data) {
    this.log('Admin fetching all records');

    this.context.requireAdmin();

    await initializeDemoTable.call(this);

    const limit = Math.min(this.util.parseInteger(data.limit, 50), 200);
    const offset = this.util.parseInteger(data.offset, 0);
    const status = this.util.sanitizeString(data.status);

    let sql = `
        SELECT 
            dr.*, 
            fu.username as creator_username,
            ap.username as approver_username
        FROM demo_records dr
        LEFT JOIN framework_users fu ON dr.created_by = fu.id
        LEFT JOIN framework_users ap ON dr.approved_by = ap.id
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
        sql += ` WHERE dr.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
    }

    sql += ` ORDER BY dr.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(sql, params);

    this.log(`Admin ${this.context.username} retrieved ${result.rows.length} records`);

    return {
        records: result.rows.map(record => ({
            ...record,
            tags: JSON.parse(record.tags || '[]'),
            metadata: JSON.parse(record.metadata || '{}')
        })),
        pagination: {
            limit,
            offset,
            hasMore: result.rows.length === limit
        },
        admin: {
            id: this.context.user.id,
            username: this.context.username
        }
    };
}

// Admin system statistics
async function getSystemStats(req, data) {
    this.log('Generating system statistics');

    this.context.requireAdmin();

    await initializeDemoTable.call(this);

    const sql = `
        SELECT 
            COUNT(*) as total_records,
            COUNT(*) FILTER (WHERE status = 'active') as active_records,
            COUNT(*) FILTER (WHERE approved = true) as approved_records,
            COUNT(*) FILTER (WHERE approved = false AND status = 'active') as pending_records,
            COUNT(*) FILTER (WHERE status = 'deleted') as deleted_records,
            COUNT(DISTINCT created_by) as unique_creators,
            COUNT(DISTINCT category) as categories,
            MAX(created_at) as latest_record,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
        FROM demo_records
    `;

    const result = await this.db.query(sql, [], 'admin_system_stats', 300);
    const stats = result.rows[0];

    // Get top categories
    const categorySQL = `
        SELECT category, COUNT(*) as count
        FROM demo_records 
        WHERE status = 'active'
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 10
    `;

    const categoryResult = await this.db.query(categorySQL, [], 'admin_top_categories', 300);

    this.log(`Admin ${this.context.username} generated system statistics`);

    return {
        overview: {
            total_records: parseInt(stats.total_records),
            active_records: parseInt(stats.active_records),
            approved_records: parseInt(stats.approved_records),
            pending_records: parseInt(stats.pending_records),
            deleted_records: parseInt(stats.deleted_records),
            unique_creators: parseInt(stats.unique_creators),
            categories: parseInt(stats.categories),
            latest_record: stats.latest_record,
            avg_processing_time_seconds: parseFloat(stats.avg_processing_time || 0).toFixed(2)
        },
        topCategories: categoryResult.rows,
        generatedBy: {
            id: this.context.user.id,
            username: this.context.username,
            timestamp: this.util.getCurrentTimestamp()
        },
        fromCache: result.fromCache
    };
}

// Support data access
async function getSupportData(req, data) {
    this.log('Support accessing user data');

    this.context.requireRole('support');

    const searchTerm = this.util.sanitizeString(data.search);
    
    if (!searchTerm || searchTerm.length < 3) {
        throw {
            code: 'INVALID_SEARCH',
            message: 'Search term must be at least 3 characters',
            statusCode: 400
        };
    }

    const sql = `
        SELECT 
            dr.id, dr.name, dr.category, dr.status, dr.approved, dr.created_at,
            fu.username, fu.email, fu.first_name, fu.last_name
        FROM demo_records dr
        JOIN framework_users fu ON dr.created_by = fu.id
        WHERE dr.name ILIKE $1 OR fu.username ILIKE $1 OR fu.email ILIKE $1
        ORDER BY dr.created_at DESC
        LIMIT 20
    `;

    const result = await this.db.query(sql, [`%${searchTerm}%`]);

    this.log(`Support ${this.context.username} searched for "${searchTerm}" - ${result.rows.length} results`);

    return {
        searchTerm,
        results: result.rows,
        support: {
            id: this.context.user.id,
            username: this.context.username,
            searchTime: this.util.getCurrentTimestamp()
        }
    };
}

// Health check
async function health(req, data) {
    try {
        await initializeDemoTable.call(this);

        const testQuery = await this.db.query('SELECT COUNT(*) as count FROM demo_records', [], null, 0);
        
        return {
            module: 'demo',
            status: 'healthy',
            database: {
                connected: true,
                recordCount: parseInt(testQuery.rows[0]?.count || 0),
                queryTime: testQuery.queryTime
            },
            features: {
                roleBasedAccess: true,
                userContext: true,
                approvalWorkflow: true
            },
            timestamp: this.util.getCurrentTimestamp(),
            version: '3.0.0'
        };
    } catch (error) {
        return {
            module: 'demo',
            status: 'unhealthy',
            error: error.message,
            timestamp: this.util.getCurrentTimestamp()
        };
    }
}

module.exports = {
    _moduleConfig,
    getPublicData,
    getPublicStats,
    getPrivateData,
    createRecord,
    updateRecord,
    deleteRecord,
    getUserRecords,
    getManagerData,
    approveRecord,
    getAllRecords,
    getSystemStats,
    getSupportData,
    health
};