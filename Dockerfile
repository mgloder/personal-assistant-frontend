# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Verify build output
RUN ls -la .next/

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Install curl for debugging
RUN apk add --no-cache curl

# Create a non-root user
RUN adduser -D frontend

# Copy necessary files from builder
COPY --from=builder --chown=frontend:frontend /app/package*.json ./
COPY --from=builder --chown=frontend:frontend /app/.next ./.next
COPY --from=builder --chown=frontend:frontend /app/public ./public
COPY --from=builder --chown=frontend:frontend /app/node_modules ./node_modules
COPY --from=builder --chown=frontend:frontend /app/next.config.js ./
COPY --from=builder --chown=frontend:frontend /app/tsconfig.json ./
COPY --from=builder --chown=frontend:frontend /app/postcss.config.js ./
COPY --from=builder --chown=frontend:frontend /app/tailwind.config.js ./

# Verify files are copied correctly
RUN ls -la .next/

# Switch to non-root user
USER frontend

# Expose the port the app runs on
EXPOSE 3001

# Set runtime environment variables
ENV PORT=3001
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Command to run the application in production mode
CMD ["npm", "start"]