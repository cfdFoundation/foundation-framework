// Enhanced demo module showcasing Chat 2 infrastructure
// Now with real database operations, enhanced logging, and bulletproof error handling

const _moduleConfig = {
    routerName: 'demo',
    version: 'v1',
    authRequired: false,
    rateLimit: '100/hour',
    methods: {
        getPublicData: { 
            public: true,
            rateLimit: '200/hour'
        },
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
        searchRecords: {
            authRequired: true,
            rateLimit: '100/hour'
        },
        getRecordStats: {
            public: true,
            rateLimit: '50/hour'
        },
        batchCreateRecords: {
            authRequired: true,
            rateLimit: '5/hour'
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
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                created_by VARCHAR(100),
                updated_by VARCHAR(100),
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

    // Initialize table if this is the first call
    await initializeDemoTable.call(this);

    // Get filter parameters
    const limit = this.util.parseInteger(data.limit, 10);
    const offset = this.util.parseInteger(data.offset, 0);
    const category = this.util.sanitizeString(data.category);
    const status = this.util.sanitizeString(data.status || 'active');

    // Build dynamic query
    let sql = `
        SELECT id, name, description, category, tags, status, created_at, updated_at
        FROM demo_records 
        WHERE status = $1
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

    // Create cache key based on parameters
    const cacheKey = `public_data:${status}:${category || 'all'}:${limit}:${offset}`;

    // Query with caching (5 minute cache)
    const result = await this.db.query(sql, params, cacheKey, 300);

    // Get total count for pagination (with caching)
    const countSQL = `
        SELECT COUNT(*) as total 
        FROM demo_records 
        WHERE status = $1 ${category ? 'AND category = $2' : ''}
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

// Private endpoint - showcase authentication and user context
async function getPrivateData(req, data) {
    this.log(`Fetching private data for user ${this.context.user.id}`);

    await initializeDemoTable.call(this);

    const userId = this.context.user.id;

    // Get user's records with enhanced filtering
    const sql = `
        SELECT 
            id, name, description, category, tags, metadata, status,
            created_at, updated_at, version
        FROM demo_records 
        WHERE created_by = $1 
        ORDER BY updated_at DESC 
        LIMIT 50
    `;

    const cacheKey = `private_data:${userId}`;
    const result = await this.db.query(sql, [userId], cacheKey, 300);

    // Get user's statistics
    const statsSQL = `
        SELECT 
            status,
            COUNT(*) as count,
            MAX(updated_at) as last_updated
        FROM demo_records 
        WHERE created_by = $1 
        GROUP BY status
    `;

    const statsResult = await this.db.query(statsSQL, [userId], `user_stats:${userId}`, 600);

    this.log(`Retrieved ${result.rows.length} private records for user ${userId}`);

    return {
        records: result.rows,
        statistics: statsResult.rows,
        user: {
            id: this.context.user.id,
            name: this.context.user.name || 'Unknown'
        },
        fromCache: result.fromCache,
        requestId: this.context.requestId
    };
}

// Create operation with validation and optimistic locking
async function createRecord(req, data) {
    this.log('Creating new demo record');

    await initializeDemoTable.call(this);

    // Enhanced validation
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

    // Check for duplicate names in same category
    const duplicateCheck = await this.db.query(
        'SELECT id FROM demo_records WHERE name = $1 AND category = $2 AND status = $3',
        [name, category, 'active']
    );

    if (duplicateCheck.rows.length > 0) {
        throw {
            code: 'DUPLICATE_RECORD',
            message: `Record with name '${name}' already exists in category '${category}'`,
            statusCode: 409
        };
    }

    // Create the record
    const recordData = {
        name,
        description,
        category,
        tags: JSON.stringify(tags),
        metadata: JSON.stringify(metadata),
        status: 'active',
        created_by: this.context.user.id,
        updated_by: this.context.user.id
    };

    const result = await this.db.insert('demo_records', recordData);

    // Invalidate related caches
    await this.cache.invalidate('public_data:*');
    await this.cache.invalidate(`private_data:${this.context.user.id}`);
    await this.cache.invalidate(`user_stats:${this.context.user.id}`);

    this.log(`Created record ${result.id} in category ${category}`);

    return {
        id: result.id,
        name: result.name,
        description: result.description,
        category: result.category,
        tags: JSON.parse(result.tags || '[]'),
        metadata: JSON.parse(result.metadata || '{}'),
        status: result.status,
        createdAt: result.created_at,
        createdBy: result.created_by,
        version: result.version
    };
}

// Update with optimistic locking and change tracking
async function updateRecord(req, data) {
    this.log(`Updating record ${data.id}`);

    await initializeDemoTable.call(this);

    // Validation
    this.util.validate(data, {
        id: { required: true },
        version: { required: true, type: 'number' }
    });

    const id = this.util.sanitizeString(data.id);
    const expectedVersion = this.util.parseInteger(data.version);

    // Get current record for optimistic locking
    const current = await this.db.findById('demo_records', id);
    
    if (!current) {
        throw {
            code: 'RECORD_NOT_FOUND',
            message: 'Record not found',
            statusCode: 404
        };
    }

    // Check ownership or admin permissions
    if (current.created_by !== this.context.user.id && !this.context.hasRole?.('admin')) {
        throw {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You can only update your own records',
            statusCode: 403
        };
    }

    // Optimistic locking check
    if (current.version !== expectedVersion) {
        throw {
            code: 'VERSION_CONFLICT',
            message: `Record has been modified by another user. Expected version ${expectedVersion}, found ${current.version}`,
            statusCode: 409,
            currentVersion: current.version
        };
    }

    // Build update data
    const updateData = {
        updated_by: this.context.user.id,
        version: current.version + 1
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

    if (data.status !== undefined) {
        updateData.status = ['active', 'inactive', 'archived'].includes(data.status) ? data.status : 'active';
    }

    // Perform the update
    const result = await this.db.update('demo_records', id, updateData);

    // Invalidate caches
    await this.cache.invalidate('public_data:*');
    await this.cache.invalidate(`private_data:${this.context.user.id}`);
    await this.cache.invalidate(`record:${id}`);

    this.log(`Updated record ${id} to version ${result.version}`);

    return {
        id: result.id,
        name: result.name,
        description: result.description,
        category: result.category,
        tags: JSON.parse(result.tags || '[]'),
        metadata: JSON.parse(result.metadata || '{}'),
        status: result.status,
        updatedAt: result.updated_at,
        updatedBy: result.updated_by,
        version: result.version
    };
}

// Enhanced delete with soft deletion
async function deleteRecord(req, data) {
    this.log(`Deleting record ${data.id}`);

    await initializeDemoTable.call(this);

    const id = this.util.sanitizeString(data.id);
    const softDelete = data.soft !== false; // Default to soft delete

    if (!id) {
        throw {
            code: 'VALIDATION_ERROR',
            message: 'Record ID is required',
            statusCode: 400
        };
    }

    // Get current record
    const record = await this.db.findById('demo_records', id);
    
    if (!record) {
        throw {
            code: 'RECORD_NOT_FOUND',
            message: 'Record not found',
            statusCode: 404
        };
    }

    // Check ownership
    if (record.created_by !== this.context.user.id && !this.context.hasRole?.('admin')) {
        throw {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You can only delete your own records',
            statusCode: 403
        };
    }

    let result;

    if (softDelete) {
        // Soft delete - just update status
        result = await this.db.update('demo_records', id, {
            status: 'deleted',
            updated_by: this.context.user.id,
            version: record.version + 1
        });
        
        this.log(`Soft deleted record ${id}`);
    } else {
        // Hard delete - actually remove from database
        result = await this.db.delete('demo_records', id);
        
        this.log(`Hard deleted record ${id}`);
    }

    // Invalidate caches
    await this.cache.invalidate('public_data:*');
    await this.cache.invalidate(`private_data:${this.context.user.id}`);
    await this.cache.invalidate(`record:${id}`);

    return {
        id,
        deleted: true,
        method: softDelete ? 'soft' : 'hard',
        deletedAt: this.util.getCurrentTimestamp(),
        deletedBy: this.context.user.id
    };
}

// Advanced search with full-text search
async function searchRecords(req, data) {
    this.log('Performing record search');

    await initializeDemoTable.call(this);

    const query = this.util.sanitizeString(data.query || '');
    const category = this.util.sanitizeString(data.category);
    const status = this.util.sanitizeString(data.status || 'active');
    const limit = Math.min(this.util.parseInteger(data.limit, 20), 100); // Max 100 results
    const offset = this.util.parseInteger(data.offset, 0);

    if (!query && !category) {
        throw {
            code: 'VALIDATION_ERROR',
            message: 'Search query or category filter is required',
            statusCode: 400
        };
    }

    let sql, params, cacheKey;

    if (query) {
        // Full-text search
        sql = `
            SELECT 
                id, name, description, category, tags, status, 
                created_at, updated_at,
                ts_rank(to_tsvector('english', name || ' ' || COALESCE(description, '')), plainto_tsquery('english', $1)) as relevance
            FROM demo_records 
            WHERE status = $2 
                AND to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)
                ${category ? 'AND category = $3' : ''}
            ORDER BY relevance DESC, updated_at DESC 
            LIMIT $${category ? 4 : 3} OFFSET $${category ? 5 : 4}
        `;
        
        params = category ? [query, status, category, limit, offset] : [query, status, limit, offset];
        cacheKey = `search:${query}:${status}:${category || 'all'}:${limit}:${offset}`;
    } else {
        // Category filter only
        sql = `
            SELECT id, name, description, category, tags, status, created_at, updated_at
            FROM demo_records 
            WHERE status = $1 AND category = $2
            ORDER BY updated_at DESC 
            LIMIT $3 OFFSET $4
        `;
        
        params = [status, category, limit, offset];
        cacheKey = `category_search:${category}:${status}:${limit}:${offset}`;
    }

    const result = await this.db.query(sql, params, cacheKey, 300);

    // Get total count
    const countSQL = query ? `
        SELECT COUNT(*) as total
        FROM demo_records 
        WHERE status = $2 
            AND to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)
            ${category ? 'AND category = $3' : ''}
    ` : `
        SELECT COUNT(*) as total
        FROM demo_records 
        WHERE status = $1 AND category = $2
    `;

    const countParams = query ? 
        (category ? [query, status, category] : [query, status]) :
        [status, category];

    const countResult = await this.db.query(countSQL, countParams, `${cacheKey}:count`, 300);
    const total = parseInt(countResult.rows[0]?.total || 0);

    this.log(`Search returned ${result.rows.length} results for query: "${query}"`);

    return {
        query,
        results: result.rows.map(row => ({
            ...row,
            tags: JSON.parse(row.tags || '[]'),
            relevance: row.relevance || null
        })),
        pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total
        },
        fromCache: result.fromCache
    };
}

// Statistics endpoint with complex aggregations
async function getRecordStats(req, data) {
    this.log('Generating record statistics');

    await initializeDemoTable.call(this);

    const timeframe = data.timeframe || '30d'; // 7d, 30d, 90d, 1y
    const groupBy = data.groupBy || 'category'; // category, status, day, week

    // Calculate date range
    const ranges = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
    };

    const days = ranges[timeframe] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cacheKey = `stats:${timeframe}:${groupBy}`;

    let sql;
    const params = [startDate.toISOString()];

    switch (groupBy) {
        case 'category':
            sql = `
                SELECT 
                    category,
                    COUNT(*) as count,
                    COUNT(*) FILTER (WHERE status = 'active') as active_count,
                    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_count,
                    AVG(CASE WHEN status = 'active' THEN 1 ELSE 0 END) * 100 as active_percentage
                FROM demo_records 
                WHERE created_at >= $1 
                GROUP BY category 
                ORDER BY count DESC
            `;
            break;

        case 'status':
            sql = `
                SELECT 
                    status,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
                FROM demo_records 
                WHERE created_at >= $1 
                GROUP BY status 
                ORDER BY count DESC
            `;
            break;

        case 'day':
            sql = `
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count,
                    COUNT(DISTINCT created_by) as unique_creators
                FROM demo_records 
                WHERE created_at >= $1 
                GROUP BY DATE(created_at) 
                ORDER BY date DESC
            `;
            break;

        case 'week':
            sql = `
                SELECT 
                    DATE_TRUNC('week', created_at) as week_start,
                    COUNT(*) as count,
                    COUNT(DISTINCT created_by) as unique_creators
                FROM demo_records 
                WHERE created_at >= $1 
                GROUP BY DATE_TRUNC('week', created_at) 
                ORDER BY week_start DESC
            `;
            break;

        default:
            throw {
                code: 'INVALID_GROUP_BY',
                message: 'Invalid groupBy parameter. Use: category, status, day, or week',
                statusCode: 400
            };
    }

    const result = await this.db.query(sql, params, cacheKey, 600); // 10-minute cache

    // Overall statistics
    const overallSQL = `
        SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT category) as unique_categories,
            COUNT(DISTINCT created_by) as unique_creators,
            MIN(created_at) as oldest_record,
            MAX(created_at) as newest_record
        FROM demo_records 
        WHERE created_at >= $1
    `;

    const overallResult = await this.db.query(overallSQL, params, `${cacheKey}:overall`, 600);

    this.log(`Generated statistics for ${timeframe} timeframe grouped by ${groupBy}`);

    return {
        timeframe,
        groupBy,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        data: result.rows,
        overall: overallResult.rows[0],
        fromCache: result.fromCache,
        generatedAt: this.util.getCurrentTimestamp()
    };
}

// Batch operations with transaction support
async function batchCreateRecords(req, data) {
    this.log(`Starting batch creation of ${data.records?.length || 0} records`);

    await initializeDemoTable.call(this);

    // Validation
    if (!Array.isArray(data.records) || data.records.length === 0) {
        throw {
            code: 'VALIDATION_ERROR',
            message: 'Records array is required and must not be empty',
            statusCode: 400
        };
    }

    if (data.records.length > 100) {
        throw {
            code: 'BATCH_SIZE_EXCEEDED',
            message: 'Batch size cannot exceed 100 records',
            statusCode: 400
        };
    }

    // Validate each record
    const validatedRecords = [];
    const errors = [];

    for (let i = 0; i < data.records.length; i++) {
        try {
            const record = data.records[i];
            this.util.validate(record, {
                name: { required: true, minLength: 2, maxLength: 255 },
                category: { required: true, pattern: /^[a-zA-Z0-9_-]+$/ }
            });

            validatedRecords.push({
                name: this.util.sanitizeString(record.name),
                description: this.util.sanitizeString(record.description),
                category: this.util.sanitizeString(record.category),
                tags: JSON.stringify(Array.isArray(record.tags) ? record.tags : []),
                metadata: JSON.stringify(typeof record.metadata === 'object' ? record.metadata : {}),
                status: 'active',
                created_by: this.context.user.id,
                updated_by: this.context.user.id
            });
        } catch (error) {
            errors.push({ index: i, error: error.message });
        }
    }

    if (errors.length > 0) {
        throw {
            code: 'BATCH_VALIDATION_ERROR',
            message: 'Some records failed validation',
            statusCode: 400,
            validationErrors: errors
        };
    }

    // Perform batch insert in transaction
    const results = await this.db.transaction(async (tx) => {
        const insertedRecords = [];

        for (const recordData of validatedRecords) {
            const sql = `
                INSERT INTO demo_records (name, description, category, tags, metadata, status, created_by, updated_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const values = [
                recordData.name,
                recordData.description,
                recordData.category,
                recordData.tags,
                recordData.metadata,
                recordData.status,
                recordData.created_by,
                recordData.updated_by
            ];

            const result = await tx.query(sql, values);
            insertedRecords.push(result.rows[0]);
        }

        return insertedRecords;
    });

    // Invalidate caches
    await this.cache.invalidate('public_data:*');
    await this.cache.invalidate(`private_data:${this.context.user.id}`);
    await this.cache.invalidate(`user_stats:${this.context.user.id}`);

    this.log(`Successfully created ${results.length} records in batch`);

    return {
        created: results.length,
        records: results.map(record => ({
            id: record.id,
            name: record.name,
            description: record.description,
            category: record.category,
            tags: JSON.parse(record.tags || '[]'),
            metadata: JSON.parse(record.metadata || '{}'),
            status: record.status,
            createdAt: record.created_at,
            createdBy: record.created_by,
            version: record.version
        })),
        batchId: this.util.generateId(),
        processedAt: this.util.getCurrentTimestamp()
    };
}

// Health check for this specific module
async function health(req, data) {
    try {
        await initializeDemoTable.call(this);

        // Test database connectivity
        const testQuery = await this.db.query('SELECT COUNT(*) as count FROM demo_records', [], null, 0);
        
        // Test cache connectivity
        const cacheTest = await this.cache.set('health_test', { timestamp: Date.now() }, 10);
        const cacheRetrieve = await this.cache.get('health_test');

        return {
            module: 'demo',
            status: 'healthy',
            database: {
                connected: true,
                recordCount: parseInt(testQuery.rows[0]?.count || 0),
                queryTime: testQuery.queryTime
            },
            cache: {
                connected: cacheTest && cacheRetrieve !== null,
                testPassed: cacheRetrieve !== null
            },
            timestamp: this.util.getCurrentTimestamp(),
            version: '2.0.0'
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
    getPrivateData,
    createRecord,
    updateRecord,
    deleteRecord,
    searchRecords,
    getRecordStats,
    batchCreateRecords,
    health
};