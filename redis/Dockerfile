FROM haproxy:2.8-alpine

# Create the chroot directory that HAProxy needs
RUN mkdir -p /var/lib/haproxy && \
    chown haproxy:haproxy /var/lib/haproxy

# Copy the HAProxy configuration
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

# Expose Redis port and stats port
EXPOSE 6379 8404

CMD ["haproxy", "-f", "/usr/local/etc/haproxy/haproxy.cfg"]
