-- Chat 3 Database Initialization
-- Enhanced database setup for production Docker environment

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create database user if not exists (for manual setup)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'api_user') THEN
        CREATE USER api_user WITH PASSWORD 'secure_password_123';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE api_framework TO api_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO api_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO api_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO api_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO api_user;

-- Future permissions for new objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO api_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO api_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO api_user;

-- Enhanced logging table with better indexes and partitioning preparation
CREATE TABLE IF NOT EXISTS api_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    request_id VARCHAR(36),
    instance_id VARCHAR(8),
    module VARCHAR(100),
    method VARCHAR(100),
    user_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    response_time INTEGER,
    error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhanced indexes for logging
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp_level ON api_logs(timestamp DESC, level);
CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON api_logs(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_logs_module_method ON api_logs(module, method) WHERE module IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_logs_instance ON api_logs(instance_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_errors ON api_logs(timestamp DESC) WHERE level IN ('error', 'warn');
CREATE INDEX IF NOT EXISTS idx_api_logs_performance ON api_logs(response_time DESC) WHERE response_time IS NOT NULL;

-- Enhanced users table with better security and features
CREATE TABLE IF NOT EXISTS api_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    bio TEXT,
    
    -- Roles and permissions
    roles JSONB DEFAULT '["user"]',
    permissions JSONB DEFAULT '["read"]',
    
    -- Account status and security
    status VARCHAR(50) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_sent_at TIMESTAMPTZ,
    
    -- Login tracking and security
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    
    -- Two-factor authentication
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    two_factor_backup_codes JSONB,
    
    -- API access
    api_rate_limit INTEGER DEFAULT 1000,
    api_quota_used INTEGER DEFAULT 0,
    api_quota_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
    
    -- Preferences and metadata
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system',
    updated_by VARCHAR(100) DEFAULT 'system',
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(100)
);

-- Enhanced indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email_active ON api_users(email) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_username_active ON api_users(username) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON api_users(status);
CREATE INDEX IF NOT EXISTS idx_users_roles ON api_users USING gin(roles);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON api_users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON api_users(last_login DESC) WHERE last_login IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_locked ON api_users(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON api_users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON api_users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Product categories table with hierarchy support
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- Hierarchy support
    parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0,
    path TEXT, -- Materialized path for efficient queries
    
    -- Display and SEO
    image_url VARCHAR(500),
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Additional data
    attributes JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON product_categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_path ON product_categories(path);
CREATE INDEX IF NOT EXISTS idx_categories_active ON product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON product_categories(sort_order, name);
CREATE INDEX IF NOT EXISTS idx_categories_featured ON product_categories(is_featured) WHERE is_featured = true;

-- Enhanced products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    
    -- Categorization
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    brand VARCHAR(100),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    compare_at_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    tax_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Inventory management
    track_inventory BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0, -- For pending orders
    low_stock_threshold INTEGER DEFAULT 10,
    allow_backorder BOOLEAN DEFAULT false,
    max_order_quantity INTEGER,
    min_order_quantity INTEGER DEFAULT 1,
    
    -- Physical attributes
    weight DECIMAL(8,2),
    weight_unit VARCHAR(10) DEFAULT 'kg',
    dimensions JSONB, -- {length, width, height, unit}
    volume DECIMAL(10,4),
    volume_unit VARCHAR(10) DEFAULT 'cm3',
    
    -- SEO and marketing
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    search_keywords TEXT,
    tags JSONB DEFAULT '[]',
    
    -- Media
    images JSONB DEFAULT '[]',
    videos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    
    -- Status and visibility
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, inactive, discontinued, deleted
    visibility VARCHAR(50) DEFAULT 'public', -- public, private, hidden
    is_featured BOOLEAN DEFAULT false,
    is_digital BOOLEAN DEFAULT false,
    is_downloadable BOOLEAN DEFAULT false,
    requires_shipping BOOLEAN DEFAULT true,
    is_gift_card BOOLEAN DEFAULT false,
    
    -- Pricing and promotions
    on_sale BOOLEAN DEFAULT false,
    sale_price DECIMAL(10,2),
    sale_start_date TIMESTAMPTZ,
    sale_end_date TIMESTAMPTZ,
    
    -- Analytics and performance
    view_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    cart_add_count INTEGER DEFAULT 0,
    wishlist_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    
    -- SEO performance
    seo_score INTEGER DEFAULT 0,
    search_rank INTEGER DEFAULT 0,
    
    -- Additional structured data
    attributes JSONB DEFAULT '{}', -- Custom product attributes
    variants JSONB DEFAULT '[]',   -- Product variants (size, color, etc.)
    specifications JSONB DEFAULT '{}', -- Technical specifications
    certifications JSONB DEFAULT '[]', -- Certifications and compliance
    warranty JSONB DEFAULT '{}',   -- Warranty information
    shipping_info JSONB DEFAULT '{}', -- Shipping specific data
    metadata JSONB DEFAULT '{}',
    
    -- Audit and versioning
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(100)
);

-- Comprehensive indexes for products
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_status_visibility ON products(status, visibility);
CREATE INDEX IF NOT EXISTS idx_products_price_range ON products(price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, created_at DESC) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_sale ON products(on_sale, sale_price) WHERE on_sale = true;
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity) WHERE track_inventory = true;
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(id) WHERE track_inventory = true AND stock_quantity <= low_stock_threshold;
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_updated ON products(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating_average DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS idx_products_popularity ON products(purchase_count DESC, view_count DESC);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING gin(attributes);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at) WHERE deleted_at IS NOT NULL;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(
    to_tsvector('english', 
        name || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(brand, '') || ' ' || 
        COALESCE(manufacturer, '') || ' ' ||
        COALESCE(search_keywords, '')
    )
) WHERE status = 'active';

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_category_status_price ON products(category_id, status, price);
CREATE INDEX IF NOT EXISTS idx_products_brand_status_created ON products(brand, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status_featured_rating ON products(status, is_featured, rating_average DESC);

-- API Keys table for enhanced authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL, -- For identification without full key
    
    -- Permissions and limits
    permissions JSONB DEFAULT '["read"]',
    rate_limit INTEGER DEFAULT 1000,
    quota_limit INTEGER DEFAULT 10000,
    quota_used INTEGER DEFAULT 0,
    quota_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 month',
    
    -- Access control
    allowed_ips JSONB DEFAULT '[]',
    allowed_domains JSONB DEFAULT '[]',
    cors_origins JSONB DEFAULT '[]',
    
    -- Usage tracking
    last_used TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    
    -- Expiration
    expires_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(100)
);

-- Indexes for API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Session storage table (alternative to Redis for some use cases)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    
    -- Session data
    data JSONB DEFAULT '{}',
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    csrf_token VARCHAR(255),
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    
    -- Status
    is_active BOOLEAN DEFAULT true
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active, last_accessed DESC) WHERE is_active = true;

-- Create function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at updates
DROP TRIGGER IF EXISTS update_api_users_updated_at ON api_users;
CREATE TRIGGER update_api_users_updated_at 
    BEFORE UPDATE ON api_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_categories_updated_at ON product_categories;
CREATE TRIGGER update_product_categories_updated_at 
    BEFORE UPDATE ON product_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_logs 
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND level NOT IN ('error', 'warn'); -- Keep errors and warnings longer
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up very old errors/warnings (keep for 90 days)
    DELETE FROM api_logs 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND level IN ('error', 'warn');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR (last_accessed < NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update category paths (for hierarchy)
CREATE OR REPLACE FUNCTION update_category_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path = NEW.slug;
        NEW.level = 0;
    ELSE
        SELECT path || '/' || NEW.slug, level + 1
        INTO NEW.path, NEW.level
        FROM product_categories 
        WHERE id = NEW.parent_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for category path updates
DROP TRIGGER IF EXISTS update_category_path_trigger ON product_categories;
CREATE TRIGGER update_category_path_trigger
    BEFORE INSERT OR UPDATE ON product_categories
    FOR EACH ROW EXECUTE FUNCTION update_category_path();

-- Create views for common queries
CREATE OR REPLACE VIEW active_products AS
SELECT 
    p.*,
    c.name as category_name,
    c.slug as category_slug,
    c.path as category_path
FROM products p
LEFT JOIN product_categories c ON p.category_id = c.id
WHERE p.status = 'active' 
    AND p.visibility = 'public' 
    AND (p.deleted_at IS NULL);

CREATE OR REPLACE VIEW featured_products AS
SELECT * FROM active_products 
WHERE is_featured = true 
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW low_stock_products AS
SELECT * FROM active_products 
WHERE track_inventory = true 
    AND stock_quantity <= low_stock_threshold
    AND stock_quantity > 0
ORDER BY stock_quantity ASC;

CREATE OR REPLACE VIEW out_of_stock_products AS
SELECT * FROM active_products 
WHERE track_inventory = true 
    AND stock_quantity <= 0
ORDER BY updated_at DESC;

-- Grant permissions on views
GRANT SELECT ON active_products TO api_user;
GRANT SELECT ON featured_products TO api_user;
GRANT SELECT ON low_stock_products TO api_user;
GRANT SELECT ON out_of_stock_products TO api_user;

-- Performance and monitoring settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- Commit all changes
COMMIT;