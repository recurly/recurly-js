FROM node:lts-alpine
LABEL app=recurly-js

RUN apk add --no-cache \
    make \
    chromium \
    python3 \
    build-base \
    g++ \
    openssl \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

ENV NODE_OPTIONS=--openssl-legacy-provider \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

WORKDIR /usr/src/app
CMD sh
