FROM mcr.microsoft.com/playwright:v1.40.1-jammy

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm install --save-dev typescript @types/node ts-node-dev && npm run build

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3001

CMD ["node", "dist/index.js"]
