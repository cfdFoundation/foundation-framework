FROM nginx:alpine

# Install additional tools
RUN apk add --no-cache curl

# Copy Redis proxy configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create log directory
RUN mkdir -p /var/log/nginx

# Health check for Redis proxy
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD nginx -t || exit 1

# Expose Redis proxy port
EXPOSE 6379

# Start nginx
CMD ["nginx", "-g", "daemon off;"]