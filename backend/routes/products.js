// Products API - Complete E-commerce Product Management System
// Comprehensive product catalog with advanced features, inventory management, and analytics

const _moduleConfig = {
    routerName: 'products',
    version: 'v1',
    authRequired: false, // Most endpoints are public for browsing
    rateLimit: '500/hour',
    methods: {
        // Public browsing endpoints
        getProducts: { public: true, rateLimit: '1000/hour' },
        getProduct: { public: true, rateLimit: '2000/hour' },
        searchProducts: { public: true, rateLimit: '500/hour' },
        getCategories: { public: true, rateLimit: '300/hour' },
        getFeatured: { public: true, rateLimit: '300/hour' },
        getDeals: { public: true, rateLimit: '300/hour' },
        
        // Product management (authenticated)
        createProduct: { authRequired: true, rateLimit: '50/hour' },
        updateProduct: { authRequired: true, rateLimit: '100/hour' },
        deleteProduct: { authRequired: true, rateLimit: '20/hour' },
        
        // Health check
        health: { public: true, rateLimit: '100/hour' }
    }
};

// Initialize product system tables
async function initializeProductSystem() {
    try {
        // Enhanced categories table with hierarchy and SEO
        const createCategoriesSQL = `
            CREATE TABLE IF NOT EXISTS product_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                slug VARCHAR(200) NOT NULL UNIQUE,
                description TEXT,
                parent_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
                
                -- Hierarchy
                level INTEGER DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                
                -- SEO
                meta_title VARCHAR(300),
                meta_description VARCHAR(500),
                meta_keywords VARCHAR(1000),
                
                -- Display
                image VARCHAR(500),
                banner_image VARCHAR(500),
                icon VARCHAR(200),
                color VARCHAR(7), -- Hex color
                
                -- Status
                is_active BOOLEAN DEFAULT true,
                is_featured BOOLEAN DEFAULT false,
                
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                created_by UUID,
                updated_by UUID
            );
        `;

        // Enhanced products table with comprehensive e-commerce features
        const createProductsSQL = `
            CREATE TABLE IF NOT EXISTS products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sku VARCHAR(100) NOT NULL UNIQUE,
                name VARCHAR(300) NOT NULL,
                slug VARCHAR(300) NOT NULL UNIQUE,
                description TEXT,
                short_description VARCHAR(1000),
                
                -- Classification
                category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
                brand VARCHAR(150),
                manufacturer VARCHAR(150),
                model VARCHAR(150),
                barcode VARCHAR(50),
                
                -- Pricing structure
                base_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                sale_price DECIMAL(12,2),
                cost_price DECIMAL(12,2),
                currency VARCHAR(3) DEFAULT 'USD',
                
                -- Inventory management
                track_quantity BOOLEAN DEFAULT true,
                quantity INTEGER DEFAULT 0,
                available_quantity INTEGER DEFAULT 0,
                low_stock_threshold INTEGER DEFAULT 10,
                
                -- Physical properties
                weight DECIMAL(10,3),
                weight_unit VARCHAR(10) DEFAULT 'kg',
                length DECIMAL(10,2),
                width DECIMAL(10,2),
                height DECIMAL(10,2),
                dimension_unit VARCHAR(10) DEFAULT 'cm',
                
                -- Product status and behavior
                status VARCHAR(20) DEFAULT 'active',
                visibility VARCHAR(20) DEFAULT 'public',
                featured BOOLEAN DEFAULT false,
                on_sale BOOLEAN DEFAULT false,
                
                -- Media
                featured_image VARCHAR(500),
                gallery_images JSONB DEFAULT '[]',
                
                -- SEO
                meta_title VARCHAR(300),
                meta_description VARCHAR(500),
                meta_keywords VARCHAR(1000),
                
                -- Analytics
                view_count INTEGER DEFAULT 0,
                purchase_count INTEGER DEFAULT 0,
                rating_average DECIMAL(3,2) DEFAULT 0.00,
                reviews_count INTEGER DEFAULT 0,
                
                -- Additional data
                badges JSONB DEFAULT '[]',
                custom_fields JSONB DEFAULT '{}',
                
                -- Timestamps
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                deleted_at TIMESTAMPTZ,
                created_by UUID,
                updated_by UUID
            );
        `;

        await this.db.query(createCategoriesSQL);
        await this.db.query(createProductsSQL);

        // Create sample categories if they don't exist
        const categoryCount = await this.db.query('SELECT COUNT(*) as count FROM product_categories');
        if (parseInt(categoryCount.rows[0].count) === 0) {
            await this.createSampleCategories();
        }

        // Create sample products if they don't exist
        const productCount = await this.db.query('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL');
        if (parseInt(productCount.rows[0].count) === 0) {
            await this.createSampleProducts();
        }

    } catch (error) {
        this.log(`Failed to initialize product system: ${error.message}`, 'error');
        throw error;
    }
}

// Create sample categories
async function createSampleCategories() {
    const categories = [
        { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets' },
        { name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel' },
        { name: 'Home & Garden', slug: 'home-garden', description: 'Home improvement and garden supplies' },
        { name: 'Sports', slug: 'sports', description: 'Sports equipment and accessories' },
        { name: 'Books', slug: 'books', description: 'Books and educational materials' }
    ];

    for (const category of categories) {
        await this.db.insert('product_categories', {
            ...category,
            is_active: true,
            created_by: 'system',
            updated_by: 'system'
        });
    }

    this.log('Sample categories created');
}

// Create sample products
async function createSampleProducts() {
    // Get category IDs
    const categoriesResult = await this.db.query('SELECT id, slug FROM product_categories LIMIT 5');
    const categories = categoriesResult.rows;

    const products = [
        {
            sku: 'LAPTOP-001',
            name: 'Professional Laptop 15" Intel i7',
            slug: 'professional-laptop-15-intel-i7',
            short_description: 'High-performance laptop for professionals',
            description: 'Powerful laptop with Intel i7 processor, 16GB RAM, and 512GB SSD',
            category_id: categories.find(c => c.slug === 'electronics')?.id,
            brand: 'TechBrand',
            base_price: 1299.99,
            sale_price: 1199.99,
            on_sale: true,
            quantity: 25,
            available_quantity: 25,
            weight: 2.1,
            featured: true,
            status: 'active',
            visibility: 'public'
        },
        {
            sku: 'SHIRT-001',
            name: 'Classic Cotton T-Shirt',
            slug: 'classic-cotton-t-shirt',
            short_description: 'Comfortable cotton t-shirt',
            description: '100% cotton t-shirt in various colors',
            category_id: categories.find(c => c.slug === 'clothing')?.id,
            brand: 'FashionCo',
            base_price: 24.99,
            quantity: 100,
            available_quantity: 100,
            weight: 0.2,
            status: 'active',
            visibility: 'public'
        }
    ];

    for (const product of products) {
        await this.db.insert('products', {
            ...product,
            created_by: 'system',
            updated_by: 'system'
        });
    }

    this.log('Sample products created');
}

// Get all products with pagination and filtering
async function getProducts(req, data) {
    this.log('Fetching products list');
    
    await initializeProductSystem.call(this);

    const limit = Math.min(this.util.parseInteger(data.limit, 20), 100);
    const offset = this.util.parseInteger(data.offset, 0);
    const category = this.util.sanitizeString(data.category);
    const featured = data.featured === 'true';
    const onSale = data.on_sale === 'true';

    let sql = `
        SELECT 
            p.id, p.sku, p.name, p.slug, p.short_description, p.brand,
            p.base_price, p.sale_price, p.on_sale, p.featured_image,
            p.rating_average, p.reviews_count, p.available_quantity,
            c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.status = 'active' 
            AND p.visibility = 'public'
            AND p.deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (category) {
        sql += ` AND c.slug = $${paramIndex}`;
        params.push(category);
        paramIndex++;
    }

    if (featured) {
        sql += ` AND p.featured = true`;
    }

    if (onSale) {
        sql += ` AND p.on_sale = true`;
    }

    sql += ` ORDER BY p.featured DESC, p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(sql, params, `products:${category || 'all'}:${limit}:${offset}`, 300);

    this.log(`Retrieved ${result.rows.length} products`);

    return {
        products: result.rows.map(product => ({
            ...product,
            effective_price: product.on_sale && product.sale_price ? product.sale_price : product.base_price
        })),
        pagination: {
            limit,
            offset,
            has_more: result.rows.length === limit
        },
        fromCache: result.fromCache
    };
}

// Get single product by ID or slug
async function getProduct(req, data) {
    this.log('Fetching single product');
    
    await initializeProductSystem.call(this);

    const identifier = this.util.sanitizeString(data.product || data.id || data.slug);
    
    if (!identifier) {
        throw {
            code: 'MISSING_PARAMETER',
            message: 'Product identifier (ID or slug) is required',
            statusCode: 400
        };
    }

    // Check if identifier is UUID (ID) or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const sql = isUUID 
        ? 'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = $1 AND p.deleted_at IS NULL'
        : 'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.slug = $1 AND p.deleted_at IS NULL';

    const result = await this.db.query(sql, [identifier], `product:${identifier}`, 600);

    if (result.rows.length === 0) {
        throw {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found',
            statusCode: 404
        };
    }

    const product = result.rows[0];

    // Update view count
    await this.db.query('UPDATE products SET view_count = view_count + 1 WHERE id = $1', [product.id]);

    this.log(`Retrieved product: ${product.name}`);

    return {
        product: {
            ...product,
            effective_price: product.on_sale && product.sale_price ? product.sale_price : product.base_price,
            badges: JSON.parse(product.badges || '[]'),
            gallery_images: JSON.parse(product.gallery_images || '[]'),
            custom_fields: JSON.parse(product.custom_fields || '{}')
        },
        fromCache: result.fromCache
    };
}

// Search products with full-text search
async function searchProducts(req, data) {
    this.log('Performing product search');
    
    await initializeProductSystem.call(this);

    const query = this.util.sanitizeString(data.query || data.q || '');
    const limit = Math.min(this.util.parseInteger(data.limit, 20), 50);

    if (!query || query.length < 2) {
        throw {
            code: 'INVALID_SEARCH_QUERY',
            message: 'Search query must be at least 2 characters long',
            statusCode: 400
        };
    }

    const sql = `
        SELECT 
            p.id, p.sku, p.name, p.slug, p.short_description, p.brand,
            p.base_price, p.sale_price, p.on_sale, p.featured_image,
            p.rating_average, p.reviews_count, p.available_quantity,
            c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.status = 'active' 
            AND p.visibility = 'public'
            AND p.deleted_at IS NULL
            AND (
                p.name ILIKE $1 
                OR p.description ILIKE $1 
                OR p.brand ILIKE $1 
                OR p.sku ILIKE $1
            )
        ORDER BY 
            CASE WHEN p.name ILIKE $1 THEN 1 ELSE 2 END,
            p.featured DESC,
            p.rating_average DESC
        LIMIT $2
    `;

    const searchPattern = `%${query}%`;
    const result = await this.db.query(sql, [searchPattern, limit], `search:${query}:${limit}`, 300);

    this.log(`Search for "${query}" returned ${result.rows.length} products`);

    return {
        query,
        products: result.rows.map(product => ({
            ...product,
            effective_price: product.on_sale && product.sale_price ? product.sale_price : product.base_price
        })),
        total: result.rows.length,
        fromCache: result.fromCache
    };
}

// Get product categories
async function getCategories(req, data) {
    this.log('Fetching product categories');
    
    await initializeProductSystem.call(this);

    const includeProductCount = data.include_count === 'true';
    const activeOnly = data.active_only !== 'false';

    let sql = `
        SELECT 
            c.id, c.name, c.slug, c.description, c.parent_id,
            c.level, c.sort_order, c.image, c.is_active, c.is_featured
    `;

    if (includeProductCount) {
        sql += `, COUNT(p.id) as product_count`;
    }

    sql += `
        FROM product_categories c
    `;

    if (includeProductCount) {
        sql += `
            LEFT JOIN products p ON c.id = p.category_id 
                AND p.status = 'active' 
                AND p.visibility = 'public' 
                AND p.deleted_at IS NULL
        `;
    }

    if (activeOnly) {
        sql += ` WHERE c.is_active = true`;
    }

    if (includeProductCount) {
        sql += ` GROUP BY c.id`;
    }

    sql += ` ORDER BY c.sort_order, c.name`;

    const cacheKey = `categories:${includeProductCount ? 'with_count' : 'basic'}:${activeOnly}`;
    const result = await this.db.query(sql, [], cacheKey, 600);

    this.log(`Retrieved ${result.rows.length} categories`);

    return {
        categories: result.rows.map(category => ({
            ...category,
            product_count: includeProductCount ? parseInt(category.product_count || 0) : undefined
        })),
        fromCache: result.fromCache
    };
}

// Get featured products
async function getFeatured(req, data) {
    this.log('Fetching featured products');
    
    await initializeProductSystem.call(this);

    const limit = Math.min(this.util.parseInteger(data.limit, 12), 50);

    const sql = `
        SELECT 
            p.id, p.sku, p.name, p.slug, p.short_description, p.brand,
            p.base_price, p.sale_price, p.on_sale, p.featured_image,
            p.rating_average, p.reviews_count,
            c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.featured = true 
            AND p.status = 'active' 
            AND p.visibility = 'public'
            AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC 
        LIMIT $1
    `;

    const result = await this.db.query(sql, [limit], `featured:${limit}`, 600);

    this.log(`Retrieved ${result.rows.length} featured products`);

    return {
        products: result.rows.map(product => ({
            ...product,
            effective_price: product.on_sale && product.sale_price ? product.sale_price : product.base_price
        })),
        fromCache: result.fromCache
    };
}

// Get products on sale
async function getDeals(req, data) {
    this.log('Fetching products on sale');
    
    await initializeProductSystem.call(this);

    const limit = Math.min(this.util.parseInteger(data.limit, 20), 50);

    const sql = `
        SELECT 
            p.id, p.sku, p.name, p.slug, p.short_description, p.brand,
            p.base_price, p.sale_price, p.on_sale, p.featured_image,
            p.rating_average, p.reviews_count,
            c.name as category_name, c.slug as category_slug,
            ROUND(((p.base_price - p.sale_price) / p.base_price * 100)::numeric, 0) as discount_percentage
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.on_sale = true 
            AND p.sale_price IS NOT NULL
            AND p.sale_price < p.base_price
            AND p.status = 'active' 
            AND p.visibility = 'public'
            AND p.deleted_at IS NULL
        ORDER BY discount_percentage DESC, p.created_at DESC
        LIMIT $1
    `;

    const result = await this.db.query(sql, [limit], `deals:${limit}`, 300);

    this.log(`Retrieved ${result.rows.length} products on sale`);

    return {
        products: result.rows.map(product => ({
            ...product,
            effective_price: product.sale_price,
            savings: product.base_price - product.sale_price
        })),
        fromCache: result.fromCache
    };
}

// Create new product (authenticated)
async function createProduct(req, data) {
    this.log('Creating new product');
    
    await initializeProductSystem.call(this);

    // Validate required fields
    this.util.validate(data, {
        name: { required: true, minLength: 2 },
        sku: { required: true, minLength: 2 },
        base_price: { required: true, type: 'number', min: 0 },
        category_id: { required: true }
    });

    const productData = {
        sku: this.util.sanitizeString(data.sku).toUpperCase(),
        name: this.util.sanitizeString(data.name),
        slug: data.slug ? this.util.slugify(data.slug) : this.util.slugify(data.name),
        description: this.util.sanitizeString(data.description),
        short_description: this.util.sanitizeString(data.short_description),
        category_id: data.category_id,
        brand: this.util.sanitizeString(data.brand),
        base_price: this.util.parseFloat(data.base_price),
        sale_price: data.sale_price ? this.util.parseFloat(data.sale_price) : null,
        quantity: this.util.parseInteger(data.quantity, 0),
        available_quantity: this.util.parseInteger(data.quantity, 0),
        weight: data.weight ? this.util.parseFloat(data.weight) : null,
        status: 'active',
        visibility: 'public',
        created_by: this.context.user?.id || 'system',
        updated_by: this.context.user?.id || 'system'
    };

    // Check for duplicate SKU
    const existingSku = await this.db.query('SELECT id FROM products WHERE sku = $1 AND deleted_at IS NULL', [productData.sku]);
    if (existingSku.rows.length > 0) {
        throw {
            code: 'DUPLICATE_SKU',
            message: 'Product with this SKU already exists',
            statusCode: 409
        };
    }

    const product = await this.db.insert('products', productData);

    this.log(`Product created: ${product.name} (${product.sku})`);

    return {
        product,
        message: 'Product created successfully'
    };
}

// Health check for products module
async function health(req, data) {
    try {
        await initializeProductSystem.call(this);

        const productCount = await this.db.query('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL');
        const categoryCount = await this.db.query('SELECT COUNT(*) as count FROM product_categories WHERE is_active = true');

        return {
            module: 'products',
            status: 'healthy',
            database: {
                connected: true,
                product_count: parseInt(productCount.rows[0]?.count || 0),
                category_count: parseInt(categoryCount.rows[0]?.count || 0)
            },
            timestamp: this.util.getCurrentTimestamp()
        };
    } catch (error) {
        return {
            module: 'products',
            status: 'unhealthy',
            error: error.message,
            timestamp: this.util.getCurrentTimestamp()
        };
    }
}

module.exports = {
    _moduleConfig,
    getProducts,
    getProduct,
    searchProducts,
    getCategories,
    getFeatured,
    getDeals,
    createProduct,
    health
};