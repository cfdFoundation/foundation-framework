# Nginx Dockerfile for Chat 3 API Framework
FROM nginx:alpine

# Install additional tools
RUN apk add --no-cache curl openssl

# Create necessary directories
RUN mkdir -p /etc/nginx/ssl /var/log/nginx /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create 50x error page
RUN echo '<!DOCTYPE html>' > /usr/share/nginx/html/50x.html && \
    echo '<html>' >> /usr/share/nginx/html/50x.html && \
    echo '<head>' >> /usr/share/nginx/html/50x.html && \
    echo '    <title>Service Temporarily Unavailable</title>' >> /usr/share/nginx/html/50x.html && \
    echo '    <style>' >> /usr/share/nginx/html/50x.html && \
    echo '        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }' >> /usr/share/nginx/html/50x.html && \
    echo '        h1 { color: #dc3545; }' >> /usr/share/nginx/html/50x.html && \
    echo '        p { color: #666; }' >> /usr/share/nginx/html/50x.html && \
    echo '        .logo { font-size: 24px; font-weight: bold; color: #007bff; }' >> /usr/share/nginx/html/50x.html && \
    echo '    </style>' >> /usr/share/nginx/html/50x.html && \
    echo '</head>' >> /usr/share/nginx/html/50x.html && \
    echo '<body>' >> /usr/share/nginx/html/50x.html && \
    echo '    <div class="logo">Chat 3 API Framework</div>' >> /usr/share/nginx/html/50x.html && \
    echo '    <h1>Service Temporarily Unavailable</h1>' >> /usr/share/nginx/html/50x.html && \
    echo '    <p>We are experiencing technical difficulties.</p>' >> /usr/share/nginx/html/50x.html && \
    echo '    <p>Please try again in a few moments.</p>' >> /usr/share/nginx/html/50x.html && \
    echo '    <p>If the problem persists, please contact support.</p>' >> /usr/share/nginx/html/50x.html && \
    echo '</body>' >> /usr/share/nginx/html/50x.html && \
    echo '</html>' >> /usr/share/nginx/html/50x.html

# Create 404 error page
RUN echo '<!DOCTYPE html>' > /usr/share/nginx/html/404.html && \
    echo '<html>' >> /usr/share/nginx/html/404.html && \
    echo '<head>' >> /usr/share/nginx/html/404.html && \
    echo '    <title>404 - Page Not Found</title>' >> /usr/share/nginx/html/404.html && \
    echo '    <style>' >> /usr/share/nginx/html/404.html && \
    echo '        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }' >> /usr/share/nginx/html/404.html && \
    echo '        h1 { color: #333; }' >> /usr/share/nginx/html/404.html && \
    echo '        p { color: #666; }' >> /usr/share/nginx/html/404.html && \
    echo '        .logo { font-size: 24px; font-weight: bold; color: #007bff; }' >> /usr/share/nginx/html/404.html && \
    echo '    </style>' >> /usr/share/nginx/html/404.html && \
    echo '</head>' >> /usr/share/nginx/html/404.html && \
    echo '<body>' >> /usr/share/nginx/html/404.html && \
    echo '    <div class="logo">Chat 3 API Framework</div>' >> /usr/share/nginx/html/404.html && \
    echo '    <h1>404 - Page Not Found</h1>' >> /usr/share/nginx/html/404.html && \
    echo '    <p>The page you are looking for could not be found.</p>' >> /usr/share/nginx/html/404.html && \
    echo '    <p><a href="/">Return to API Documentation</a></p>' >> /usr/share/nginx/html/404.html && \
    echo '</body>' >> /usr/share/nginx/html/404.html && \
    echo '</html>' >> /usr/share/nginx/html/404.html

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