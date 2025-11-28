# Nginx Dockerfile for Entoo2
FROM nginx:1.25-alpine

# Build arguments
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# Labels
LABEL maintainer="Entoo Development Team"
LABEL org.label-schema.build-date=$BUILD_DATE
LABEL org.label-schema.vcs-ref=$VCS_REF
LABEL org.label-schema.version=$VERSION
LABEL org.label-schema.name="Entoo2 Nginx"
LABEL org.label-schema.description="Nginx web server for Entoo2 application"
LABEL org.label-schema.schema-version="1.0"

# Install additional tools if needed
RUN apk add --no-cache \
    curl \
    tzdata

# Copy nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/conf.d/ /etc/nginx/conf.d/

# Create necessary directories
RUN mkdir -p /var/www/html/public \
    && chown -R nginx:nginx /var/www/html \
    && chmod -R 755 /var/www/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
