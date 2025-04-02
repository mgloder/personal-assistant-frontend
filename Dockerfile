FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Create .next directory if it doesn't exist
RUN mkdir -p .next

# Expose the port the app runs on
EXPOSE 3001

# Set the port environment variable
ENV PORT=3001
ENV NODE_ENV=production

# Command to run the application
CMD ["npm", "start"] 