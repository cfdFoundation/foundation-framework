@echo off
setlocal enabledelayedexpansion
title Chat 3 API Framework Startup

:: Configuration
set PROJECT_NAME=chat3-api
set REQUIRED_PORTS=80 5432 6379 6380 8080 8081

:: Color codes for better output
:: Note: Windows batch doesn't have built-in colors, but we'll use echo for structure

echo.
echo =========================================
echo  Chat 3 API Framework - Windows Setup
echo =========================================
echo.

:: Check if first argument is a command
if "%1"=="stop" goto stop_services
if "%1"=="restart" goto restart_services
if "%1"=="test" goto test_api
if "%1"=="status" goto show_status
if "%1"=="logs" goto show_logs
if "%1"=="help" goto show_help

:: Main startup sequence
goto main_startup

:main_startup
echo [STEP] Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    echo [INFO] Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [SUCCESS] Docker is installed

echo [STEP] Checking if Docker is running...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running
    echo [INFO] Please start Docker Desktop
    pause
    exit /b 1
)
echo [SUCCESS] Docker is running

echo [STEP] Checking Docker Compose...
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker Compose is not available
        pause
        exit /b 1
    ) else (
        echo [SUCCESS] Docker Compose ^(legacy^) is available
    )
) else (
    echo [SUCCESS] Docker Compose is available
)

echo [STEP] Checking required ports...
:: Note: Windows doesn't have netstat parsing as clean as Linux, but we'll do basic checks
for %%p in (%REQUIRED_PORTS%) do (
    netstat -an | findstr ":%%p " >nul 2>&1
    if not errorlevel 1 (
        echo [WARNING] Port %%p appears to be in use
    )
)
echo [SUCCESS] Port check completed

echo [STEP] Checking environment...
if not exist ".env" (
    if exist "config\production.env" (
        echo [STEP] Copying environment configuration...
        copy "config\production.env" ".env" >nul
        echo [SUCCESS] Environment configuration copied
    ) else (
        echo [WARNING] No .env file found. Using Docker defaults
    )
) else (
    echo [SUCCESS] Environment configuration found
)

echo [STEP] Creating necessary directories...
if not exist "logs" mkdir "logs"
if not exist "logs\nginx" mkdir "logs\nginx"
if not exist "logs\node-1" mkdir "logs\node-1"
if not exist "logs\node-2" mkdir "logs\node-2"
if not exist "logs\postgres" mkdir "logs\postgres"
if not exist "logs\redis-1" mkdir "logs\redis-1"
if not exist "logs\redis-2" mkdir "logs\redis-2"
if not exist "uploads" mkdir "uploads"
if not exist "sql\backups" mkdir "sql\backups"
if not exist "nginx\ssl" mkdir "nginx\ssl"
if not exist "nginx\errors" mkdir "nginx\errors"
echo [SUCCESS] Directories created

echo [STEP] Creating SSL certificates...
if not exist "nginx\ssl\server.crt" (
    :: Try to use OpenSSL if available, otherwise create placeholders
    openssl version >nul 2>&1
    if not errorlevel 1 (
        echo [STEP] Generating SSL certificates with OpenSSL...
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 ^
            -keyout "nginx\ssl\server.key" ^
            -out "nginx\ssl\server.crt" ^
            -subj "/C=US/ST=Development/L=Local/O=Chat3Framework/OU=API/CN=localhost" >nul 2>&1
        if not errorlevel 1 (
            echo [SUCCESS] SSL certificates generated
        ) else (
            goto create_ssl_placeholders
        )
    ) else (
        :create_ssl_placeholders
        echo # Placeholder SSL certificate > "nginx\ssl\server.crt"
        echo # Placeholder SSL key > "nginx\ssl\server.key"
        echo [WARNING] OpenSSL not available. Created placeholder SSL files
    )
) else (
    echo [SUCCESS] SSL certificates already exist
)

echo [STEP] Creating nginx error pages...
(
echo ^<!DOCTYPE html^>
echo ^<html^>
echo ^<head^>
echo     ^<title^>Service Temporarily Unavailable^</title^>
echo     ^<style^>
echo         body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
echo         h1 { color: #e74c3c; }
echo         p { color: #7f8c8d; font-size: 18px; }
echo         .container { max-width: 600px; margin: 0 auto; }
echo     ^</style^>
echo ^</head^>
echo ^<body^>
echo     ^<div class="container"^>
echo         ^<h1^>Service Temporarily Unavailable^</h1^>
echo         ^<p^>The Chat 3 API Framework is currently undergoing maintenance.^</p^>
echo         ^<p^>Please try again in a few moments.^</p^>
echo         ^<p^>If the problem persists, please contact support.^</p^>
echo     ^</div^>
echo ^</body^>
echo ^</html^>
) > "nginx\error-pages\50x.html"

(
echo ^<!DOCTYPE html^>
echo ^<html^>
echo ^<head^>
echo     ^<title^>404 - Page Not Found^</title^>
echo     ^<style^>
echo         body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
echo         h1 { color: #333; }
echo         p { color: #666; }
echo         .logo { font-size: 24px; font-weight: bold; color: #007bff; }
echo     ^</style^>
echo ^</head^>
echo ^<body^>
echo     ^<div class="logo"^>Chat 3 API Framework^</div^>
echo     ^<h1^>404 - Page Not Found^</h1^>
echo     ^<p^>The page you are looking for could not be found.^</p^>
echo     ^<p^>^<a href="/"^>Return to API Documentation^</a^>^</p^>
echo ^</body^>
echo ^</html^>
) > "nginx\error-pages\404.html"
echo [SUCCESS] Error pages created

echo [STEP] Creating SSL certificates...
if not exist "nginx\ssl\server.crt" (
    :: Try to use OpenSSL if available, otherwise create placeholders
    openssl version >nul 2>&1
    if not errorlevel 1 (
        echo [STEP] Generating SSL certificates with OpenSSL...
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 ^
            -keyout "nginx\ssl\server.key" ^
            -out "nginx\ssl\server.crt" ^
            -subj "/C=US/ST=Development/L=Local/O=Chat3Framework/OU=API/CN=localhost" >nul 2>&1
        if not errorlevel 1 (
            echo [SUCCESS] SSL certificates generated
        ) else (
            goto create_ssl_placeholders
        )
    ) else (
        :create_ssl_placeholders
        echo # Placeholder SSL certificate > "nginx\ssl\server.crt"
        echo # Placeholder SSL key > "nginx\ssl\server.key"
        echo [WARNING] OpenSSL not available. Created placeholder SSL files
    )
) else (
    echo [SUCCESS] SSL certificates already exist
)

echo [STEP] Building Docker images...
docker compose -p %PROJECT_NAME% build --parallel
if errorlevel 1 (
    echo [ERROR] Failed to build Docker images
    pause
    exit /b 1
)
echo [SUCCESS] Docker images built successfully

echo [STEP] Starting infrastructure services...
docker compose -p %PROJECT_NAME% up -d postgres redis-1 redis-2

echo [STEP] Waiting for database to be ready...
set /a timeout=60
:wait_db_loop
docker compose -p %PROJECT_NAME% exec -T postgres pg_isready -U api_user -d api_framework >nul 2>&1
if not errorlevel 1 goto db_ready
set /a timeout-=2
if %timeout% leq 0 (
    echo [ERROR] Database failed to start within timeout
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
echo|set /p="."
goto wait_db_loop

:db_ready
echo.
echo [SUCCESS] Database is ready

echo [STEP] Waiting for Redis to be ready...
set /a timeout=30
:wait_redis_loop
docker compose -p %PROJECT_NAME% exec -T redis-1 redis-cli ping >nul 2>&1
if not errorlevel 1 goto redis_ready
set /a timeout-=2
if %timeout% leq 0 (
    echo [ERROR] Redis failed to start within timeout
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
echo|set /p="."
goto wait_redis_loop

:redis_ready
echo.
echo [SUCCESS] Redis is ready

echo [STEP] Starting application services...
docker compose -p %PROJECT_NAME% up -d api-node-1 api-node-2

echo [STEP] Waiting for API services to be ready...
set /a timeout=120
:wait_api_loop
:: Check if containers are running and healthy
docker compose -p %PROJECT_NAME% ps api-node-1 | findstr "healthy" >nul 2>&1
if errorlevel 1 goto api_not_ready
docker compose -p %PROJECT_NAME% ps api-node-2 | findstr "healthy" >nul 2>&1
if errorlevel 1 goto api_not_ready
goto api_ready

:api_not_ready
set /a timeout-=3
if %timeout% leq 0 (
    echo [ERROR] API services failed to start within timeout
    pause
    exit /b 1
)
timeout /t 3 /nobreak >nul
echo|set /p="."
goto wait_api_loop

:api_ready
echo.
echo [SUCCESS] API services are ready

echo [STEP] Starting load balancer...
docker compose -p %PROJECT_NAME% up -d nginx

echo [STEP] Waiting for load balancer to be ready...
set /a timeout=30
:wait_nginx_loop
curl -f http://localhost/health >nul 2>&1
if not errorlevel 1 goto nginx_ready
set /a timeout-=2
if %timeout% leq 0 (
    echo [ERROR] Load balancer failed to start within timeout
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
echo|set /p="."
goto wait_nginx_loop

:nginx_ready
echo.
echo [SUCCESS] Load balancer is ready

echo [STEP] Starting monitoring services...
docker compose -p %PROJECT_NAME% up -d adminer redis-commander
echo [SUCCESS] Monitoring services started

goto show_final_status

:show_final_status
echo.
echo [STEP] Checking service status...
echo.
docker compose -p %PROJECT_NAME% ps

echo.
echo =========================================
echo   🎉 Chat 3 API Framework is running!
echo =========================================
echo.
echo 📋 Service URLs:
echo   🌐 API Endpoint:        http://localhost/api
echo   🏥 Health Check:       http://localhost/health
echo   📊 API Info:           http://localhost/api/info
echo   📈 Metrics:            http://localhost/metrics
echo.
echo 🔧 Management Tools:
echo   🗄️  Database Admin:     http://localhost:8080
echo   🔴 Redis Commander:    http://localhost:8081
echo.
echo 🧪 API Testing:
echo   📚 Users API:          http://localhost/api/v1/users
echo   🛍️  Products API:       http://localhost/api/v1/products
echo   🎯 Demo API:           http://localhost/api/v1/demo
echo.
echo 📖 Quick Commands:
echo   View logs:             docker compose -p %PROJECT_NAME% logs -f
echo   Stop services:         start.bat stop
echo   Restart services:      start.bat restart
echo   Show status:           start.bat status
echo.
echo ⚠️  Default credentials:
echo   Admin: admin@example.com / password123
echo   Demo:  demo@example.com / password123
echo.

echo [STEP] Testing API endpoints...
curl -s http://localhost/health | findstr "healthy" >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] Health check passed
) else (
    echo [WARNING] Health check failed
)

curl -s http://localhost/api/info | findstr "Chat" >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] API info endpoint working
) else (
    echo [WARNING] API info endpoint failed
)

curl -s http://localhost/api/v1/products/getProducts | findstr "products" >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] Products API working
) else (
    echo [WARNING] Products API failed
)

echo.
echo [SUCCESS] Setup completed successfully! 🎉
echo.
pause
exit /b 0

:: Command handlers
:stop_services
echo [STEP] Stopping all services...
docker compose -p %PROJECT_NAME% down --remove-orphans
echo [SUCCESS] All services stopped
pause
exit /b 0

:restart_services
echo [STEP] Restarting services...
docker compose -p %PROJECT_NAME% down --remove-orphans
timeout /t 3 /nobreak >nul
goto main_startup

:test_api
echo [STEP] Testing API endpoints...
goto show_final_status

:show_status
echo [STEP] Service status:
docker compose -p %PROJECT_NAME% ps
pause
exit /b 0

:show_logs
echo [STEP] Showing service logs...
docker compose -p %PROJECT_NAME% logs -f
exit /b 0

:show_help
echo.
echo Chat 3 API Framework - Windows Batch Script
echo.
echo Usage: start.bat [command]
echo.
echo Commands:
echo   start     Start the complete stack (default)
echo   stop      Stop all services
echo   restart   Restart all services
echo   test      Test API endpoints
echo   status    Show service status
echo   logs      Show service logs
echo   help      Show this help message
echo.
echo Examples:
echo   start.bat
echo   start.bat stop
echo   start.bat restart
echo   start.bat test
echo.
pause
exit /b 0