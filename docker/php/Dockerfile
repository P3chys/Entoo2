# -------------------------------------------------------------------
# 🐘 PHP-FPM + Swoole for Laravel Octane (optimized for Alpine)
# -------------------------------------------------------------------

FROM php:8.2-cli-alpine

# Install dependencies
RUN apk add --no-cache \
        bash git unzip tzdata \
        libzip-dev oniguruma-dev icu-dev \
        linux-headers openssl-dev pcre-dev curl-dev \
        postgresql-dev build-base autoconf make g++ \
        libpng-dev libjpeg-turbo-dev freetype-dev \
        poppler-utils \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd pdo pdo_pgsql pgsql bcmath zip opcache pcntl \
    && pecl install redis swoole \
    && docker-php-ext-enable redis swoole opcache gd \
    && apk del build-base autoconf make g++ \
    && rm -rf /tmp/* /var/cache/apk/*


# Copy composer from official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy app code
WORKDIR /var/www/html
RUN rm -rf vendor
COPY ./webapp /var/www/html

# -------------------------------------------------------------------
# ⚙️ PHP configuration (high-performance settings)
# -------------------------------------------------------------------
COPY ./docker/php/php.ini /usr/local/etc/php/php.ini

# -------------------------------------------------------------------
# 🔥 Install dependencies and set permissions
# -------------------------------------------------------------------
RUN set -eux; \
    composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist; \
    chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# -------------------------------------------------------------------
# ⚡ Run Octane as entrypoint (no PHP-FPM cold start)
# -------------------------------------------------------------------
EXPOSE 8000
USER www-data
CMD ["php", "artisan", "octane:start", "--server=swoole", "--host=0.0.0.0", "--port=8000"]
