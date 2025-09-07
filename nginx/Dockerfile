# Nginx Dockerfile for Chat 3 API Framework
FROM nginx:alpine

# Install additional tools
RUN apk add --no-cache curl openssl

# Create necessary directories
RUN mkdir -p /etc/nginx/ssl /var/log/nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create custom error pages
RUN mkdir -p /usr/share/nginx/html
COPY error-pages/ /usr/share/nginx/html/

# Generate self-signed SSL certificates for development
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/server.key \
    -out /etc/nginx/ssl/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Set permissions
RUN chown -R nginx:nginx /var/log/nginx /etc/nginx/ssl

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]