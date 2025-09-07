#!/bin/bash

# Chat 3 API Framework - Complete Stack Startup Script
# This script initializes and starts the entire Docker infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="chat3-api"
ENV_FILE=".env"

echo -e "${BLUE}🚀 Starting Chat 3 API Framework${NC}"
echo "======================================"

# Function to print colored messages
print_message() {
    echo -e "${2}${1}${NC}"
}

print_step() {
    echo -e "\n${BLUE}➤ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ ${1}${NC}"
    exit 1
}

# Check if Docker is running
check_docker() {
    print_step "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    print_success "Docker is ready"
}

# Check if environment file exists
check_environment() {
    print_step "Checking environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        print_warning ".env file not found. Creating from template..."
        
        if [ -f "config/production.env" ]; then
            cp config/production.env .env
            print_success "Created .env from template"
            print_warning "Please review and customize .env file before proceeding"
            exit 0
        else
            print_error "No environment template found. Please create .env file manually."
        fi
    else
        print_success "Environment configuration found"
    fi
}

# Create necessary directories
create_directories() {
    print_step "Creating necessary directories..."
    
    directories=(
        "logs/nginx"
        "logs/node-1"
        "logs/node-2"
        "logs/postgres"
        "logs/redis-1"
        "logs/redis-2"
        "uploads"
        "sql/backups"
        "nginx/ssl"
        "nginx/error-pages"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        echo "  Created: $dir"
    done
    
    print_success "Directories created"
}

# Create nginx error pages
create_error_pages() {
    print_step "Creating nginx error pages..."
    
    # Create 404 error page
    cat > nginx/error-pages/404.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>404 - Page Not Found</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #333; }
        p { color: #666; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; }
    </style>
</head>
<body>
    <div class="logo">Chat 3 API Framework</div>
    <h1>404 - Page Not Found</h1>
    <p>The page you are looking for could not be found.</p>
    <p><a href="/">Return to API Documentation</a></p>
</body>
</html>
EOF

    # Create 50x error page
    cat > nginx/error-pages/50x.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Service Temporarily Unavailable</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #dc3545; }
        p { color: #666; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; }
    </style>
</head>
<body>
    <div class="logo">Chat 3 API Framework</div>
    <h1>Service Temporarily Unavailable</h1>
    <p>We're experiencing technical difficulties. Please try again later.</p>
    <p>If the problem persists, please contact support.</p>
</body>
</html>
EOF

    print_success "Error pages created"
}

# Build Docker images
build_images() {
    print_step "Building Docker images..."
    
    docker-compose -p "$PROJECT_NAME" build --parallel
    
    print_success "Docker images built"
}

# Start the infrastructure
start_infrastructure() {
    print_step "Starting infrastructure services..."
    
    # Start PostgreSQL and Redis first
    docker-compose -p "$PROJECT_NAME" up -d postgres redis-1 redis-2
    
    print_step "Waiting for database to be ready..."
    
    # Wait for PostgreSQL to be ready
    timeout=60
    while ! docker-compose -p "$PROJECT_NAME" exec -T postgres pg_isready -U api_user -d api_framework; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            print_error "Database failed to start within timeout"
        fi
        echo -n "."
    done
    
    print_success "Database is ready"
    
    # Wait for Redis to be ready
    print_step "Waiting for Redis to be ready..."
    timeout=30
    while ! docker-compose -p "$PROJECT_NAME" exec -T redis-1 redis-cli ping; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            print_error "Redis failed to start within timeout"
        fi
        echo -n "."
    done
    
    print_success "Redis is ready"
}

# Start application services
start_application() {
    print_step "Starting application services..."
    
    # Start Node.js instances
    docker-compose -p "$PROJECT_NAME" up -d api-node-1 api-node-2
    
    print_step "Waiting for API services to be ready..."
    
    # Wait for API services to be healthy
    timeout=120
    while true; do
        if docker-compose -p "$PROJECT_NAME" ps api-node-1 | grep -q "healthy" && \
           docker-compose -p "$PROJECT_NAME" ps api-node-2 | grep -q "healthy"; then
            break
        fi
        sleep 3
        timeout=$((timeout - 3))
        if [ $timeout -le 0 ]; then
            print_error "API services failed to start within timeout"
        fi
        echo -n "."
    done
    
    print_success "API services are ready"
}

# Start load balancer
start_load_balancer() {
    print_step "Starting load balancer..."
    
    docker-compose -p "$PROJECT_NAME" up -d nginx
    
    print_step "Waiting for load balancer to be ready..."
    
    timeout=30
    while ! curl -f http://localhost/health &> /dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            print_error "Load balancer failed to start within timeout"
        fi
        echo -n "."
    done
    
    print_success "Load balancer is ready"
}

# Start monitoring services
start_monitoring() {
    print_step "Starting monitoring services..."
    
    docker-compose -p "$PROJECT_NAME" up -d adminer redis-commander
    
    print_success "Monitoring services started"
}

# Display status and URLs
show_status() {
    print_step "Checking service status..."
    
    echo ""
    docker-compose -p "$PROJECT_NAME" ps
    
    echo ""
    print_success "🎉 Chat 3 API Framework is now running!"
    echo ""
    echo "📋 Service URLs:"
    echo "  🌐 API Endpoint:        http://localhost/api"
    echo "  🏥 Health Check:       http://localhost/health"
    echo "  📊 API Info:           http://localhost/api/info"
    echo "  📈 Metrics:            http://localhost/metrics"
    echo ""
    echo "🔧 Management Tools:"
    echo "  🗄️  Database Admin:     http://localhost:8080"
    echo "  🔴 Redis Commander:    http://localhost:8081"
    echo ""
    echo "🧪 API Testing:"
    echo "  📚 Users API:          http://localhost/api/v1/users"
    echo "  🛍️  Products API:       http://localhost/api/v1/products"
    echo "  🎯 Demo API:           http://localhost/api/v1/demo"
    echo ""
    echo "📖 Quick Commands:"
    echo "  View logs:             docker-compose -p $PROJECT_NAME logs -f"
    echo "  Stop services:         docker-compose -p $PROJECT_NAME down"
    echo "  Restart services:      docker-compose -p $PROJECT_NAME restart"
    echo "  Scale API nodes:       docker-compose -p $PROJECT_NAME up -d --scale api-node-1=2"
    echo ""
    print_warning "Default credentials:"
    echo "  Admin: admin@example.com / password123"
    echo "  Demo:  demo@example.com / password123"
    echo ""
}

# Test the API
test_api() {
    print_step "Testing API endpoints..."
    
    echo "Testing health endpoint..."
    if curl -s http://localhost/health | grep -q "healthy"; then
        print_success "Health check passed"
    else
        print_warning "Health check failed"
    fi
    
    echo "Testing API info endpoint..."
    if curl -s http://localhost/api/info | grep -q "Chat 2"; then
        print_success "API info endpoint working"
    else
        print_warning "API info endpoint failed"
    fi
    
    echo "Testing products endpoint..."
    if curl -s http://localhost/api/v1/products/getProducts | grep -q "products"; then
        print_success "Products API working"
    else
        print_warning "Products API failed"
    fi
}

# Cleanup function
cleanup() {
    print_step "Cleaning up..."
    docker-compose -p "$PROJECT_NAME" down --remove-orphans
    print_success "Cleanup completed"
}

# Main execution
main() {
    # Handle script arguments
    case "${1:-}" in
        "stop")
            cleanup
            exit 0
            ;;
        "restart")
            cleanup
            ;;
        "test")
            test_api
            exit 0
            ;;
        "status")
            docker-compose -p "$PROJECT_NAME" ps
            exit 0
            ;;
        "logs")
            docker-compose -p "$PROJECT_NAME" logs -f
            exit 0
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start     Start the complete stack (default)"
            echo "  stop      Stop all services"
            echo "  restart   Restart all services"
            echo "  test      Test API endpoints"
            echo "  status    Show service status"
            echo "  logs      Show service logs"
            echo "  help      Show this help message"
            echo ""
            exit 0
            ;;
    esac
    
    # Check prerequisites
    check_docker
    check_environment
    
    # Setup
    create_directories
    create_error_pages
    
    # Build and start services
    build_images
    start_infrastructure
    start_application
    start_load_balancer
    start_monitoring
    
    # Show results
    show_status
    test_api
    
    print_success "Setup completed successfully! 🎉"
}

# Trap to cleanup on script exit
trap 'print_error "Setup interrupted"' INT TERM

# Run main function
main "$@"