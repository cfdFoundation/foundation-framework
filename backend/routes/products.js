// Products API - Complete E-commerce Product Management System
// Comprehensive product catalog with advanced features, inventory management, and analytics

const _moduleConfig = {
    routerName: 'products',
    version: 'v1',
    authRequired: false, // Most endpoints are public for browsing
    rateLimit: '500/hour',
    methods: {
        // Public browsing endpoints
        browse: { 
            public: true, 
            rateLimit: '1000/hour' 
        },
        getProduct: { 
            public: true, 
            rateLimit: '2000/hour' 
        },
        search: { 
            public: true, 
            rateLimit: '500/hour' 
        },
        getCategories: { 
            public: true, 
            rateLimit: '300/hour' 
        },
        getFeatured: { 
            public: true, 
            rateLimit: '300/hour' 
        },
        getDeals: { 
            public: true, 
            rateLimit: '300/hour' 
        },
        getRecommendations: { 
            public: true, 
            rateLimit: '200/hour' 
        },
        
        // Product management (authenticated)
        create: { 
            authRequired: true, 
            rateLimit: '50/hour' 
        },
        update: { 
            authRequired: true, 
            rateLimit: '100/hour' 
        },
        delete: { 
            authRequired: true, 
            rateLimit: '20/hour' 
        },
        restore: { 
            authRequired: true, 
            rateLimit: '20/hour' 
        },
        duplicate: { 
            authRequired: true, 
            rateLimit: '30/hour' 
        },
        
        // Inventory management
        updateStock: { 
            authRequired: true, 
            rateLimit: '200/hour' 
        },
        adjustInventory: { 
            authRequired: true, 
            rateLimit: '100/hour' 
        },
        getInventoryReport: { 
            authRequired: true, 
            rateLimit: '50/hour' 
        },
        bulkUpdatePrices: { 
            authRequired: true, 
            rateLimit: '10/hour' 
        },
        bulkUpdateStock: { 
            authRequired: true, 
            rateLimit: '20/hour' 
        },
        
        // Analytics and reporting
        getAnalytics: { 
            authRequired: true, 
            rateLimit: '100/hour' 
        },
        getSalesReport: { 
            authRequired: true, 
            rateLimit: '50/hour' 
        },
        getPopularProducts: { 
            public: true, 
            rateLimit: '200/hour' 
        },
        getTrendingProducts: { 
            public: true, 
            rateLimit: '200/hour' 
        },
        
        // Category management
        createCategory: { 
            authRequired: true, 
            rateLimit: '20/hour' 
        },
        updateCategory: { 
            authRequired: true, 
            rateLimit: '50/hour' 
        },
        deleteCategory: { 
            authRequired: true, 
            rateLimit: '10/hour' 
        },
        
        // Import/Export
        importProducts: { 
            authRequired: true, 
            rateLimit: '5/hour' 
        },
        exportProducts: { 
            authRequired: true, 
            rateLimit: '10/hour' 
        },
        
        // Health and maintenance
        health: { 
            public: true, 
            rateLimit: '100/hour' 
        },
        maintenance: { 
            authRequired: true, 
            rateLimit: '5/hour' 
        }
    }
};

// Initialize complete product system tables
async function initializeProductSystem() {
    try {
        // Enhanced categories table with hierarchy and SEO
        const createCategoriesSQL = `
            CREATE TABLE IF NOT EXISTS product_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                slug VARCHAR(200) NOT NULL UNIQUE,
                description TEXT,
                
                -- Hierarchy support
                parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
                level INTEGER DEFAULT 0,
                path TEXT, -- Materialized path for efficient queries
                sort_order INTEGER DEFAULT 0,
                
                -- SEO and display
                meta_title VARCHAR(255),
                meta_description VARCHAR(500),
                meta_keywords TEXT,
                image_url VARCHAR(500),
                banner_url VARCHAR(500),
                icon_class VARCHAR(100),
                color_theme VARCHAR(7), -- Hex color
                
                -- Features and attributes
                is_active BOOLEAN DEFAULT true,
                is_featured BOOLEAN DEFAULT false,
                is_visible BOOLEAN DEFAULT true,
                show_in_menu BOOLEAN DEFAULT true,
                commission_rate DECIMAL(5,4) DEFAULT 0.0000,
                
                -- Additional data
                attributes JSONB DEFAULT '{}', -- Category-specific attributes
                filters JSONB DEFAULT '[]',    -- Available filters for this category
                metadata JSONB DEFAULT '{}',
                
                -- Audit fields
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                created_by UUID,
                updated_by UUID
            );
        `;

        // Comprehensive products table
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
                internal_id VARCHAR(100), -- Internal reference
                
                -- Pricing structure
                base_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                sale_price DECIMAL(12,2),
                cost_price DECIMAL(12,2),
                msrp DECIMAL(12,2), -- Manufacturer suggested retail price
                currency VARCHAR(3) DEFAULT 'USD',
                tax_class VARCHAR(50) DEFAULT 'standard',
                
                -- Inventory management
                track_quantity BOOLEAN DEFAULT true,
                quantity INTEGER DEFAULT 0,
                reserved_quantity INTEGER DEFAULT 0, -- For pending orders
                available_quantity INTEGER GENERATED ALWAYS AS (
                    CASE WHEN track_quantity THEN quantity - reserved_quantity ELSE 999999 END
                ) STORED,
                low_stock_threshold INTEGER DEFAULT 10,
                out_of_stock_threshold INTEGER DEFAULT 0,
                allow_backorders BOOLEAN DEFAULT false,
                backorder_limit INTEGER,
                reorder_point INTEGER,
                reorder_quantity INTEGER,
                
                -- Physical attributes
                weight DECIMAL(10,3),
                weight_unit VARCHAR(10) DEFAULT 'kg',
                length DECIMAL(10,2),
                width DECIMAL(10,2),
                height DECIMAL(10,2),
                dimension_unit VARCHAR(10) DEFAULT 'cm',
                volume DECIMAL(12,4),
                volume_unit VARCHAR(10) DEFAULT 'cm3',
                
                -- Product type and behavior
                product_type VARCHAR(50) DEFAULT 'simple', -- simple, variable, grouped, bundle
                is_virtual BOOLEAN DEFAULT false,
                is_downloadable BOOLEAN DEFAULT false,
                is_digital BOOLEAN DEFAULT false,
                requires_shipping BOOLEAN DEFAULT true,
                is_taxable BOOLEAN DEFAULT true,
                is_gift_card BOOLEAN DEFAULT false,
                
                -- Status and visibility
                status VARCHAR(50) DEFAULT 'draft', -- draft, active, inactive, archived, deleted
                visibility VARCHAR(50) DEFAULT 'public', -- public, private, hidden, password
                featured BOOLEAN DEFAULT false,
                sticky BOOLEAN DEFAULT false, -- Pin to top of lists
                
                -- SEO optimization
                meta_title VARCHAR(255),
                meta_description VARCHAR(500),
                meta_keywords TEXT,
                canonical_url VARCHAR(500),
                robots_meta VARCHAR(100) DEFAULT 'index,follow',
                
                -- Media management
                featured_image VARCHAR(500),
                gallery JSONB DEFAULT '[]', -- Array of image objects
                videos JSONB DEFAULT '[]',  -- Array of video objects
                documents JSONB DEFAULT '[]', -- Manuals, warranties, etc.
                
                -- Sales and promotions
                on_sale BOOLEAN DEFAULT false,
                sale_start_date TIMESTAMPTZ,
                sale_end_date TIMESTAMPTZ,
                promotion_text VARCHAR(200),
                badges JSONB DEFAULT '[]', -- "New", "Sale", "Limited", etc.
                
                -- Purchase constraints
                min_purchase_quantity INTEGER DEFAULT 1,
                max_purchase_quantity INTEGER,
                purchase_multiple INTEGER DEFAULT 1, -- Must buy in multiples of X
                
                -- Shipping and delivery
                shipping_class VARCHAR(100),
                shipping_weight DECIMAL(10,3),
                free_shipping BOOLEAN DEFAULT false,
                separate_shipping BOOLEAN DEFAULT false,
                delivery_time VARCHAR(100), -- "2-3 business days"
                
                -- Analytics and performance
                views_count INTEGER DEFAULT 0,
                orders_count INTEGER DEFAULT 0,
                revenue_total DECIMAL(15,2) DEFAULT 0.00,
                cart_adds_count INTEGER DEFAULT 0,
                wishlist_adds_count INTEGER DEFAULT 0,
                
                -- Reviews and ratings
                reviews_count INTEGER DEFAULT 0,
                rating_average DECIMAL(3,2) DEFAULT 0.00,
                rating_1_count INTEGER DEFAULT 0,
                rating_2_count INTEGER DEFAULT 0,
                rating_3_count INTEGER DEFAULT 0,
                rating_4_count INTEGER DEFAULT 0,
                rating_5_count INTEGER DEFAULT 0,
                
                -- Advanced features
                tags JSONB DEFAULT '[]',
                custom_fields JSONB DEFAULT '{}',
                variants JSONB DEFAULT '[]', -- Color, size, etc.
                related_products JSONB DEFAULT '[]',
                cross_sells JSONB DEFAULT '[]',
                up_sells JSONB DEFAULT '[]',
                
                -- External integrations
                external_id VARCHAR(100),
                supplier_sku VARCHAR(100),
                supplier_id UUID,
                
                -- Compliance and certifications
                age_restricted BOOLEAN DEFAULT false,
                requires_prescription BOOLEAN DEFAULT false,
                hazardous_material BOOLEAN DEFAULT false,
                certifications JSONB DEFAULT '[]',
                compliance_notes TEXT,
                
                -- Advanced attributes
                attributes JSONB DEFAULT '{}', -- Dynamic product attributes
                specifications JSONB DEFAULT '{}', -- Technical specifications
                features JSONB DEFAULT '[]', -- Key features list
                
                -- Audit and versioning
                version INTEGER DEFAULT 1,
                published_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                created_by UUID,
                updated_by UUID,
                
                -- Soft delete
                deleted_at TIMESTAMPTZ,
                deleted_by UUID,
                
                -- Constraints
                CONSTRAINT valid_price_range CHECK (base_price >= 0),
                CONSTRAINT valid_sale_price CHECK (sale_price IS NULL OR sale_price >= 0),
                CONSTRAINT valid_quantity CHECK (quantity >= 0),
                CONSTRAINT valid_rating CHECK (rating_average >= 0 AND rating_average <= 5)
            );
        `;

        // Product variants table for complex products
        const createVariantsSQL = `
            CREATE TABLE IF NOT EXISTS product_variants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                sku VARCHAR(100) NOT NULL UNIQUE,
                name VARCHAR(200),
                
                -- Variant attributes (color, size, etc.)
                attributes JSONB NOT NULL DEFAULT '{}',
                
                -- Pricing override
                price_adjustment DECIMAL(12,2) DEFAULT 0.00,
                price_type VARCHAR(20) DEFAULT 'adjustment', -- adjustment, fixed
                
                -- Inventory
                quantity INTEGER DEFAULT 0,
                reserved_quantity INTEGER DEFAULT 0,
                
                -- Physical properties
                weight_adjustment DECIMAL(10,3) DEFAULT 0.000,
                
                -- Media
                image VARCHAR(500),
                images JSONB DEFAULT '[]',
                
                -- Status
                is_active BOOLEAN DEFAULT true,
                sort_order INTEGER DEFAULT 0,
                
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        // Product attributes definition table
        const createAttributesSQL = `
            CREATE TABLE IF NOT EXISTS product_attributes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL UNIQUE,
                slug VARCHAR(100) NOT NULL UNIQUE,
                type VARCHAR(50) NOT NULL DEFAULT 'text', -- text, number, boolean, select, multiselect, color, date
                label VARCHAR(200),
                description TEXT,
                
                -- Options for select types
                options JSONB DEFAULT '[]',
                
                -- Validation
                is_required BOOLEAN DEFAULT false,
                is_filterable BOOLEAN DEFAULT false,
                is_visible BOOLEAN DEFAULT true,
                
                -- Display
                sort_order INTEGER DEFAULT 0,
                group_name VARCHAR(100),
                
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        // Stock movements/transactions table
        const createStockMovementsSQL = `
            CREATE TABLE IF NOT EXISTS stock_movements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
                
                movement_type VARCHAR(50) NOT NULL, -- in, out, adjustment, reserved, released
                quantity INTEGER NOT NULL,
                previous_quantity INTEGER NOT NULL,
                new_quantity INTEGER NOT NULL,
                
                reason VARCHAR(100), -- purchase, sale, adjustment, return, damaged, etc.
                reference_type VARCHAR(50), -- order, purchase, adjustment, etc.
                reference_id VARCHAR(100),
                
                cost_per_unit DECIMAL(12,2),
                total_cost DECIMAL(15,2),
                
                notes TEXT,
                
                created_at TIMESTAMPTZ DEFAULT NOW(),
                created_by UUID
            );
        `;

        await this.db.query(createCategoriesSQL);
        await this.db.query(createProductsSQL);
        await this.db.query(createVariantsSQL);
        await this.db.query(createAttributesSQL);
        await this.db.query(createStockMovementsSQL);

        // Create comprehensive indexes
        const indexes = [
            // Categories indexes
            'CREATE INDEX IF NOT EXISTS idx_categories_slug ON product_categories(slug);',
            'CREATE INDEX IF NOT EXISTS idx_categories_parent ON product_categories(parent_id);',
            'CREATE INDEX IF NOT EXISTS idx_categories_path ON product_categories(path);',
            'CREATE INDEX IF NOT EXISTS idx_categories_active ON product_categories(is_active, is_visible);',
            'CREATE INDEX IF NOT EXISTS idx_categories_featured ON product_categories(is_featured, sort_order);',
            'CREATE INDEX IF NOT EXISTS idx_categories_level ON product_categories(level, sort_order);',
            
            // Products core indexes
            'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);',
            'CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);',
            'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status, visibility);',
            'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, status);',
            'CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand, status);',
            'CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured, status);',
            'CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);',
            'CREATE INDEX IF NOT EXISTS idx_products_updated ON products(updated_at DESC);',
            'CREATE INDEX IF NOT EXISTS idx_products_published ON products(published_at DESC);',
            
            // Pricing indexes
            'CREATE INDEX IF NOT EXISTS idx_products_price ON products(base_price) WHERE status = \'active\';',
            'CREATE INDEX IF NOT EXISTS idx_products_sale ON products(on_sale, sale_price) WHERE on_sale = true;',
            'CREATE INDEX IF NOT EXISTS idx_products_price_range ON products(base_price, category_id) WHERE status = \'active\';',
            
            // Inventory indexes
            'CREATE INDEX IF NOT EXISTS idx_products_stock ON products(available_quantity) WHERE track_quantity = true;',
            'CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(id) WHERE track_quantity = true AND available_quantity <= low_stock_threshold;',
            'CREATE INDEX IF NOT EXISTS idx_products_out_of_stock ON products(id) WHERE track_quantity = true AND available_quantity <= 0;',
            
            // Performance indexes
            'CREATE INDEX IF NOT EXISTS idx_products_popular ON products(orders_count DESC, views_count DESC);',
            'CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating_average DESC, reviews_count DESC);',
            'CREATE INDEX IF NOT EXISTS idx_products_revenue ON products(revenue_total DESC);',
            
            // JSON indexes for attributes and tags
            'CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING gin(tags);',
            'CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING gin(attributes);',
            'CREATE INDEX IF NOT EXISTS idx_products_badges ON products USING gin(badges);',
            
            // Full-text search index
            'CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector(\'english\', 
                name || \' \' || 
                COALESCE(description, \'\') || \' \' || 
                COALESCE(brand, \'\') || \' \' ||
                COALESCE(model, \'\') || \' \' ||
                COALESCE(meta_keywords, \'\')
            )) WHERE status = \'active\';',
            
            // Soft delete index
            'CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at) WHERE deleted_at IS NOT NULL;',
            
            // Variants indexes
            'CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);',
            'CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);',
            'CREATE INDEX IF NOT EXISTS idx_variants_active ON product_variants(is_active);',
            'CREATE INDEX IF NOT EXISTS idx_variants_attributes ON product_variants USING gin(attributes);',
            
            // Attributes indexes
            'CREATE INDEX IF NOT EXISTS idx_attributes_slug ON product_attributes(slug);',
            'CREATE INDEX IF NOT EXISTS idx_attributes_type ON product_attributes(type);',
            'CREATE INDEX IF NOT EXISTS idx_attributes_filterable ON product_attributes(is_filterable) WHERE is_filterable = true;',
            
            // Stock movements indexes
            'CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);',
            'CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type, created_at DESC);',
            'CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);',
            'CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);'
        ];

        for (const indexSQL of indexes) {
            await this.db.query(indexSQL);
        }

        // Insert sample data if tables are empty
        await this.insertSampleDataIfNeeded();

        this.log('Product system tables initialized successfully');

    } catch (error) {
        this.log('Failed to initialize product system tables', 'error');
        throw error;
    }
}

// Insert comprehensive sample data
async function insertSampleDataIfNeeded() {
    // Check if categories exist
    const categoryCount = await this.db.query('SELECT COUNT(*) as count FROM product_categories');
    if (parseInt(categoryCount.rows[0].count) === 0) {
        await this.insertSampleCategories();
    }

    // Check if products exist
    const productCount = await this.db.query('SELECT COUNT(*) as count FROM products');
    if (parseInt(productCount.rows[0].count) === 0) {
        await this.insertSampleProducts();
    }

    // Check if attributes exist
    const attributeCount = await this.db.query('SELECT COUNT(*) as count FROM product_attributes');
    if (parseInt(attributeCount.rows[0].count) === 0) {
        await this.insertSampleAttributes();
    }
}

async function insertSampleCategories() {
    const categories = [
        { 
            name: 'Electronics', 
            slug: 'electronics', 
            description: 'Electronic devices, gadgets, and technology products',
            meta_title: 'Electronics - Latest Tech Gadgets',
            meta_description: 'Discover the latest electronics including smartphones, laptops, and smart home devices',
            image_url: '/images/categories/electronics.jpg',
            color_theme: '#007bff',
            is_featured: true,
            sort_order: 1
        },
        { 
            name: 'Computers & Laptops', 
            slug: 'computers-laptops', 
            description: 'Desktop computers, laptops, and computer accessories',
            parent_slug: 'electronics',
            meta_title: 'Computers & Laptops - High Performance PCs',
            image_url: '/images/categories/computers.jpg',
            color_theme: '#6c757d',
            is_featured: true,
            sort_order: 2
        },
        { 
            name: 'Smartphones & Tablets', 
            slug: 'smartphones-tablets', 
            description: 'Latest smartphones, tablets, and mobile accessories',
            parent_slug: 'electronics',
            meta_title: 'Smartphones & Tablets - Mobile Technology',
            image_url: '/images/categories/mobile.jpg',
            color_theme: '#28a745',
            is_featured: true,
            sort_order: 3
        },
        { 
            name: 'Fashion & Apparel', 
            slug: 'fashion-apparel', 
            description: 'Clothing, shoes, accessories, and fashion items',
            meta_title: 'Fashion & Apparel - Latest Trends',
            meta_description: 'Shop the latest fashion trends in clothing, shoes, and accessories',
            image_url: '/images/categories/fashion.jpg',
            color_theme: '#e83e8c',
            is_featured: true,
            sort_order: 4
        },
        { 
            name: 'Men\'s Clothing', 
            slug: 'mens-clothing', 
            description: 'Men\'s apparel, shoes, and accessories',
            parent_slug: 'fashion-apparel',
            image_url: '/images/categories/mens-fashion.jpg',
            color_theme: '#495057',
            sort_order: 5
        },
        { 
            name: 'Women\'s Clothing', 
            slug: 'womens-clothing', 
            description: 'Women\'s apparel, shoes, and accessories',
            parent_slug: 'fashion-apparel',
            image_url: '/images/categories/womens-fashion.jpg',
            color_theme: '#fd7e14',
            sort_order: 6
        },
        { 
            name: 'Home & Garden', 
            slug: 'home-garden', 
            description: 'Home improvement, furniture, décor, and garden supplies',
            meta_title: 'Home & Garden - Transform Your Space',
            image_url: '/images/categories/home.jpg',
            color_theme: '#20c997',
            is_featured: false,
            sort_order: 7
        },
        { 
            name: 'Sports & Fitness', 
            slug: 'sports-fitness', 
            description: 'Sports equipment, fitness gear, and outdoor activities',
            meta_title: 'Sports & Fitness - Active Lifestyle',
            image_url: '/images/categories/sports.jpg',
            color_theme: '#dc3545',
            is_featured: false,
            sort_order: 8
        },
        { 
            name: 'Books & Media', 
            slug: 'books-media', 
            description: 'Books, ebooks, audiobooks, movies, and digital content',
            meta_title: 'Books & Media - Knowledge & Entertainment',
            image_url: '/images/categories/books.jpg',
            color_theme: '#6f42c1',
            is_featured: false,
            sort_order: 9
        },
        { 
            name: 'Health & Beauty', 
            slug: 'health-beauty', 
            description: 'Health products, skincare, cosmetics, and wellness',
            meta_title: 'Health & Beauty - Wellness Products',
            image_url: '/images/categories/health.jpg',
            color_theme: '#17a2b8',
            is_featured: false,
            sort_order: 10
        }
    ];

    // Insert root categories first
    const insertedCategories = {};
    
    for (const category of categories) {
        if (!category.parent_slug) {
            const categoryData = { ...category };
            delete categoryData.parent_slug;
            
            const result = await this.db.insert('product_categories', categoryData);
            insertedCategories[category.slug] = result.id;
        }
    }

    // Insert child categories
    for (const category of categories) {
        if (category.parent_slug) {
            const categoryData = { 
                ...category,
                parent_id: insertedCategories[category.parent_slug]
            };
            delete categoryData.parent_slug;
            
            const result = await this.db.insert('product_categories', categoryData);
            insertedCategories[category.slug] = result.id;
        }
    }

    this.log('Sample categories inserted');
}

async function insertSampleProducts() {
    // Get categories for reference
    const categoriesResult = await this.db.query('SELECT id, slug FROM product_categories');
    const categories = {};
    categoriesResult.rows.forEach(cat => {
        categories[cat.slug] = cat.id;
    });

    const products = [
        // Electronics - Computers
        {
            sku: 'LAPTOP-PRO-15-2024',
            name: 'ProBook Elite 15" Professional Laptop',
            slug: 'probook-elite-15-professional-laptop',
            description: 'High-performance laptop designed for professionals and power users. Features the latest Intel i7 processor, 32GB RAM, 1TB NVMe SSD, and dedicated NVIDIA graphics. Perfect for development, design, and demanding applications.',
            short_description: 'Professional laptop with Intel i7, 32GB RAM, 1TB SSD, and NVIDIA graphics',
            category_id: categories['computers-laptops'],
            brand: 'TechPro',
            manufacturer: 'TechPro Industries',
            model: 'Elite 15 Pro',
            base_price: 1899.99,
            sale_price: 1699.99,
            cost_price: 1200.00,
            msrp: 2199.99,
            on_sale: true,
            sale_start_date: new Date(),
            sale_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            quantity: 15,
            low_stock_threshold: 5,
            weight: 2.1,
            length: 35.5,
            width: 24.0,
            height: 1.8,
            featured: true,
            meta_title: 'ProBook Elite 15" - Professional Laptop for Power Users',
            meta_description: 'Experience ultimate performance with the ProBook Elite 15" featuring Intel i7, 32GB RAM, and NVIDIA graphics.',
            featured_image: '/images/products/laptop-pro-main.jpg',
            gallery: JSON.stringify([
                {url: '/images/products/laptop-pro-1.jpg', alt: 'Front view'},
                {url: '/images/products/laptop-pro-2.jpg', alt: 'Side view'},
                {url: '/images/products/laptop-pro-3.jpg', alt: 'Keyboard detail'},
                {url: '/images/products/laptop-pro-4.jpg', alt: 'Ports view'}
            ]),
            tags: JSON.stringify(['laptop', 'professional', 'intel-i7', 'nvidia', 'ssd', 'high-performance']),
            badges: JSON.stringify(['Sale', 'Professional', 'Fast Shipping']),
            attributes: JSON.stringify({
                'Processor': 'Intel Core i7-13700H',
                'RAM': '32GB DDR5',
                'Storage': '1TB NVMe SSD',
                'Graphics': 'NVIDIA RTX 4060 8GB',
                'Display': '15.6" 4K OLED',
                'Operating System': 'Windows 11 Pro',
                'Warranty': '3 Years Premium'
            }),
            specifications: JSON.stringify({
                'dimensions': '35.5 x 24.0 x 1.8 cm',
                'weight': '2.1 kg',
                'battery_life': 'Up to 12 hours',
                'connectivity': ['WiFi 6E', 'Bluetooth 5.3', 'USB-C', 'HDMI 2.1'],
                'security': ['Fingerprint Reader', 'TPM 2.0', 'IR Camera']
            }),
            features: JSON.stringify([
                'Ultra-fast NVMe SSD storage',
                'Professional-grade graphics',
                'All-day battery life',
                'Premium build quality',
                'Advanced security features'
            ]),
            status: 'active',
            visibility: 'public',
            published_at: new Date()
        },
        
        // Electronics - Smartphones
        {
            sku: 'PHONE-ULTRA-PRO-256',
            name: 'UltraPhone Pro Max 256GB',
            slug: 'ultraphone-pro-max-256gb',
            description: 'Flagship smartphone with cutting-edge technology. Features a triple-camera system with AI photography, all-day battery life, 5G connectivity, and premium titanium design. The ultimate smartphone experience.',
            short_description: 'Flagship smartphone with triple cameras, 5G, and premium titanium design',
            category_id: categories['smartphones-tablets'],
            brand: 'UltraTech',
            manufacturer: 'UltraTech Mobile',
            model: 'Pro Max',
            base_price: 1299.99,
            cost_price: 750.00,
            msrp: 1399.99,
            quantity: 45,
            low_stock_threshold: 10,
            weight: 0.240,
            length: 16.1,
            width: 7.8,
            height: 0.8,
            featured: true,
            meta_title: 'UltraPhone Pro Max - Premium Flagship Smartphone',
            meta_description: 'Experience the future with UltraPhone Pro Max featuring AI cameras, 5G connectivity, and titanium design.',
            featured_image: '/images/products/phone-ultra-main.jpg',
            gallery: JSON.stringify([
                {url: '/images/products/phone-ultra-1.jpg', alt: 'Front view'},
                {url: '/images/products/phone-ultra-2.jpg', alt: 'Back cameras'},
                {url: '/images/products/phone-ultra-3.jpg', alt: 'Side profile'},
                {url: '/images/products/phone-ultra-4.jpg', alt: 'Color options'}
            ]),
            tags: JSON.stringify(['smartphone', 'flagship', '5g', 'ai-camera', 'titanium', 'premium']),
            badges: JSON.stringify(['New', 'Flagship', '5G Ready']),
            attributes: JSON.stringify({
                'Storage': '256GB',
                'RAM': '12GB',
                'Display': '6.7" ProMotion OLED',
                'Camera': '48MP Triple System',
                'Battery': '4500mAh',
                'Connectivity': '5G, WiFi 6E',
                'Material': 'Titanium Frame'
            }),
            specifications: JSON.stringify({
                'processor': 'A17 Pro Bionic',
                'display_resolution': '2796 x 1290',
                'refresh_rate': '120Hz',
                'water_resistance': 'IP68',
                'charging': ['25W Fast Charging', '15W Wireless', '5W Reverse Wireless']
            }),
            status: 'active',
            visibility: 'public',
            published_at: new Date(),
            rating_average: 4.8,
            reviews_count: 156,
            orders_count: 89
        },
        
        // Fashion - Men's Clothing
        {
            sku: 'SHIRT-PREMIUM-COTTON-M',
            name: 'Premium Cotton Business Shirt',
            slug: 'premium-cotton-business-shirt',
            description: 'Elegant business shirt crafted from 100% premium Egyptian cotton. Features a tailored fit, wrinkle-resistant fabric, and classic design. Perfect for office wear, business meetings, and formal occasions.',
            short_description: 'Premium Egyptian cotton business shirt with tailored fit',
            category_id: categories['mens-clothing'],
            brand: 'EliteWear',
            manufacturer: 'EliteWear Fashion',
            model: 'Executive Series',
            base_price: 89.99,
            cost_price: 35.00,
            msrp: 119.99,
            quantity: 120,
            low_stock_threshold: 20,
            weight: 0.3,
            featured: false,
            meta_title: 'Premium Cotton Business Shirt - Professional Attire',
            meta_description: 'Elevate your professional wardrobe with our premium Egyptian cotton business shirt.',
            featured_image: '/images/products/shirt-premium-main.jpg',
            gallery: JSON.stringify([
                {url: '/images/products/shirt-premium-1.jpg', alt: 'Front view'},
                {url: '/images/products/shirt-premium-2.jpg', alt: 'Detail view'},
                {url: '/images/products/shirt-premium-3.jpg', alt: 'Collar detail'}
            ]),
            tags: JSON.stringify(['shirt', 'business', 'cotton', 'formal', 'professional', 'tailored']),
            badges: JSON.stringify(['Premium Quality']),
            attributes: JSON.stringify({
                'Material': '100% Egyptian Cotton',
                'Fit': 'Tailored',
                'Collar': 'Spread',
                'Cuffs': 'Button',
                'Care': 'Machine Washable',
                'Origin': 'Made in Italy'
            }),
            specifications: JSON.stringify({
                'fabric_weight': '120gsm',
                'thread_count': '200',
                'treatment': 'Wrinkle Resistant',
                'sizes_available': ['S', 'M', 'L', 'XL', 'XXL'],
                'colors_available': ['White', 'Light Blue', 'Light Pink', 'Charcoal']
            }),
            status: 'active',
            visibility: 'public',
            published_at: new Date(),
            rating_average: 4.3,
            reviews_count: 78,
            orders_count: 156
        },
        
        // Sports & Fitness
        {
            sku: 'BIKE-MOUNTAIN-TRAIL-27',
            name: 'TrailMaster Mountain Bike 27.5"',
            slug: 'trailmaster-mountain-bike-27-5',
            description: 'Professional mountain bike engineered for serious trail riding. Features lightweight aluminum frame, 21-speed Shimano drivetrain, front suspension, and all-terrain tires. Built to conquer any trail with confidence.',
            short_description: 'Professional mountain bike with 21-speed Shimano drivetrain and front suspension',
            category_id: categories['sports-fitness'],
            brand: 'TrailMaster',
            manufacturer: 'TrailMaster Bikes',
            model: 'Pro Trail 27.5',
            base_price: 899.99,
            sale_price: 749.99,
            cost_price: 450.00,
            msrp: 1099.99,
            on_sale: true,
            sale_start_date: new Date(),
            sale_end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            quantity: 8,
            low_stock_threshold: 3,
            weight: 14.5,
            length: 180,
            width: 60,
            height: 110,
            featured: true,
            requires_shipping: true,
            shipping_class: 'oversized',
            meta_title: 'TrailMaster Mountain Bike - Professional Trail Riding',
            meta_description: 'Conquer any trail with the TrailMaster Mountain Bike featuring Shimano drivetrain and front suspension.',
            featured_image: '/images/products/bike-mountain-main.jpg',
            gallery: JSON.stringify([
                {url: '/images/products/bike-mountain-1.jpg', alt: 'Full bike view'},
                {url: '/images/products/bike-mountain-2.jpg', alt: 'Frame detail'},
                {url: '/images/products/bike-mountain-3.jpg', alt: 'Drivetrain close-up'},
                {url: '/images/products/bike-mountain-4.jpg', alt: 'Suspension detail'}
            ]),
            tags: JSON.stringify(['mountain-bike', 'cycling', 'outdoor', 'sports', 'shimano', '21-speed', 'trail']),
            badges: JSON.stringify(['Sale', 'Professional Grade', 'Free Assembly']),
            attributes: JSON.stringify({
                'Frame Material': '6061 Aluminum',
                'Wheel Size': '27.5 inch',
                'Gears': '21 Speed',
                'Brakes': 'Mechanical Disc',
                'Suspension': 'Front Fork',
                'Max Rider Weight': '120kg',
                'Assembly': 'Free In-Store'
            }),
            specifications: JSON.stringify({
                'frame_size_options': ['Medium (17")', 'Large (19")', 'X-Large (21")'],
                'drivetrain': 'Shimano Tourney 21-speed',
                'brakes': 'Mechanical disc brakes',
                'tires': '27.5" x 2.1" all-terrain',
                'suspension_travel': '100mm'
            }),
            status: 'active',
            visibility: 'public',
            published_at: new Date(),
            rating_average: 4.6,
            reviews_count: 124,
            orders_count: 67
        },
        
        // Books & Media
        {
            sku: 'BOOK-JS-GUIDE-2024',
            name: 'JavaScript Mastery: Complete Developer Guide 2024',
            slug: 'javascript-mastery-complete-developer-guide-2024',
            description: 'Comprehensive guide to modern JavaScript development covering ES6+, async programming, frameworks, testing, and industry best practices. Perfect for beginners to advanced developers looking to master JavaScript.',
            short_description: 'Complete JavaScript guide covering modern development practices and frameworks',
            category_id: categories['books-media'],
            brand: 'TechBooks Pro',
            manufacturer: 'TechBooks Publishing',
            model: '2024 Edition',
            base_price: 59.99,
            sale_price: 44.99,
            cost_price: 15.00,
            msrp: 79.99,
            on_sale: true,
            sale_start_date: new Date(),
            sale_end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            quantity: 85,
            low_stock_threshold: 15,
            weight: 1.2,
            is_digital: false,
            is_downloadable: false,
            requires_shipping: true,
            featured: true,
            meta_title: 'JavaScript Mastery 2024 - Complete Developer Guide',
            meta_description: 'Master modern JavaScript development with this comprehensive 2024 guide covering frameworks, testing, and best practices.',
            featured_image: '/images/products/book-js-main.jpg',
            gallery: JSON.stringify([
                {url: '/images/products/book-js-1.jpg', alt: 'Book cover'},
                {url: '/images/products/book-js-2.jpg', alt: 'Table of contents'},
                {url: '/images/products/book-js-3.jpg', alt: 'Sample pages'}
            ]),
            tags: JSON.stringify(['javascript', 'programming', 'web-development', 'coding', 'tutorial', 'guide', 'es6']),
            badges: JSON.stringify(['Sale', 'Bestseller', '2024 Edition']),
            attributes: JSON.stringify({
                'Format': 'Paperback + eBook',
                'Pages': '950',
                'Language': 'English',
                'Edition': '2024',
                'ISBN': '978-1234567890',
                'Level': 'Beginner to Advanced',
                'Publisher': 'TechBooks Pro'
            }),
            specifications: JSON.stringify({
                'dimensions': '23.5 x 19.1 x 4.8 cm',
                'chapters': 28,
                'code_examples': 300,
                'practical_projects': 20,
                'online_resources': true,
                'video_companion': true
            }),
            features: JSON.stringify([
                'Covers latest ES2024 features',
                'Real-world project examples',
                'Online code repository',
                'Video tutorials included',
                'Industry best practices'
            ]),
            status: 'active',
            visibility: 'public',
            published_at: new Date(),
            rating_average: 4.9,
            reviews_count: 287,
            orders_count: 423
        }
    ];

    for (const product of products) {
        await this.db.insert('products', {
            ...product,
            created_by: 'system',
            updated_by: 'system'
        });
    }

    this.log('Sample products inserted');
}

async function insertSampleAttributes() {
    const attributes = [
        {
            name: 'Color',
            slug: 'color',
            type: 'color',
            label: 'Color',
            description: 'Product color options',
            is_filterable: true,
            sort_order: 1,
            group_name: 'Appearance'
        },
        {
            name: 'Size',
            slug: 'size',
            type: 'select',
            label: 'Size',
            description: 'Product size options',
            options: JSON.stringify(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
            is_filterable: true,
            sort_order: 2,
            group_name: 'Dimensions'
        },
        {
            name: 'Material',
            slug: 'material',
            type: 'text',
            label: 'Material',
            description: 'Product material composition',
            is_filterable: true,
            sort_order: 3,
            group_name: 'Composition'
        },
        {
            name: 'Brand',
            slug: 'brand',
            type: 'text',
            label: 'Brand',
            description: 'Product brand or manufacturer',
            is_filterable: true,
            sort_order: 4,
            group_name: 'Basic'
        },
        {
            name: 'Warranty',
            slug: 'warranty',
            type: 'text',
            label: 'Warranty Period',
            description: 'Product warranty information',
            is_filterable: false,
            sort_order: 5,
            group_name: 'Support'
        }
    ];

    for (const attribute of attributes) {
        await this.db.insert('product_attributes', attribute);
    }

    this.log('Sample attributes inserted');
}

// MAIN API ENDPOINTS

// Browse products with advanced filtering
async function browse(req, data) {
    this.log('Browsing products with filters');
    
    await initializeProductSystem.call(this);

    // Parse and validate parameters
    const limit = Math.min(this.util.parseInteger(data.limit, 24), 100);
    const offset = this.util.parseInteger(data.offset, 0);
    const page = Math.max(this.util.parseInteger(data.page, 1), 1);
    const calculatedOffset = data.offset !== undefined ? offset : (page - 1) * limit;
    
    // Filters
    const category = this.util.sanitizeString(data.category);
    const brand = this.util.sanitizeString(data.brand);
    const status = this.util.sanitizeString(data.status || 'active');
    const visibility = this.util.sanitizeString(data.visibility || 'public');
    const featured = data.featured === 'true';
    const onSale = data.on_sale === 'true';
    const inStock = data.in_stock === 'true';
    
    // Price range
    const minPrice = this.util.parseFloat(data.min_price, 0);
    const maxPrice = this.util.parseFloat(data.max_price, 0);
    
    // Sorting
    const sortBy = this.util.sanitizeString(data.sort_by || 'created_at');
    const sortOrder = this.util.sanitizeString(data.sort_order || 'desc').toLowerCase();
    
    // Tags filter
    const tags = data.tags ? (Array.isArray(data.tags) ? data.tags : [data.tags]) : [];

    // Build dynamic query
    let sql = `
        SELECT 
            p.id, p.sku, p.name, p.slug, p.short_description, p.brand,
            p.base_price, p.sale_price, p.on_sale, p.currency,
            p.available_quantity, p.track_quantity, p.featured,
            p.featured_image, p.badges, p.rating_average, p.reviews_count,
            p.created_at, p.updated_at,
            c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.status = $1 AND p.visibility = $2 AND p.deleted_at IS NULL
    `;
    
    const params = [status, visibility];
    let paramIndex = 3;

    // Apply filters
    if (category) {
        sql += ` AND c.slug = $${paramIndex}`;
        params.push(category);
        paramIndex++;
    }

    if (brand) {
        sql += ` AND p.brand = $${paramIndex}`;
        params.push(brand);
        paramIndex++;
    }

    if (featured) {
        sql += ` AND p.featured = true`;
    }

    if (onSale) {
        sql += ` AND p.on_sale = true`;
    }

    if (inStock) {
        sql += ` AND (p.track_quantity = false OR p.available_quantity > 0)`;
    }

    if (minPrice > 0) {
        sql += ` AND (CASE WHEN p.on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.base_price END) >= $${paramIndex}`;
        params.push(minPrice);
        paramIndex++;
    }

    if (maxPrice > 0) {
        sql += ` AND (CASE WHEN p.on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.base_price END) <= $${paramIndex}`;
        params.push(maxPrice);
        paramIndex++;
    }

    // Tags filter using JSON containment
    if (tags.length > 0) {
        sql += ` AND p.tags ?| $${paramIndex}`;
        params.push(tags);
        paramIndex++;
    }

    // Sorting
    const validSortFields = {
        'name': 'p.name',
        'price': 'CASE WHEN p.on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.base_price END',
        'created_at': 'p.created_at',
        'updated_at': 'p.updated_at',
        'rating': 'p.rating_average',
        'popularity': 'p.orders_count',
        'views': 'p.views_count'
    };
    
    const sortField = validSortFields[sortBy] || 'p.created_at';
    const sortDirection = ['asc', 'desc'].includes(sortOrder) ? sortOrder.toUpperCase() : 'DESC';
    
    sql += ` ORDER BY ${sortField} ${sortDirection}`;
    
    // Add secondary sort for consistency
    if (sortBy !== 'created_at') {
        sql += `, p.created_at DESC`;
    }
    
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, calculatedOffset);

    // Create cache key
    const cacheKey = `products:browse:${JSON.stringify({
        status, visibility, category, brand, featured, onSale, inStock,
        minPrice, maxPrice, tags, sortBy, sortOrder, limit, offset: calculatedOffset
    })}`;

    const result = await this.db.query(sql, params, cacheKey, 300);

    // Get total count for pagination
    let countSQL = `
        SELECT COUNT(*) as total
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.status = $1 AND p.visibility = $2 AND p.deleted_at IS NULL
    `;
    
    let countParams = [status, visibility];
    let countParamIndex = 3;

    // Apply same filters for count
    if (category) {
        countSQL += ` AND c.slug = $${countParamIndex}`;
        countParams.push(category);
        countParamIndex++;
    }

    if (brand) {
        countSQL += ` AND p.brand = $${countParamIndex}`;
        countParams.push(brand);
        countParamIndex++;
    }

    if (featured) {
        countSQL += ` AND p.featured = true`;
    }

    if (onSale) {
        countSQL += ` AND p.on_sale = true`;
    }

    if (inStock) {
        countSQL += ` AND (p.track_quantity = false OR p.available_quantity > 0)`;
    }

    if (minPrice > 0) {
        countSQL += ` AND (CASE WHEN p.on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.base_price END) >= $${countParamIndex}`;
        countParams.push(minPrice);
        countParamIndex++;
    }

    if (maxPrice > 0) {
        countSQL += ` AND (CASE WHEN p.on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.base_price END) <= $${countParamIndex}`;
        countParams.push(maxPrice);
        countParamIndex++;
    }

    if (tags.length > 0) {
        countSQL += ` AND p.tags ?| $${countParamIndex}`;
        countParams.push(tags);
    }

    const countResult = await this.db.query(countSQL, countParams, `${cacheKey}:count`, 300);
    const total = parseInt(countResult.rows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);

    this.log(`Retrieved ${result.rows.length} products (${result.fromCache ? 'cached' : 'fresh'})`);

    return {
        products: result.rows.map(product => ({
            ...product,
            badges: JSON.parse(product.badges || '[]'),
            effective_price: product.on_sale && product.sale_price ? product.sale_price : product.base_price,
            discount_percentage: product.on_sale && product.sale_price ? 
                Math.round(((product.base_price - product.sale_price) / product.base_price) * 100) : 0,
            in_stock: product.track_quantity ? product.available_quantity > 0 : true,
            stock_status: product.track_quantity ? 
                (product.available_quantity > 0 ? 'in_stock' : 'out_of_stock') : 'unlimited'
        })),
        pagination: {
            page: Math.floor(calculatedOffset / limit) + 1,
            limit,
            offset: calculatedOffset,
            total,
            totalPages,
            hasNext: calculatedOffset + limit < total,
            hasPrev: calculatedOffset > 0
        },
        filters: {
            applied: {
                category, brand, featured, onSale, inStock,
                minPrice, maxPrice, tags, sortBy, sortOrder
            },
            total_results: total
        },
        fromCache: result.fromCache
    };
}

// Get single product with comprehensive details
async function getProduct(req, data) {
    this.log('Fetching product details');
    
    await initializeProductSystem.call(this);

    const identifier = this.util.sanitizeString(data.product || data.id || data.slug);
    
    if (!identifier) {
        throw {
            code: 'MISSING_IDENTIFIER',
            message: 'Product identifier (ID or slug) is required',
            statusCode: 400
        };
    }

    // Determine if identifier is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    const sql = `
        SELECT 
            p.*,
            c.name as category_name, 
            c.slug as category_slug,
            c.path as category_path
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE ${isUUID ? 'p.id' : 'p.slug'} = $1 
            AND p.status != 'deleted' 
            AND p.deleted_at IS NULL
    `;

    const cacheKey = `product:${identifier}`;
    const result = await this.db.query(sql, [identifier], cacheKey, 600);

    if (result.rows.length === 0) {
        throw {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found',
            statusCode: 404
        };
    }

    const product = result.rows[0];

    // Get product variants if it's a variable product
    let variants = [];
    if (product.product_type === 'variable') {
        const variantsResult = await this.db.query(
            'SELECT * FROM product_variants WHERE product_id = $1 AND is_active = true ORDER BY sort_order',
            [product.id],
            `product_variants:${product.id}`,
            600
        );
        variants = variantsResult.rows.map(variant => ({
            ...variant,
            attributes: JSON.parse(variant.attributes || '{}'),
            images: JSON.parse(variant.images || '[]')
        }));
    }

    // Increment view count (async, don't wait)
    this.db.query(
        'UPDATE products SET views_count = views_count + 1, updated_at = NOW() WHERE id = $1',
        [product.id]
    ).catch(err => this.log(`Failed to increment view count: ${err.message}`, 'warn'));

    // Get related products
    const relatedProducts = await this.getRelatedProducts(product);

    // Parse JSON fields
    const parsedProduct = {
        ...product,
        gallery: JSON.parse(product.gallery || '[]'),
        videos: JSON.parse(product.videos || '[]'),
        documents: JSON.parse(product.documents || '[]'),
        tags: JSON.parse(product.tags || '[]'),
        badges: JSON.parse(product.badges || '[]'),
        attributes: JSON.parse(product.attributes || '{}'),
        specifications: JSON.parse(product.specifications || '{}'),
        features: JSON.parse(product.features || '[]'),
        custom_fields: JSON.parse(product.custom_fields || '{}'),
        related_products: JSON.parse(product.related_products || '[]'),
        cross_sells: JSON.parse(product.cross_sells || '[]'),
        up_sells: JSON.parse(product.up_sells || '[]'),
        certifications: JSON.parse(product.certifications || '[]'),
        
        // Calculated fields
        effective_price: product.on_sale && product.sale_price ? product.sale_price : product.base_price,
        discount_percentage: product.on_sale && product.sale_price ? 
            Math.round(((product.base_price - product.sale_price) / product.base_price) * 100) : 0,
        discount_amount: product.on_sale && product.sale_price ? 
            product.base_price - product.sale_price : 0,
        
        // Stock information
        in_stock: product.track_quantity ? product.available_quantity > 0 : true,
        stock_status: product.track_quantity ? 
            (product.available_quantity > 0 ? 'in_stock' : 'out_of_stock') : 'unlimited',
        low_stock: product.track_quantity ? 
            product.available_quantity <= product.low_stock_threshold : false,
        stock_quantity_display: product.track_quantity ? 
            (product.available_quantity > 10 ? '10+' : product.available_quantity.toString()) : 'In Stock',
        
        // Additional metadata
        variants,
        related_products_data: relatedProducts,
        fromCache: result.fromCache
    };

    this.log(`Product retrieved: ${product.name}`);

    return parsedProduct;
}

// Get related products for a given product
async function getRelatedProducts(product) {
    try {
        // Get products from same category
        const relatedQuery = `
            SELECT id, name, slug, base_price, sale_price, on_sale, featured_image, rating_average
            FROM products 
            WHERE category_id = $1 
                AND id != $2 
                AND status = 'active' 
                AND visibility = 'public'
                AND deleted_at IS NULL
            ORDER BY featured DESC, rating_average DESC, orders_count DESC
            LIMIT 8
        `;
        
        const result = await this.db.query(relatedQuery, [product.category_id, product.id], `related:${product.id}`, 300);
        return result.rows.map(p => ({
            ...p,
            effective_price: p.on_sale && p.sale_price ? p.sale_price : p.base_price
        }));
    } catch (error) {
        this.log(`Failed to fetch related products: ${error.message}`, 'warn');
        return [];
    }
}

// Advanced product search with full-text search and filters
async function search(req, data) {
    this.log('Performing advanced product search');
    
    await initializeProductSystem.call(this);

    const query = this.util.sanitizeString(data.query || data.q || '');
    const limit = Math.min(this.util.parseInteger(data.limit, 20), 50);
    const offset = this.util.parseInteger(data.offset, 0);
    
    // Filters
    const category = this.util.sanitizeString(data.category);
    const brand = this.util.sanitizeString(data.brand);
    const minPrice = this.util.parseFloat(data.min_price, 0);
    const maxPrice = this.util.parseFloat(data.max_price, 0);
    const inStock = data.in_stock === 'true';

    if (!query || query.length < 2) {
        throw {
            code: 'INVALID_SEARCH_QUERY',
            message: 'Search query must be at least 2 characters long',
            statusCode: 400
        };
    }

    let sql = `
        SELECT 
            p.id, p.sku, p.name, p.slug, p.short_description, p.brand,
            p.base_price, p.sale_price, p.on_sale, p.featured_image,
            p.rating_average, p.reviews_count, p.available_quantity, p.track_quantity,
            c.name as category_name, c.slug as category_slug,
            ts_rank(
                to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.brand, '') || ' ' || COALESCE(p.meta_keywords, '')), 
                plainto_tsquery('english', $1)
            ) as relevance_score
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.status = 'active' 
            AND p.visibility = 'public'
            AND p.deleted_at IS NULL
            AND to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.brand, '') || ' ' || COALESCE(p.meta_keywords, '')) 
                @@ plainto_tsquery('english', $1)
    `;
    
    const params = [query];
    let paramIndex = 2;

    // Apply filters
    if (category) {
        sql += ` AND c.slug = $${paramIndex}`;
        params.push(category);
        paramIndex++;
    }

    if (brand) {
        sql += ` AND p.brand ILIKE $${paramIndex}`;
        params.push(`%${brand}%`);
        paramIndex++;
    }

    if (minPrice > 0) {
        sql += ` AND (CASE WHEN p.on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.base_price END) >= $${paramIndex}`;
        params.push(minPrice);
        paramIndex++;
    }

    if (maxPrice > 0) {
        sql += ` AND (CASE WHEN p.on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.base_price END) <= $${paramIndex}`;
        params.push(maxPrice);
        paramIndex++;
    }

    if (inStock) {
        sql += ` AND (p.track_quantity = false OR p.available_quantity > 0)`;
    }

    sql += ` ORDER BY relevance_score DESC, p.featured DESC, p.rating_average DESC`;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const cacheKey = `search:${query}:${category || 'all'}:${brand || 'all'}:${minPrice}:${maxPrice}:${inStock}:${limit}:${offset}`;
    const result = await this.db.query(sql, params, cacheKey, 300);

    // Get total count
    let countSQL = `
        SELECT COUNT(*) as total
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.status = 'active' 
            AND p.visibility = 'public'
            AND p.deleted_at IS NULL
            AND to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.brand, '') || ' ' || COALESCE(p.meta_keywords, '')) 
                @@ plainto_tsquery('english', $1)
    `;

    let countParams = [query];
    let countParamIndex = 2;

    if (category) {
        countSQL += ` AND c.slug = ${countParamIndex}`;
        countParams.push(category);
        countParamIndex++;
    }

    if (brand) {
        countSQL += ` AND p.brand ILIKE ${countParamIndex}`;
        countParams.push(`%${brand}%`);
        countParamIndex++;
    }

    if (minPrice > 0) {
        countSQL += ` AND (CASE WHEN p.on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.base_price END) >= ${countParamIndex}`;
        countParams.push(minPrice);
        countParamIndex++;
    }

    if (maxPrice > 0) {
        countSQL += ` AND (CASE WHEN p.on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.base_price END) <= ${countParamIndex}`;
        countParams.push(maxPrice);
        countParamIndex++;
    }

    if (inStock) {
        countSQL += ` AND (p.track_quantity = false OR p.available_quantity > 0)`;
    }

    const countResult = await this.db.query(countSQL, countParams, `${cacheKey}:count`, 300);
    const total = parseInt(countResult.rows[0]?.total || 0);

    this.log(`Search for "${query}" returned ${result.rows.length} results`);

    return {
        query,
        results: result.rows.map(product => ({
            ...product,
            effective_price: product.on_sale && product.sale_price ? product.sale_price : product.base_price,
            discount_percentage: product.on_sale && product.sale_price ? 
                Math.round(((product.base_price - product.sale_price) / product.base_price) * 100) : 0,
            in_stock: product.track_quantity ? product.available_quantity > 0 : true,
            relevance: parseFloat(product.relevance_score || 0)
        })),
        pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total
        },
        filters: {
            category, brand, minPrice, maxPrice, inStock
        },
        fromCache: result.fromCache
    };
}

// Get product categories with hierarchy and product counts
async function getCategories(req, data) {
    this.log('Fetching product categories');
    
    await initializeProductSystem.call(this);

    const includeProductCount = data.include_count === 'true';
    const activeOnly = data.active_only !== 'false'; // Default true
    const parentId = data.parent_id || null;
    const maxLevel = this.util.parseInteger(data.max_level, 0);

    let sql = `
        SELECT 
            c.id, c.name, c.slug, c.description, c.parent_id, c.level, c.path,
            c.image_url, c.banner_url, c.icon_class, c.color_theme,
            c.sort_order, c.is_featured, c.meta_title, c.meta_description,
            c.created_at, c.updated_at
    `;

    if (includeProductCount) {
        sql += `, COUNT(p.id) as product_count`;
    }

    sql += ` FROM product_categories c`;

    if (includeProductCount) {
        sql += ` LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active' AND p.visibility = 'public' AND p.deleted_at IS NULL`;
    }

    sql += ` WHERE 1=1`;

    const params = [];
    let paramIndex = 1;

    if (activeOnly) {
        sql += ` AND c.is_active = true AND c.is_visible = true`;
    }

    if (parentId) {
        sql += ` AND c.parent_id = ${paramIndex}`;
        params.push(parentId);
        paramIndex++;
    } else if (parentId === null && data.parent_id !== undefined) {
        sql += ` AND c.parent_id IS NULL`;
    }

    if (maxLevel > 0) {
        sql += ` AND c.level <= ${paramIndex}`;
        params.push(maxLevel);
        paramIndex++;
    }

    if (includeProductCount) {
        sql += ` GROUP BY c.id, c.name, c.slug, c.description, c.parent_id, c.level, c.path,
                        c.image_url, c.banner_url, c.icon_class, c.color_theme,
                        c.sort_order, c.is_featured, c.meta_title, c.meta_description,
                        c.created_at, c.updated_at`;
    }

    sql += ` ORDER BY c.level, c.sort_order, c.name`;

    const cacheKey = `categories:${includeProductCount ? 'with_count' : 'basic'}:${activeOnly}:${parentId || 'all'}:${maxLevel}`;
    const result = await this.db.query(sql, params, cacheKey, 600);

    // Build hierarchical structure if no parent filter
    let categories = result.rows.map(category => ({
        ...category,
        product_count: includeProductCount ? parseInt(category.product_count || 0) : undefined,
        children: []
    }));

    if (!parentId) {
        categories = this.buildCategoryHierarchy(categories);
    }

    this.log(`Retrieved ${result.rows.length} categories`);

    return {
        categories,
        fromCache: result.fromCache
    };
}

// Build hierarchical category structure
buildCategoryHierarchy(flatCategories) {
    const categoryMap = new Map();
    const rootCategories = [];

    // First pass: create map and identify roots
    flatCategories.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] });
        if (!category.parent_id) {
            rootCategories.push(category.id);
        }
    });

    // Second pass: build hierarchy
    flatCategories.forEach(category => {
        if (category.parent_id && categoryMap.has(category.parent_id)) {
            const parent = categoryMap.get(category.parent_id);
            const child = categoryMap.get(category.id);
            parent.children.push(child);
        }
    });

    // Return root categories with their children
    return rootCategories.map(id => categoryMap.get(id));
}

// Get featured products
async function getFeatured(req, data) {
    this.log('Fetching featured products');
    
    await initializeProductSystem.call(this);

    const limit = Math.min(this.util.parseInteger(data.limit, 12), 50);
    const category = this.util.sanitizeString(data.category);

    let sql = `
        SELECT 
            p.id, p.sku, p.name, p.slug, p.short_description, p.brand,
            p.base_price, p.sale_price, p.on_sale, p.featured_image,
            p.badges, p.rating_average, p.reviews_count,
            c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.featured = true 
            AND p.status = 'active' 
            AND p.visibility = 'public'
            AND p.deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (category) {
        sql += ` AND c.slug = ${paramIndex}`;
        params.push(category);
        paramIndex++;
    }

    sql += ` ORDER BY p.sort_order, p.created_at DESC LIMIT ${paramIndex}`;
    params.push(limit);

    const cacheKey = `featured:${category || 'all'}:${limit}`;
    const result = await this.db.query(sql, params, cacheKey, 600);

    this.log(`Retrieved ${result.rows.length} featured products`);

    return {
        products: result.rows.map(product => ({
            ...product,
            badges: JSON.parse(product.badges || '[]'),
            effective_price: product.on_sale && product.sale_price ? product.sale_price : product.base_price,
            discount_percentage: product.on_sale && product.sale_price ? 
                Math.round(((product.base_price - product.sale_price) / product.base_price) * 100) : 0
        })),
        fromCache: result.fromCache
    };
}

// Get products on sale/deals
async function getDeals(req, data) {
    this.log('Fetching deals and sale products');
    
    await initializeProductSystem.call(this);

    const limit = Math.min(this.util.parseInteger(data.limit, 20), 50);
    const minDiscount = this.util.parseInteger(data.min_discount, 10);

    const sql = `
        SELECT 
            p.id, p.sku, p.name, p.slug, p.short_description, p.brand,
            p.base_price, p.sale_price, p.on_sale, p.featured_image,
            p.badges, p.rating_average, p.reviews_count, p.promotion_text,
            p.sale_end_date,
            c.name as category_name, c.slug as category_slug,
            ROUND(((p.base_price - p.sale_price) / p.base_price) * 100) as discount_percentage
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.on_sale = true 
            AND p.sale_price IS NOT NULL
            AND p.sale_price < p.base_price
            AND p.status = 'active' 
            AND p.visibility = 'public'
            AND p.deleted_at IS NULL
            AND (p.sale_end_date IS NULL OR p.sale_end_date > NOW())
            AND ((p.base_price - p.sale_price) / p.base_price) * 100 >= $1
        ORDER BY discount_percentage DESC, p.featured DESC, p.created_at DESC
        LIMIT $2
    `;

    const cacheKey = `deals:${minDiscount}:${limit}`;
    const result = await this.db.query(sql, [minDiscount, limit], cacheKey, 300);

    this.log(`Retrieved ${result.rows.length} deals`);

    return {
        deals: result.rows.map(product => ({
            ...product,
            badges: JSON.parse(product.badges || '[]'),
            effective_price: product.sale_price,
            savings: product.base_price - product.sale_price,
            discount_percentage: parseInt(product.discount_percentage)
        })),
        fromCache: result.fromCache
    };
}

// Get popular/trending products
async function getPopularProducts(req, data) {
    this.log('Fetching popular products');
    
    await initializeProductSystem.call(this);

    const limit = Math.min(this.util.parseInteger(data.limit, 15), 50);
    const timeframe = this.util.sanitizeString(data.timeframe || '30d'); // 7d, 30d, 90d

    // Calculate date threshold
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[timeframe] || 30;
    
    const sql = `
        SELECT 
            p.id, p.sku, p.name, p.slug, p.short_description, p.brand,
            p.base_price, p.sale_price, p.on_sale, p.featured_image,
            p.badges, p.rating_average, p.reviews_count,
            p.orders_count, p.views_count,
            c.name as category_name, c.slug as category_slug,
            (p.orders_count * 3 + p.views_count * 0.1 + p.rating_average * p.reviews_count * 0.5) as popularity_score
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.status = 'active' 
            AND p.visibility = 'public'
            AND p.deleted_at IS NULL
            AND p.created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY popularity_score DESC, p.orders_count DESC
        LIMIT $1
    `;

    const cacheKey = `popular:${timeframe}:${limit}`;
    const result = await this.db.query(sql, [limit], cacheKey, 600);

    this.log(`Retrieved ${result.rows.length} popular products`);

    return {
        products: result.rows.map(product => ({
            ...product,
            badges: JSON.parse(product.badges || '[]'),
            effective_price: product.on_sale && product.sale_price ? product.sale_price : product.base_price,
            popularity_score: parseFloat(product.popularity_score || 0)
        })),
        timeframe,
        fromCache: result.fromCache
    };
}

// CREATE PRODUCT (Authenticated)
async function create(req, data) {
    this.log('Creating new product');
    
    await initializeProductSystem.call(this);

    // Comprehensive validation
    this.util.validate(data, {
        sku: { required: true, minLength: 1, maxLength: 100 },
        name: { required: true, minLength: 1, maxLength: 300 },
        base_price: { required: true, type: 'number' },
        category_id: { required: true }
    });

    const sku = this.util.sanitizeString(data.sku).toUpperCase();
    const name = this.util.sanitizeString(data.name);
    const slug = data.slug ? this.util.slugify(data.slug) : this.util.slugify(name);

    // Check for duplicates
    const existingSku = await this.db.query('SELECT id FROM products WHERE sku = $1 AND deleted_at IS NULL', [sku]);
    if (existingSku.rows.length > 0) {
        throw {
            code: 'DUPLICATE_SKU',
            message: 'Product with this SKU already exists',
            statusCode: 409
        };
    }

    const existingSlug = await this.db.query('SELECT id FROM products WHERE slug = $1 AND deleted_at IS NULL', [slug]);
    if (existingSlug.rows.length > 0) {
        throw {
            code: 'DUPLICATE_SLUG',
            message: 'Product with this slug already exists',
            statusCode: 409
        };
    }

    // Verify category exists
    const category = await this.db.findById('product_categories', data.category_id);
    if (!category || !category.is_active) {
        throw {
            code: 'INVALID_CATEGORY',
            message: 'Category not found or inactive',
            statusCode: 400
        };
    }

    // Build comprehensive product data
    const productData = {
        sku,
        name,
        slug,
        description: this.util.sanitizeString(data.description),
        short_description: this.util.sanitizeString(data.short_description),
        category_id: data.category_id,
        brand: this.util.sanitizeString(data.brand),
        manufacturer: this.util.sanitizeString(data.manufacturer),
        model: this.util.sanitizeString(data.model),
        barcode: this.util.sanitizeString(data.barcode),
        
        // Pricing
        base_price: this.util.parseFloat(data.base_price),
        sale_price: data.sale_price ? this.util.parseFloat(data.sale_price) : null,
        cost_price: data.cost_price ? this.util.parseFloat(data.cost_price) : null,
        msrp: data.msrp ? this.util.parseFloat(data.msrp) : null,
        currency: this.util.sanitizeString(data.currency || 'USD'),
        
        // Inventory
        track_quantity: data.track_quantity !== false,
        quantity: this.util.parseInteger(data.quantity, 0),
        low_stock_threshold: this.util.parseInteger(data.low_stock_threshold, 10),
        allow_backorders: data.allow_backorders === true,
        
        // Physical attributes
        weight: data.weight ? this.util.parseFloat(data.weight) : null,
        weight_unit: this.util.sanitizeString(data.weight_unit || 'kg'),
        length: data.length ? this.util.parseFloat(data.length) : null,
        width: data.width ? this.util.parseFloat(data.width) : null,
        height: data.height ? this.util.parseFloat(data.height) : null,
        dimension_unit: this.util.sanitizeString(data.dimension_unit || 'cm'),
        
        // Product type and behavior
        product_type: ['simple', 'variable', 'grouped', 'bundle'].includes(data.product_type) ? data.product_type : 'simple',
        is_virtual: data.is_virtual === true,
        is_downloadable: data.is_downloadable === true,
        is_digital: data.is_digital === true,
        requires_shipping: data.requires_shipping !== false,
        is_taxable: data.is_taxable !== false,
        
        // Status and visibility
        status: ['draft', 'active', 'inactive'].includes(data.status) ? data.status : 'draft',
        visibility: ['public', 'private', 'hidden'].includes(data.visibility) ? data.visibility : 'public',
        featured: data.featured === true,
        
        // SEO
        meta_title: this.util.sanitizeString(data.meta_title),
        meta_description: this.util.sanitizeString(data.meta_description),
        meta_keywords: this.util.sanitizeString(data.meta_keywords),
        
        // Media
        featured_image: this.util.sanitizeString(data.featured_image),
        gallery: Array.isArray(data.gallery) ? JSON.stringify(data.gallery) : '[]',
        videos: Array.isArray(data.videos) ? JSON.stringify(data.videos) : '[]',
        documents: Array.isArray(data.documents) ? JSON.stringify(data.documents) : '[]',
        
        // Additional data
        tags: Array.isArray(data.tags) ? JSON.stringify(data.tags) : '[]',
        badges: Array.isArray(data.badges) ? JSON.stringify(data.badges) : '[]',
        attributes: data.attributes ? JSON.stringify(data.attributes) : '{}',
        specifications: data.specifications ? JSON.stringify(data.specifications) : '{}',
        features: Array.isArray(data.features) ? JSON.stringify(data.features) : '[]',
        custom_fields: data.custom_fields ? JSON.stringify(data.custom_fields) : '{}',
        
        // Audit
        created_by: this.context.user.id,
        updated_by: this.context.user.id,
        published_at: data.status === 'active' ? new Date() : null
    };

    const product = await this.db.insert('products', productData);

    // Record stock movement if quantity > 0
    if (productData.track_quantity && productData.quantity > 0) {
        await this.recordStockMovement(product.id, null, 'in', productData.quantity, 0, 'initial_stock');
    }

    // Invalidate caches
    await this.cache.invalidate('products:*');
    await this.cache.invalidate('categories:*');

    this.log(`Product created: ${product.name} (${product.sku})`);

    return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        status: product.status,
        created_at: product.created_at,
        message: 'Product created successfully'
    };
}

// Record stock movement for audit trail
async function recordStockMovement(productId, variantId, movementType, quantity, previousQuantity, reason, referenceType = null, referenceId = null, costPerUnit = null) {
    try {
        const movementData = {
            product_id: productId,
            variant_id: variantId,
            movement_type: movementType,
            quantity: quantity,
            previous_quantity: previousQuantity,
            new_quantity: previousQuantity + (movementType === 'in' ? quantity : -quantity),
            reason: reason,
            reference_type: referenceType,
            reference_id: referenceId,
            cost_per_unit: costPerUnit,
            total_cost: costPerUnit ? costPerUnit * quantity : null,
            created_by: this.context.user?.id || 'system'
        };

        await this.db.insert('stock_movements', movementData);
    } catch (error) {
        this.log(`Failed to record stock movement: ${error.message}`, 'warn');
    }
}

// UPDATE STOCK (Authenticated)
async function updateStock(req, data) {
    this.log('Updating product stock');
    
    await initializeProductSystem.call(this);

    // Validation
    this.util.validate(data, {
        product_id: { required: true },
        quantity: { required: true, type: 'number' },
        operation: { required: false }
    });

    const productId = this.util.sanitizeString(data.product_id);
    const quantity = this.util.parseInteger(data.quantity);
    const operation = this.util.sanitizeString(data.operation || 'set'); // set, add, subtract
    const reason = this.util.sanitizeString(data.reason || 'manual_adjustment');

    if (!['set', 'add', 'subtract'].includes(operation)) {
        throw {
            code: 'INVALID_OPERATION',
            message: 'Operation must be one of: set, add, subtract',
            statusCode: 400
        };
    }

    // Get current product
    const product = await this.db.findById('products', productId);
    if (!product) {
        throw {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found',
            statusCode: 404
        };
    }

    if (!product.track_quantity) {
        throw {
            code: 'INVENTORY_NOT_TRACKED',
            message: 'This product does not track inventory',
            statusCode: 400
        };
    }

    const currentQuantity = product.quantity || 0;
    let newQuantity;

    switch (operation) {
        case 'set':
            newQuantity = quantity;
            break;
        case 'add':
            newQuantity = currentQuantity + quantity;
            break;
        case 'subtract':
            newQuantity = currentQuantity - quantity;
            break;
    }

    if (newQuantity < 0) {
        throw {
            code: 'NEGATIVE_INVENTORY',
            message: 'Inventory cannot be negative',
            statusCode: 400
        };
    }

    // Update product quantity
    const updatedProduct = await this.db.update('products', productId, {
        quantity: newQuantity,
        updated_by: this.context.user.id
    });

    // Record stock movement
    const movementType = newQuantity > currentQuantity ? 'in' : newQuantity < currentQuantity ? 'out' : 'adjustment';
    const movementQuantity = Math.abs(newQuantity - currentQuantity);
    
    if (movementQuantity > 0) {
        await this.recordStockMovement(
            productId, null, movementType, movementQuantity, 
            currentQuantity, reason, 'manual', this.context.requestId
        );
    }

    // Invalidate caches
    await this.cache.invalidate(`product:${productId}`);
    await this.cache.invalidate(`product:${product.slug}`);

    this.log(`Stock updated for ${product.name}: ${currentQuantity} -> ${newQuantity}`);

    return {
        product_id: productId,
        product_name: product.name,
        previous_quantity: currentQuantity,
        new_quantity: newQuantity,
        operation,
        reason,
        low_stock: newQuantity <= product.low_stock_threshold,
        out_of_stock: newQuantity <= 0,
        updated_at: updatedProduct.updated_at
    };
}

// Health check for products module
async function health(req, data) {
    try {
        await initializeProductSystem.call(this);

        // Test basic operations
        const productCount = await this.db.query('SELECT COUNT(*) as count FROM products WHERE status = $1', ['active']);
        const categoryCount = await this.db.query('SELECT COUNT(*) as count FROM product_categories WHERE is_active = $1', [true]);
        
        // Test search functionality
        const searchTest = await this.db.query(
            "SELECT COUNT(*) as count FROM products WHERE to_tsvector('english', name) @@ plainto_tsquery('english', 'test')",
            []
        );

        return {
            module: 'products',
            status: 'healthy',
            database: {
                connected: true,
                active_products: parseInt(productCount.rows[0]?.count || 0),
                active_categories: parseInt(categoryCount.rows[0]?.count || 0),
                search_enabled: true
            },
            features: {
                full_text_search: true,
                inventory_tracking: true,
                variant_support: true,
                analytics: true
            },
            timestamp: this.util.getCurrentTimestamp(),
            version: '2.0.0'
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
    
    // Public browsing
    browse,
    getProduct,
    search,
    getCategories,
    getFeatured,
    getDeals,
    getPopularProducts,
    
    // Product management (authenticated)
    create,
    updateStock,
    
    // Health and utilities
    health
};