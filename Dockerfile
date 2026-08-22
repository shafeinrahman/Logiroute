# Production Dockerfile for LogiRoute
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for optimal layer caching
COPY package*.json ./
RUN npm install --production

# Copy application source files
COPY . .

# Expose server HTTP port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start application using npm start
CMD ["npm", "start"]
