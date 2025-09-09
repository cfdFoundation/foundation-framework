// backend/core/modules/users.js
// Built-in User Management Module - Core Framework Feature
// Provides authentication, role-based access control, and user management

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const _moduleConfig = {
    routerName: 'users',
    version: 'v1',
    authRequired: false,
    rateLimit: '100/hour',
    isCore: true, // Mark as core module
    methods: {
        // Public endpoints
        register: { public: true, rateLimit: '10/hour' },
        login: { public: true, rateLimit: '20/hour' },
        getPublicProfile: { public: true, rateLimit: '200/hour' },
        
        // Authenticated endpoints
        getProfile: { authRequired: true, rateLimit: '500/hour' },
        updateProfile: { authRequired: true, rateLimit: '50/hour' },
        changePassword: { authRequired: true, rateLimit: '10/hour' },
        deleteAccount: { authRequired: true, rateLimit: '5/hour' },
        
        // Admin endpoints
        getAllUsers: { authRequired: true, roles: ['admin'], rateLimit: '100/hour' },
        getUserById: { authRequired: true, roles: ['admin'], rateLimit: '200/hour' },
        updateUserRoles: { authRequired: true, roles: ['admin'], rateLimit: '50/hour' },
        getUserStats: { authRequired: true, roles: ['admin'], rateLimit: '100/hour' },
        createUser: { authRequired: true, roles: ['admin'], rateLimit: '20/hour' },
        
        // Health check
        health: { public: true, rateLimit: '100/hour' }
    }
};

// User registration
async function register(req, data) {
    this.log('User registration attempt', 'info');

    // Enhanced validation
    this.util.validate(data, {
        email: { required: true, type: 'email', maxLength: 255 },
        username: { required: true, minLength: 3, maxLength: 50, pattern: /^[a-zA-Z0-9_-]+$/ },
        password: { required: true, minLength: 8, maxLength: 128 },
        first_name: { required: true, minLength: 1, maxLength: 100 },
        last_name: { required: true, minLength: 1, maxLength: 100 }
    });

    const email = this.util.sanitizeString(data.email).toLowerCase();
    const username = this.util.sanitizeString(data.username).toLowerCase();
    const firstName = this.util.sanitizeString(data.first_name);
    const lastName = this.util.sanitizeString(data.last_name);
    const phone = this.util.sanitizeString(data.phone);

    // Check for existing user
    const existingUser = await this.db.query(
        'SELECT id, email, username FROM framework_users WHERE email = $1 OR username = $2 AND deleted_at IS NULL',
        [email, username]
    );

    if (existingUser.rows.length > 0) {
        const existing = existingUser.rows[0];
        const conflict = existing.email === email ? 'email' : 'username';
        
        throw {
            code: 'USER_ALREADY_EXISTS',
            message: `User with this ${conflict} already exists`,
            statusCode: 409,
            field: conflict
        };
    }

    // Hash password
    const saltRounds = parseInt(process.env.HASH_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // Create user with default role
    const userData = {
        email,
        username,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        status: 'active',
        roles: JSON.stringify(['user']),
        permissions: JSON.stringify(['read']),
        email_verified: false,
        created_by: 'registration',
        updated_by: 'registration'
    };

    const user = await this.db.insert('framework_users', userData);

    // Clear any user-related caches
    await this.cache.invalidate('users:*');

    this.log(`User registered successfully: ${user.username} (${user.email})`, 'info');

    // Return user data without sensitive information
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        status: user.status,
        roles: JSON.parse(user.roles),
        created_at: user.created_at,
        message: 'User registered successfully'
    };
}

// User login
async function login(req, data) {
    this.log('User login attempt', 'info');

    // Validation
    this.util.validate(data, {
        login: { required: true, minLength: 3 },
        password: { required: true }
    });

    const login = this.util.sanitizeString(data.login).toLowerCase();
    const password = data.password;

    // Find user by email or username
    const userQuery = await this.db.query(
        `SELECT id, email, username, password_hash, first_name, last_name, roles, 
                permissions, status, failed_login_attempts, locked_until, login_count
         FROM framework_users 
         WHERE (email = $1 OR username = $1) AND status != 'deleted' AND deleted_at IS NULL`,
        [login]
    );

    if (userQuery.rows.length === 0) {
        this.log(`Login failed: user not found for ${login}`, 'warn');
        throw {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email/username or password',
            statusCode: 401
        };
    }

    const user = userQuery.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        this.log(`Login failed: account locked for ${user.username}`, 'warn');
        throw {
            code: 'ACCOUNT_LOCKED',
            message: 'Account is temporarily locked due to too many failed login attempts',
            statusCode: 423,
            locked_until: user.locked_until
        };
    }

    // Check if account is active
    if (user.status !== 'active') {
        this.log(`Login failed: account inactive for ${user.username}`, 'warn');
        throw {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is not active',
            statusCode: 403
        };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
        // Increment failed login attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const lockUntil = failedAttempts >= 5 
            ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
            : null;

        await this.db.update('framework_users', user.id, {
            failed_login_attempts: failedAttempts,
            locked_until: lockUntil,
            updated_by: 'system'
        });

        this.log(`Login failed: invalid password for ${user.username} (attempt ${failedAttempts})`, 'warn');
        
        throw {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email/username or password',
            statusCode: 401
        };
    }

    // Successful login - reset failed attempts and update login info
    await this.db.update('framework_users', user.id, {
        failed_login_attempts: 0,
        locked_until: null,
        last_login: new Date(),
        login_count: (user.login_count || 0) + 1,
        updated_by: 'system'
    });

    // Generate JWT token
    const tokenPayload = {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: JSON.parse(user.roles || '["user"]'),
        permissions: JSON.parse(user.permissions || '["read"]')
    };

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '24h' });

    this.log(`User logged in successfully: ${user.username}`, 'info');

    return {
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            roles: JSON.parse(user.roles),
            permissions: JSON.parse(user.permissions)
        },
        token,
        expires_in: '24h',
        token_type: 'Bearer'
    };
}

// Get public profile (no auth required)
async function getPublicProfile(req, data) {
    this.log('Fetching public user profile', 'info');

    const identifier = this.util.sanitizeString(data.user);
    
    if (!identifier) {
        throw {
            code: 'MISSING_PARAMETER',
            message: 'User identifier (username or ID) is required',
            statusCode: 400
        };
    }

    // Check if identifier is UUID (ID) or username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const sql = isUUID 
        ? 'SELECT id, username, first_name, last_name, avatar_url, bio, created_at FROM framework_users WHERE id = $1 AND status = $2 AND deleted_at IS NULL'
        : 'SELECT id, username, first_name, last_name, avatar_url, bio, created_at FROM framework_users WHERE username = $1 AND status = $2 AND deleted_at IS NULL';

    const cacheKey = `public_profile:${identifier}`;
    const result = await this.db.query(sql, [identifier, 'active'], cacheKey, 300);

    if (result.rows.length === 0) {
        throw {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            statusCode: 404
        };
    }

    const user = result.rows[0];

    this.log(`Public profile retrieved for user: ${user.username}`, 'info');

    return {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        member_since: user.created_at,
        fromCache: result.fromCache
    };
}

// Get current user profile (authenticated)
async function getProfile(req, data) {
    this.log('Fetching user profile', 'info');

    const userId = this.context.user.id;
    const cacheKey = `user_profile:${userId}`;

    const sql = `
        SELECT id, email, username, first_name, last_name, phone, avatar_url, bio,
               roles, permissions, status, email_verified, last_login, login_count,
               preferences, created_at, updated_at
        FROM framework_users 
        WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await this.db.query(sql, [userId], cacheKey, 300);

    if (result.rows.length === 0) {
        throw {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
            statusCode: 404
        };
    }

    const user = result.rows[0];

    this.log(`Profile retrieved for user: ${user.username}`, 'info');

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        bio: user.bio,
        roles: JSON.parse(user.roles || '[]'),
        permissions: JSON.parse(user.permissions || '[]'),
        status: user.status,
        email_verified: user.email_verified,
        last_login: user.last_login,
        login_count: user.login_count,
        preferences: JSON.parse(user.preferences || '{}'),
        created_at: user.created_at,
        updated_at: user.updated_at,
        fromCache: result.fromCache
    };
}

// Update user profile
async function updateProfile(req, data) {
    this.log('Updating user profile', 'info');

    const userId = this.context.user.id;

    // Validation for updatable fields
    const allowedFields = ['first_name', 'last_name', 'phone', 'avatar_url', 'bio'];
    const updateData = {};

    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            if (field === 'first_name' || field === 'last_name') {
                this.util.validate({ [field]: data[field] }, {
                    [field]: { required: true, minLength: 1, maxLength: 100 }
                });
                updateData[field] = this.util.sanitizeString(data[field]);
            } else if (field === 'phone') {
                if (data[field] && !this.util.validatePhone(data[field])) {
                    throw {
                        code: 'INVALID_PHONE',
                        message: 'Invalid phone number format',
                        statusCode: 400
                    };
                }
                updateData[field] = this.util.sanitizeString(data[field]) || null;
            } else if (field === 'avatar_url') {
                if (data[field] && !this.util.validateUrl(data[field])) {
                    throw {
                        code: 'INVALID_URL',
                        message: 'Invalid avatar URL format',
                        statusCode: 400
                    };
                }
                updateData[field] = this.util.sanitizeString(data[field]) || null;
            } else if (field === 'bio') {
                if (data[field] && data[field].length > 500) {
                    throw {
                        code: 'BIO_TOO_LONG',
                        message: 'Bio cannot exceed 500 characters',
                        statusCode: 400
                    };
                }
                updateData[field] = this.util.sanitizeString(data[field]) || null;
            }
        }
    }

    if (Object.keys(updateData).length === 0) {
        throw {
            code: 'NO_UPDATES',
            message: 'No valid fields provided for update',
            statusCode: 400
        };
    }

    updateData.updated_by = userId;

    const user = await this.db.update('framework_users', userId, updateData);

    if (!user) {
        throw {
            code: 'UPDATE_FAILED',
            message: 'Failed to update user profile',
            statusCode: 500
        };
    }

    // Invalidate caches
    await this.cache.invalidate(`user_profile:${userId}`);
    await this.cache.invalidate(`public_profile:${user.username}`);
    await this.cache.invalidate(`public_profile:${userId}`);

    this.log(`Profile updated for user: ${user.username}`, 'info');

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        bio: user.bio,
        updated_at: user.updated_at,
        message: 'Profile updated successfully'
    };
}

// Change password
async function changePassword(req, data) {
    this.log('Changing user password', 'info');

    const userId = this.context.user.id;

    this.util.validate(data, {
        current_password: { required: true },
        new_password: { required: true, minLength: 8, maxLength: 128 },
        confirm_password: { required: true }
    });

    if (data.new_password !== data.confirm_password) {
        throw {
            code: 'PASSWORD_MISMATCH',
            message: 'New password and confirmation do not match',
            statusCode: 400
        };
    }

    const userResult = await this.db.query(
        'SELECT password_hash, username FROM framework_users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
    );

    if (userResult.rows.length === 0) {
        throw {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            statusCode: 404
        };
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(data.current_password, user.password_hash);

    if (!isValidPassword) {
        this.log(`Password change failed: invalid current password for ${user.username}`, 'warn');
        throw {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect',
            statusCode: 401
        };
    }

    // Hash new password
    const saltRounds = parseInt(process.env.HASH_ROUNDS || '12');
    const newPasswordHash = await bcrypt.hash(data.new_password, saltRounds);

    await this.db.update('framework_users', userId, {
        password_hash: newPasswordHash,
        updated_by: userId
    });

    await this.cache.invalidate(`user_profile:${userId}`);

    this.log(`Password changed successfully for user: ${user.username}`, 'info');

    return {
        message: 'Password changed successfully',
        timestamp: this.util.getCurrentTimestamp()
    };
}

// Delete user account (soft delete)
async function deleteAccount(req, data) {
    this.log('Deleting user account', 'info');

    const userId = this.context.user.id;

    this.util.validate(data, {
        confirmation: { required: true }
    });

    if (data.confirmation !== 'DELETE_MY_ACCOUNT') {
        throw {
            code: 'INVALID_CONFIRMATION',
            message: 'Please provide the exact confirmation text: DELETE_MY_ACCOUNT',
            statusCode: 400
        };
    }

    const user = await this.db.update('framework_users', userId, {
        status: 'deleted',
        deleted_at: new Date(),
        email: `deleted_${Date.now()}_${this.util.generateShortId()}@deleted.local`,
        username: `deleted_${Date.now()}_${this.util.generateShortId()}`,
        updated_by: userId,
        deleted_by: userId
    });

    if (!user) {
        throw {
            code: 'DELETE_FAILED',
            message: 'Failed to delete account',
            statusCode: 500
        };
    }

    await this.cache.invalidate(`user_profile:${userId}`);
    await this.cache.invalidate('users:*');

    this.log(`Account deleted for user: ${userId}`, 'info');

    return {
        message: 'Account deleted successfully',
        deleted_at: user.updated_at
    };
}

// Get all users (admin function)
async function getAllUsers(req, data) {
    this.log('Fetching all users (admin)', 'info');

    const limit = Math.min(this.util.parseInteger(data.limit, 20), 100);
    const offset = this.util.parseInteger(data.offset, 0);
    const status = this.util.sanitizeString(data.status || 'active');
    const search = this.util.sanitizeString(data.search);

    let sql = `
        SELECT id, email, username, first_name, last_name, status, roles,
               last_login, login_count, created_at, updated_at
        FROM framework_users 
        WHERE status = $1 AND deleted_at IS NULL
    `;
    let params = [status];
    let paramIndex = 2;

    if (search) {
        sql += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR 
                     first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const cacheKey = `all_users:${status}:${search || 'all'}:${limit}:${offset}`;
    const result = await this.db.query(sql, params, cacheKey, 300);

    const countSQL = 'SELECT COUNT(*) as total FROM framework_users WHERE status = $1 AND deleted_at IS NULL' + 
                     (search ? ` AND (username ILIKE $2 OR email ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2)` : '');
    const countParams = search ? [status, `%${search}%`] : [status];

    const countResult = await this.db.query(countSQL, countParams, `${cacheKey}:count`, 300);
    const total = parseInt(countResult.rows[0]?.total || 0);

    this.log(`Retrieved ${result.rows.length} users`, 'info');

    return {
        users: result.rows.map(user => ({
            ...user,
            roles: JSON.parse(user.roles || '[]')
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

// Update user roles (admin function)
async function updateUserRoles(req, data) {
    this.log('Updating user roles (admin)', 'info');

    this.util.validate(data, {
        user_id: { required: true },
        roles: { required: true },
        permissions: { required: true }
    });

    const userId = this.util.sanitizeString(data.user_id);
    const roles = Array.isArray(data.roles) ? data.roles : [];
    const permissions = Array.isArray(data.permissions) ? data.permissions : [];

    const user = await this.db.update('framework_users', userId, {
        roles: JSON.stringify(roles),
        permissions: JSON.stringify(permissions),
        updated_by: this.context.user.id
    });

    if (!user) {
        throw {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            statusCode: 404
        };
    }

    await this.cache.invalidate(`user_profile:${userId}`);
    await this.cache.invalidate('users:*');

    this.log(`Updated roles for user: ${user.username}`, 'info');

    return {
        id: user.id,
        username: user.username,
        roles: JSON.parse(user.roles),
        permissions: JSON.parse(user.permissions),
        updated_at: user.updated_at,
        message: 'User roles updated successfully'
    };
}

// Get user statistics (admin function)
async function getUserStats(req, data) {
    this.log('Generating user statistics (admin)', 'info');

    const cacheKey = 'user_stats';

    const sql = `
        SELECT 
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE status = 'active') as active_users,
            COUNT(*) FILTER (WHERE status = 'inactive') as inactive_users,
            COUNT(*) FILTER (WHERE status = 'deleted') as deleted_users,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as new_today,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week,
            COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '24 hours') as active_today,
            COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '7 days') as active_this_week,
            AVG(login_count) as avg_login_count,
            MAX(created_at) as newest_user_date,
            MAX(last_login) as last_activity
        FROM framework_users
        WHERE deleted_at IS NULL
    `;

    const result = await this.db.query(sql, [], cacheKey, 600);
    const stats = result.rows[0];

    const roleSQL = `
        SELECT 
            jsonb_array_elements_text(roles) as role,
            COUNT(*) as count
        FROM framework_users 
        WHERE status = 'active' AND deleted_at IS NULL
        GROUP BY role
        ORDER BY count DESC
    `;

    const roleResult = await this.db.query(roleSQL, [], `${cacheKey}:roles`, 600);

    this.log('User statistics generated', 'info');

    return {
        overview: {
            total_users: parseInt(stats.total_users),
            active_users: parseInt(stats.active_users),
            inactive_users: parseInt(stats.inactive_users),
            deleted_users: parseInt(stats.deleted_users)
        },
        activity: {
            new_today: parseInt(stats.new_today),
            new_this_week: parseInt(stats.new_this_week),
            active_today: parseInt(stats.active_today),
            active_this_week: parseInt(stats.active_this_week),
            avg_login_count: parseFloat(stats.avg_login_count).toFixed(2)
        },
        timestamps: {
            newest_user_date: stats.newest_user_date,
            last_activity: stats.last_activity
        },
        roles: roleResult.rows,
        fromCache: result.fromCache,
        generated_at: this.util.getCurrentTimestamp()
    };
}

// Create user (admin function)
async function createUser(req, data) {
    this.log('Creating user (admin)', 'info');

    this.util.validate(data, {
        email: { required: true, type: 'email', maxLength: 255 },
        username: { required: true, minLength: 3, maxLength: 50, pattern: /^[a-zA-Z0-9_-]+$/ },
        password: { required: true, minLength: 8, maxLength: 128 },
        first_name: { required: true, minLength: 1, maxLength: 100 },
        last_name: { required: true, minLength: 1, maxLength: 100 }
    });

    const email = this.util.sanitizeString(data.email).toLowerCase();
    const username = this.util.sanitizeString(data.username).toLowerCase();

    // Check for existing user
    const existingUser = await this.db.query(
        'SELECT id FROM framework_users WHERE email = $1 OR username = $2 AND deleted_at IS NULL',
        [email, username]
    );

    if (existingUser.rows.length > 0) {
        throw {
            code: 'USER_ALREADY_EXISTS',
            message: 'User with this email or username already exists',
            statusCode: 409
        };
    }

    // Hash password
    const saltRounds = parseInt(process.env.HASH_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const userData = {
        email,
        username,
        password_hash: passwordHash,
        first_name: this.util.sanitizeString(data.first_name),
        last_name: this.util.sanitizeString(data.last_name),
        phone: this.util.sanitizeString(data.phone) || null,
        status: data.status || 'active',
        roles: JSON.stringify(data.roles || ['user']),
        permissions: JSON.stringify(data.permissions || ['read']),
        email_verified: data.email_verified || false,
        created_by: this.context.user.id,
        updated_by: this.context.user.id
    };

    const user = await this.db.insert('framework_users', userData);

    await this.cache.invalidate('users:*');

    this.log(`User created by admin: ${user.username} (${user.email})`, 'info');

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        roles: JSON.parse(user.roles),
        permissions: JSON.parse(user.permissions),
        status: user.status,
        created_at: user.created_at,
        message: 'User created successfully'
    };
}

// Health check
async function health(req, data) {
    try {
        const userCount = await this.db.query('SELECT COUNT(*) as count FROM framework_users WHERE status = $1 AND deleted_at IS NULL', ['active']);

        return {
            module: 'users',
            status: 'healthy',
            database: {
                connected: true,
                user_count: parseInt(userCount.rows[0]?.count || 0)
            },
            timestamp: this.util.getCurrentTimestamp()
        };
    } catch (error) {
        return {
            module: 'users',
            status: 'unhealthy',
            error: error.message,
            timestamp: this.util.getCurrentTimestamp()
        };
    }
}

module.exports = {
    _moduleConfig,
    register,
    login,
    getPublicProfile,
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    getAllUsers,
    updateUserRoles,
    getUserStats,
    createUser,
    health
};