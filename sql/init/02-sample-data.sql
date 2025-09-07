-- Chat 3 Sample Data
-- Comprehensive sample data for demo and testing

-- Insert sample categories with hierarchy
INSERT INTO product_categories (name, slug, description, image_url, sort_order, is_featured, created_by, updated_by) VALUES
('Electronics', 'electronics', 'Electronic devices, gadgets, and technology products', 'https://example.com/images/categories/electronics.jpg', 1, true, 'system', 'system'),
('Computers', 'computers', 'Desktop computers, laptops, and computer accessories', 'https://example.com/images/categories/computers.jpg', 2, true, 'system', 'system'),
('Mobile Devices', 'mobile-devices', 'Smartphones, tablets, and mobile accessories', 'https://example.com/images/categories/mobile.jpg', 3, true, 'system', 'system'),
('Clothing & Fashion', 'clothing-fashion', 'Apparel, shoes, and fashion accessories', 'https://example.com/images/categories/clothing.jpg', 4, true, 'system', 'system'),
('Books & Media', 'books-media', 'Books, ebooks, audiobooks, and digital media', 'https://example.com/images/categories/books.jpg', 5, false, 'system', 'system'),
('Home & Garden', 'home-garden', 'Home improvement, furniture, and garden supplies', 'https://example.com/images/categories/home.jpg', 6, false, 'system', 'system'),
('Sports & Outdoors', 'sports-outdoors', 'Sports equipment, outdoor gear, and fitness products', 'https://example.com/images/categories/sports.jpg', 7, false, 'system', 'system'),
('Health & Beauty', 'health-beauty', 'Health products, cosmetics, and personal care', 'https://example.com/images/categories/health.jpg', 8, false, 'system', 'system'),
('Toys & Games', 'toys-games', 'Toys, board games, video games, and entertainment', 'https://example.com/images/categories/toys.jpg', 9, false, 'system', 'system'),
('Automotive', 'automotive', 'Car accessories, tools, and automotive supplies', 'https://example.com/images/categories/automotive.jpg', 10, false, 'system', 'system');

-- Get category IDs for product insertion
DO $$
DECLARE
    electronics_id UUID;
    computers_id UUID;
    mobile_id UUID;
    clothing_id UUID;
    books_id UUID;
    home_id UUID;
    sports_id UUID;
    health_id UUID;
    toys_id UUID;
    automotive_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO electronics_id FROM product_categories WHERE slug = 'electronics';
    SELECT id INTO computers_id FROM product_categories WHERE slug = 'computers';
    SELECT id INTO mobile_id FROM product_categories WHERE slug = 'mobile-devices';
    SELECT id INTO clothing_id FROM product_categories WHERE slug = 'clothing-fashion';
    SELECT id INTO books_id FROM product_categories WHERE slug = 'books-media';
    SELECT id INTO home_id FROM product_categories WHERE slug = 'home-garden';
    SELECT id INTO sports_id FROM product_categories WHERE slug = 'sports-outdoors';
    SELECT id INTO health_id FROM product_categories WHERE slug = 'health-beauty';
    SELECT id INTO toys_id FROM product_categories WHERE slug = 'toys-games';
    SELECT id INTO automotive_id FROM product_categories WHERE slug = 'automotive';

    -- Insert comprehensive sample products
    INSERT INTO products (
        sku, name, slug, description, short_description, category_id, brand, 
        price, compare_at_price, cost_price, stock_quantity, low_stock_threshold,
        weight, dimensions, tags, images, status, is_featured, rating_average, rating_count,
        attributes, specifications, created_by, updated_by
    ) VALUES
    
    -- Electronics & Computers
    (
        'LAPTOP-PRO-001', 
        'Professional Laptop 15" Intel i7', 
        'professional-laptop-15-intel-i7',
        'High-performance laptop designed for professionals and developers. Features latest Intel i7 processor, 16GB RAM, 512GB SSD, and dedicated graphics card. Perfect for demanding applications, software development, and creative work.',
        'Powerful laptop with Intel i7, 16GB RAM, 512GB SSD',
        computers_id,
        'TechPro',
        1299.99, 1499.99, 950.00, 25, 5,
        2.1, '{"length": 35.5, "width": 24.0, "height": 1.8, "unit": "cm"}',
        '["laptop", "computer", "professional", "intel-i7", "work", "programming"]',
        '["laptop-pro-1.jpg", "laptop-pro-2.jpg", "laptop-pro-3.jpg"]',
        'active', true, 4.5, 127,
        '{"processor": "Intel i7-12700H", "ram": "16GB DDR4", "storage": "512GB NVMe SSD", "graphics": "NVIDIA RTX 3060", "display": "15.6 inch 4K", "os": "Windows 11 Pro"}',
        '{"cpu": {"brand": "Intel", "model": "i7-12700H", "cores": 12, "threads": 20, "base_clock": "2.3 GHz", "boost_clock": "4.7 GHz"}, "memory": {"size": "16GB", "type": "DDR4", "speed": "3200 MHz"}, "storage": {"type": "NVMe SSD", "capacity": "512GB", "speed": "7000 MB/s"}}',
        'system', 'system'
    ),
    
    (
        'PHONE-PRO-001',
        'Smartphone Pro Max 256GB',
        'smartphone-pro-max-256gb',
        'Latest flagship smartphone with professional-grade cameras, all-day battery life, and premium build quality. Features advanced AI photography, 5G connectivity, and industry-leading performance.',
        'Flagship smartphone with pro cameras and 5G',
        mobile_id,
        'MobileTech',
        899.99, 999.99, 650.00, 50, 10,
        0.238, '{"length": 16.08, "width": 7.81, "height": 0.78, "unit": "cm"}',
        '["smartphone", "mobile", "5g", "pro-camera", "flagship"]',
        '["phone-pro-1.jpg", "phone-pro-2.jpg", "phone-pro-3.jpg", "phone-pro-4.jpg"]',
        'active', true, 4.7, 89,
        '{"storage": "256GB", "color": "Space Black", "network": "5G", "camera": "48MP Triple Camera", "display": "6.7 inch OLED", "battery": "4500mAh"}',
        '{"display": {"size": "6.7 inch", "type": "OLED", "resolution": "2778x1284", "refresh_rate": "120Hz"}, "camera": {"main": "48MP", "ultra_wide": "12MP", "telephoto": "12MP", "features": ["Night Mode", "Portrait", "4K Video"]}, "battery": {"capacity": "4500mAh", "charging": "25W Fast Charging", "wireless": "15W Wireless"}}',
        'system', 'system'
    ),
    
    -- Clothing & Fashion
    (
        'SHIRT-COTTON-001',
        'Premium Cotton Business Shirt',
        'premium-cotton-business-shirt',
        'Classic business shirt made from 100% premium cotton. Perfect for office wear, business meetings, and formal occasions. Features wrinkle-resistant fabric and tailored fit.',
        'Classic cotton business shirt with tailored fit',
        clothing_id,
        'FashionFirst',
        79.99, 99.99, 35.00, 150, 20,
        0.3, '{"size_chart": "available", "care": "machine_washable"}',
        '["shirt", "cotton", "business", "formal", "office", "classic"]',
        '["shirt-cotton-1.jpg", "shirt-cotton-2.jpg", "shirt-cotton-3.jpg"]',
        'active', false, 4.2, 156,
        '{"material": "100% Cotton", "fit": "Tailored", "collar": "Spread", "cuffs": "Button", "care": "Machine Washable", "sizes": ["S", "M", "L", "XL", "XXL"]}',
        '{"fabric": {"material": "100% Cotton", "weight": "120gsm", "treatment": "Wrinkle Resistant"}, "construction": {"stitching": "Double Needle", "buttons": "Mother of Pearl", "reinforcement": "Stress Points"}}',
        'system', 'system'
    ),
    
    (
        'SHOES-SPORT-001',
        'Athletic Running Shoes',
        'athletic-running-shoes',
        'Professional-grade running shoes designed for comfort and performance. Features advanced cushioning technology, breathable mesh upper, and durable rubber outsole.',
        'Professional running shoes with advanced cushioning',
        clothing_id,
        'SportMax',
        129.99, 159.99, 65.00, 75, 15,
        0.8, '{"sizing": "US Standard", "width": "Medium"}',
        '["shoes", "running", "athletic", "sports", "comfortable", "breathable"]',
        '["shoes-sport-1.jpg", "shoes-sport-2.jpg", "shoes-sport-3.jpg"]',
        'active', true, 4.6, 203,
        '{"type": "Running", "gender": "Unisex", "upper": "Mesh", "sole": "Rubber", "cushioning": "Advanced Foam", "sizes": ["US 6-13"]}',
        '{"upper": {"material": "Engineered Mesh", "features": ["Breathable", "Lightweight"]}, "midsole": {"technology": "Advanced Foam", "drop": "10mm"}, "outsole": {"material": "Carbon Rubber", "pattern": "Multi-directional"}}',
        'system', 'system'
    ),
    
    -- Books & Media
    (
        'BOOK-JS-001',
        'JavaScript: The Complete Developer Guide 2024',
        'javascript-complete-developer-guide-2024',
        'Comprehensive guide to modern JavaScript development. Covers ES6+, async programming, frameworks, testing, and best practices. Perfect for beginners and experienced developers.',
        'Complete JavaScript guide with modern practices',
        books_id,
        'TechPublishing',
        49.99, 59.99, 12.00, 200, 25,
        0.6, '{"pages": 850, "format": "Paperback + Digital"}',
        '["javascript", "programming", "web-development", "guide", "es6", "tutorial"]',
        '["book-js-1.jpg", "book-js-2.jpg"]',
        'active', true, 4.8, 345,
        '{"format": "Paperback + eBook", "pages": 850, "language": "English", "edition": "2024", "isbn": "978-1234567890", "level": "Beginner to Advanced"}',
        '{"content": {"chapters": 25, "exercises": 200, "projects": 15}, "extras": {"online_resources": true, "video_tutorials": true, "code_repository": true}}',
        'system', 'system'
    ),
    
    (
        'EBOOK-DESIGN-001',
        'UI/UX Design Principles (Digital)',
        'ui-ux-design-principles-digital',
        'Digital guide to user interface and user experience design. Learn design thinking, prototyping, user research, and modern design tools. Includes practical exercises and case studies.',
        'Digital UI/UX design guide with practical exercises',
        books_id,
        'DesignPro',
        29.99, 39.99, 5.00, 0, 0,
        0.0, '{"format": "Digital Download"}',
        '["design", "ui", "ux", "digital", "guide", "principles", "ebook"]',
        '["ebook-design-1.jpg"]',
        'active', false, 4.4, 78,
        '{"format": "PDF + EPUB", "pages": 320, "language": "English", "download": "Instant", "compatibility": "All Devices", "updates": "Free Updates"}',
        '{"content": {"chapters": 15, "case_studies": 12, "templates": 25}, "resources": {"figma_templates": true, "sketch_files": true, "video_walkthroughs": true}}',
        'system', 'system'
    ),
    
    -- Home & Garden
    (
        'CHAIR-OFFICE-001',
        'Ergonomic Office Chair Pro',
        'ergonomic-office-chair-pro',
        'Professional ergonomic office chair designed for all-day comfort. Features lumbar support, adjustable height, breathable mesh back, and premium cushioning.',
        'Professional ergonomic chair with lumbar support',
        home_id,
        'OfficeComfort',
        349.99, 449.99, 180.00, 30, 5,
        18.5, '{"length": 68, "width": 68, "height": 120, "unit": "cm"}',
        '["chair", "office", "ergonomic", "comfortable", "adjustable", "professional"]',
        '["chair-office-1.jpg", "chair-office-2.jpg", "chair-office-3.jpg"]',
        'active', true, 4.3, 167,
        '{"material": "Mesh + Foam", "adjustments": "Height, Lumbar, Armrests", "weight_capacity": "150kg", "warranty": "5 Years", "assembly": "Required"}',
        '{"seat": {"material": "High-density Foam", "width": "50cm", "depth": "48cm"}, "back": {"material": "Breathable Mesh", "lumbar_support": "Adjustable"}, "base": {"material": "Aluminum", "wheels": "Carpet Casters"}}',
        'system', 'system'
    ),
    
    (
        'LAMP-DESK-001',
        'LED Desk Lamp with Wireless Charging',
        'led-desk-lamp-wireless-charging',
        'Modern LED desk lamp with built-in wireless charging pad. Features adjustable brightness, color temperature control, and USB charging port.',
        'LED desk lamp with wireless charging and USB port',
        home_id,
        'LightTech',
        89.99, 119.99, 45.00, 60, 10,
        1.2, '{"height": "45cm", "base": "20cm", "arm": "adjustable"}',
        '["lamp", "led", "desk", "wireless-charging", "adjustable", "modern"]',
        '["lamp-desk-1.jpg", "lamp-desk-2.jpg"]',
        'active', false, 4.1, 92,
        '{"lighting": "LED", "brightness": "Dimmable", "color_temp": "3000K-6000K", "charging": "Qi Wireless + USB", "power": "12W", "controls": "Touch"}',
        '{"led": {"lumens": 1200, "lifespan": "50000 hours", "efficiency": "100 lm/W"}, "charging": {"wireless": "10W Qi", "usb": "5V 2A"}, "materials": {"base": "Aluminum", "arm": "ABS Plastic"}}',
        'system', 'system'
    ),
    
    -- Sports & Outdoors
    (
        'BIKE-MOUNTAIN-001',
        'Mountain Bike Pro 27.5"',
        'mountain-bike-pro-27-5',
        'Professional mountain bike designed for serious trail riders. Features aluminum frame, 21-speed transmission, front suspension, and all-terrain tires.',
        'Professional mountain bike with 21-speed and suspension',
        sports_id,
        'BikeMax',
        599.99, 799.99, 320.00, 15, 3,
        14.5, '{"wheel_size": "27.5 inch", "frame_size": "M/L/XL"}',
        '["bike", "mountain", "cycling", "outdoor", "sports", "trail", "21-speed"]',
        '["bike-mountain-1.jpg", "bike-mountain-2.jpg", "bike-mountain-3.jpg"]',
        'active', true, 4.5, 134,
        '{"frame": "Aluminum", "gears": "21 Speed", "brakes": "Disc", "suspension": "Front", "wheel_size": "27.5 inch", "max_weight": "120kg"}',
        '{"frame": {"material": "6061 Aluminum", "geometry": "Trail", "sizes": ["M", "L", "XL"]}, "drivetrain": {"speeds": 21, "shifters": "Shimano", "cassette": "7-speed"}, "brakes": {"type": "Mechanical Disc", "rotor_size": "160mm"}}',
        'system', 'system'
    ),
    
    (
        'TENT-CAMP-001',
        'Waterproof Camping Tent 4-Person',
        'waterproof-camping-tent-4-person',
        '4-person waterproof camping tent perfect for family camping trips. Features easy setup, weather resistance, and spacious interior with vestibule.',
        'Waterproof 4-person tent with easy setup',
        sports_id,
        'OutdoorGear',
        159.99, 199.99, 85.00, 25, 5,
        4.8, '{"packed": "60x20x20cm", "setup": "240x210x130cm"}',
        '["tent", "camping", "waterproof", "4-person", "outdoor", "family", "hiking"]',
        '["tent-camp-1.jpg", "tent-camp-2.jpg", "tent-camp-3.jpg"]',
        'active', false, 4.2, 187,
        '{"capacity": "4 Person", "seasons": "3 Season", "waterproof": "3000mm", "setup_time": "10 minutes", "weight": "4.8kg", "packed_size": "60x20x20cm"}',
        '{"fabric": {"fly": "75D Polyester", "floor": "150D Oxford", "waterproof_rating": "3000mm"}, "poles": {"material": "Fiberglass", "shock_corded": true}, "features": ["Color-coded Setup", "Gear Loft", "Vestibule"]}',
        'system', 'system'
    ),
    
    -- Health & Beauty
    (
        'SERUM-VITAMIN-001',
        'Vitamin C Brightening Serum',
        'vitamin-c-brightening-serum',
        'Premium vitamin C serum for bright, healthy-looking skin. Features 20% L-Ascorbic Acid, hyaluronic acid, and vitamin E for maximum effectiveness.',
        'Premium 20% Vitamin C serum for brightening',
        health_id,
        'SkinCare Pro',
        39.99, 59.99, 18.00, 100, 20,
        0.15, '{"volume": "30ml", "packaging": "Dark Glass Bottle"}',
        '["skincare", "vitamin-c", "serum", "brightening", "anti-aging", "premium"]',
        '["serum-vitamin-1.jpg", "serum-vitamin-2.jpg"]',
        'active', true, 4.6, 298,
        '{"vitamin_c": "20%", "volume": "30ml", "ph": "3.5", "shelf_life": "24 months", "skin_type": "All Types", "cruelty_free": true}',
        '{"active_ingredients": {"l_ascorbic_acid": "20%", "hyaluronic_acid": "1%", "vitamin_e": "0.5%"}, "benefits": ["Brightening", "Anti-aging", "Antioxidant Protection"], "usage": "Morning and Evening"}',
        'system', 'system'
    ),
    
    -- Toys & Games
    (
        'PUZZLE-1000-001',
        '1000 Piece Jigsaw Puzzle - Landscape',
        '1000-piece-jigsaw-puzzle-landscape',
        'Beautiful 1000-piece jigsaw puzzle featuring stunning landscape photography. High-quality pieces with precise fit and vibrant colors.',
        'Beautiful 1000-piece landscape jigsaw puzzle',
        toys_id,
        'PuzzleMaster',
        24.99, 34.99, 8.00, 40, 10,
        0.8, '{"finished_size": "70x50cm", "piece_size": "varied"}',
        '["puzzle", "jigsaw", "1000-piece", "landscape", "family", "hobby"]',
        '["puzzle-1000-1.jpg", "puzzle-1000-2.jpg"]',
        'active', false, 4.3, 145,
        '{"pieces": 1000, "finished_size": "70x50cm", "age": "12+", "difficulty": "Medium", "material": "Recycled Cardboard", "poster_included": true}',
        '{"pieces": {"material": "Recycled Cardboard", "thickness": "2mm", "finish": "Linen"}, "image": {"type": "Photography", "quality": "High Resolution", "subject": "Mountain Landscape"}}',
        'system', 'system'
    ),
    
    -- Automotive
    (
        'CHARGER-CAR-001',
        'Fast Car Phone Charger 25W',
        'fast-car-phone-charger-25w',
        'High-speed 25W car charger with USB-C and USB-A ports. Features intelligent charging technology and universal compatibility.',
        'Fast 25W car charger with dual ports',
        automotive_id,
        'ChargeMax',
        19.99, 29.99, 8.50, 80, 15,
        0.12, '{"length": "8cm", "width": "3cm", "cable": "1.5m"}',
        '["charger", "car", "fast-charging", "usb-c", "usb-a", "25w", "auto"]',
        '["charger-car-1.jpg", "charger-car-2.jpg"]',
        'active', false, 4.4, 267,
        '{"power": "25W", "ports": "USB-C + USB-A", "voltage": "12V/24V", "cable_length": "1.5m", "compatibility": "Universal", "warranty": "2 Years"}',
        '{"charging": {"usb_c": "25W PD", "usb_a": "18W QC3.0", "total": "43W"}, "protection": ["Over Current", "Over Voltage", "Short Circuit"], "materials": {"housing": "ABS Plastic", "contacts": "Gold Plated"}}',
        'system', 'system'
    );
    
END $;

-- Insert sample users with different roles
INSERT INTO api_users (
    email, username, password_hash, first_name, last_name, phone, bio,
    roles, permissions, status, email_verified, 
    created_by, updated_by
) VALUES
(
    'admin@example.com', 'admin', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKuN7S6Y.xJw2CW', -- password123
    'System', 'Administrator', '+1234567890',
    'System administrator with full access to all features and settings.',
    '["admin", "user"]', 
    '["read", "write", "delete", "admin", "manage_users", "manage_products"]',
    'active', true,
    'system', 'system'
),
(
    'demo@example.com', 'demouser',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKuN7S6Y.xJw2CW', -- password123
    'Demo', 'User', '+1234567891',
    'Demo user account for testing and demonstration purposes.',
    '["user"]',
    '["read", "write"]',
    'active', true,
    'system', 'system'
),
(
    'manager@example.com', 'manager',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKuN7S6Y.xJw2CW', -- password123
    'Product', 'Manager', '+1234567892',
    'Product manager responsible for catalog management and inventory.',
    '["manager", "user"]',
    '["read", "write", "manage_products", "manage_inventory"]',
    'active', true,
    'system', 'system'
),
(
    'customer@example.com', 'customer',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKuN7S6Y.xJw2CW', -- password123
    'Regular', 'Customer', '+1234567893',
    'Regular customer account for shopping and orders.',
    '["user"]',
    '["read"]',
    'active', true,
    'system', 'system'
);

-- Create some API keys for testing
DO $
DECLARE
    admin_user_id UUID;
    demo_user_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO admin_user_id FROM api_users WHERE username = 'admin';
    SELECT id INTO demo_user_id FROM api_users WHERE username = 'demouser';
    
    -- Insert API keys
    INSERT INTO api_keys (
        user_id, name, key_hash, key_prefix, permissions, rate_limit, quota_limit,
        expires_at, created_by
    ) VALUES
    (
        admin_user_id, 'Admin Development Key',
        '$2b$12 || encode(digest('ak_admin_dev_12345', 'sha256'), 'hex'),
        'ak_admin_dev',
        '["read", "write", "delete", "admin"]',
        10000, 100000,
        NOW() + INTERVAL '1 year',
        'system'
    ),
    (
        demo_user_id, 'Demo API Key',
        '$2b$12 || encode(digest('ak_demo_test_67890', 'sha256'), 'hex'),
        'ak_demo_test',
        '["read", "write"]',
        1000, 10000,
        NOW() + INTERVAL '6 months',
        'system'
    );
END $;

-- Update some products to have sales
UPDATE products SET 
    on_sale = true,
    sale_price = price * 0.8,
    sale_start_date = NOW() - INTERVAL '1 day',
    sale_end_date = NOW() + INTERVAL '30 days'
WHERE sku IN ('SHIRT-COTTON-001', 'SHOES-SPORT-001', 'LAMP-DESK-001', 'SERUM-VITAMIN-001');

-- Add some view counts and ratings to make data more realistic
UPDATE products SET 
    view_count = floor(random() * 1000 + 100),
    purchase_count = floor(random() * 50 + 5),
    cart_add_count = floor(random() * 200 + 20),
    wishlist_count = floor(random() * 100 + 10)
WHERE status = 'active';

-- Insert some sample log entries for demonstration
INSERT INTO api_logs (level, message, module, method, user_id, ip_address, response_time, context) VALUES
('info', 'User registration completed successfully', 'users', 'register', null, '192.168.1.100', 250, '{"email": "demo@example.com"}'),
('info', 'Product search performed', 'products', 'searchProducts', 'demo', '192.168.1.100', 45, '{"query": "laptop", "results": 5}'),
('warn', 'Rate limit approaching for user', 'middleware', 'rateLimit', 'demo', '192.168.1.100', 12, '{"current": 85, "limit": 100}'),
('info', 'Product created successfully', 'products', 'createProduct', 'admin', '192.168.1.101', 180, '{"product_id": "new-product-123"}'),
('error', 'Database connection timeout', 'database', 'query', null, '192.168.1.102', 5000, '{"error": "connection timeout", "query": "SELECT * FROM products"}');

-- Create some materialized views for performance (optional)
CREATE MATERIALIZED VIEW IF NOT EXISTS product_stats AS
SELECT 
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE status = 'active') as active_products,
    COUNT(*) FILTER (WHERE is_featured = true) as featured_products,
    COUNT(*) FILTER (WHERE on_sale = true) as products_on_sale,
    COUNT(*) FILTER (WHERE stock_quantity <= low_stock_threshold AND track_inventory = true) as low_stock_products,
    COUNT(*) FILTER (WHERE stock_quantity = 0 AND track_inventory = true) as out_of_stock_products,
    AVG(price) as average_price,
    AVG(rating_average) FILTER (WHERE rating_count > 0) as average_rating,
    SUM(stock_quantity) FILTER (WHERE track_inventory = true) as total_inventory_units
FROM products
WHERE deleted_at IS NULL;

CREATE MATERIALIZED VIEW IF NOT EXISTS category_stats AS
SELECT 
    c.id,
    c.name,
    c.slug,
    COUNT(p.id) as product_count,
    COUNT(p.id) FILTER (WHERE p.status = 'active') as active_product_count,
    AVG(p.price) FILTER (WHERE p.status = 'active') as avg_price,
    MIN(p.price) FILTER (WHERE p.status = 'active') as min_price,
    MAX(p.price) FILTER (WHERE p.status = 'active') as max_price
FROM product_categories c
LEFT JOIN products p ON c.id = p.category_id AND p.deleted_at IS NULL
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug;

-- Grant permissions on materialized views
GRANT SELECT ON product_stats TO api_user;
GRANT SELECT ON category_stats TO api_user;

-- Create indexes on materialized views
CREATE INDEX IF NOT EXISTS idx_category_stats_slug ON category_stats(slug);
CREATE INDEX IF NOT EXISTS idx_category_stats_count ON category_stats(product_count DESC);

-- Refresh materialized views
REFRESH MATERIALIZED VIEW product_stats;
REFRESH MATERIALIZED VIEW category_stats;

-- Final data validation and statistics
DO $
DECLARE
    product_count INTEGER;
    user_count INTEGER;
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products WHERE status = 'active';
    SELECT COUNT(*) INTO user_count FROM api_users WHERE status = 'active';
    SELECT COUNT(*) INTO category_count FROM product_categories WHERE is_active = true;
    
    RAISE NOTICE 'Sample data insertion completed:';
    RAISE NOTICE '- Products: %', product_count;
    RAISE NOTICE '- Users: %', user_count;  
    RAISE NOTICE '- Categories: %', category_count;
    RAISE NOTICE 'Database is ready for Chat 3 API Framework!';
END $;