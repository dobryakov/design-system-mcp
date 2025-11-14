FROM node:20-slim

# Build argument to control dependency installation
ARG INSTALL_DEV_DEPS=true

# Install Playwright dependencies and browsers
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for TypeScript build)
RUN npm ci

# Install Playwright browsers (needed for both production and test)
RUN npx playwright install --with-deps chromium

# Copy source code
COPY . .

# Clean and build TypeScript
RUN rm -rf dist && npm run build

# Remove devDependencies for production builds to reduce image size
# Test containers keep all dependencies
RUN if [ "$INSTALL_DEV_DEPS" = "false" ]; then \
      npm prune --production; \
    fi

# Expose ports
EXPOSE 3000 3001

# Start the application
CMD ["npm", "start"]

