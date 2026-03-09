FROM node:22-bookworm-slim

WORKDIR /app

# Copy pre-built oclif Linux tarball produced by:
#   yarn build:cli:binary
# This should create something like: dist/zss-<version>-linux-x64.tar.gz
COPY dist/zss-*-linux-x64.tar.gz /app/cli.tar.gz

# Extract into /app/package (default oclif tarball layout) and remove the archive
RUN tar -xzf cli.tar.gz && rm cli.tar.gz

# All project files (bin/, dist/, node_modules/, cafe/dist, etc.) now live under /app/package
WORKDIR /app/package

# Install OS dependencies needed by Playwright's Chromium headless shell.
# This uses the bundled Playwright CLI from node_modules and only installs system packages.
RUN npx playwright install-deps chromium

# Runtime configuration: headless HTTP server runs on this port internally,
# data directory is where player/config/history JSON files are stored.
ENV ZSS_SERVER_PORT=4175 \
    ZSS_DATA_DIR=/data

# Persist CLI data between container runs
VOLUME ["/data"]

# Run the oclif CLI in interactive mode; callers should use `docker run -it` so
# the Ink-based `zed.cafe>` prompt can accept input.
CMD ["node", "./bin/run.js", "run", "--data-dir", "/data"]

