# Use the official Puppeteer Node runtime container
FROM ghcr.io/puppeteer/puppeteer:22.6.0

# Set running directory inside the container
WORKDIR /app

# Run setup operations as root to ensure full access to Chrome paths
USER root

# Copy package files first to cache dependency layers
COPY package*.json ./

# Clean install dependencies directly as root
RUN npm install

# Copy the rest of your application files into the working directory
COPY . .

# Ensure the public directory exists and has global write permissions for generated PPTX files
RUN mkdir -p /app/public && chmod -R 777 /app/public

# Explicitly tell Puppeteer where the stable Chrome binary lives inside this specific image
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Open up port 3000
EXPOSE 3000

# Start your service
CMD [ "node", "server.js" ]
