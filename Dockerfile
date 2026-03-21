FROM node:22-bookworm-slim

WORKDIR /app

# Copy the Linux CLI tarball from:
#   yarn build:cli:linux  →  dist/zss-<version>-linux-x64.tar.gz
COPY dist/zss-*-linux-x64.tar.gz /app/cli.tar.gz

RUN tar -xzf cli.tar.gz && rm cli.tar.gz

WORKDIR /app/zss

# Install dependencies for the Chromium headless shell from Playwright.
RUN npx playwright install-deps chromium

# Install the Chromium headless shell.
RUN npx playwright install chromium

ENV ZSS_SERVER_PORT=4175 \
    ZSS_DATA_DIR=/data

VOLUME ["/data"]

COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
