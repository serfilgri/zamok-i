FROM php:8.3-fpm-alpine

RUN set -eux; \
    apk add --no-cache oniguruma-dev; \
    docker-php-ext-install mbstring; \
    apk del oniguruma-dev

WORKDIR /var/www/html
