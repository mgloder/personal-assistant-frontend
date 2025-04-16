FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install curl for debugging
RUN apk add --no-cache curl

# Copy the rest of the application
COPY . .

# Create a non-root user
RUN adduser -D frontend && chown -R frontend:frontend /app
USER frontend

# Expose the port the app runs on
EXPOSE 3001

# Set runtime environment variables
ENV PORT=3001
ENV NODE_ENV=development

# Command to run the application in development mode
CMD ["npm", "run", "dev"]