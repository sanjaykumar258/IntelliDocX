FROM node:22-alpine

WORKDIR /app

# Install system dependencies for Prisma and native bindings
RUN apk add --no-cache openssl netcat-openbsd dumb-init

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma Client at build time
RUN npx prisma generate

EXPOSE 5000

# Use dumb-init so signals are handled correctly for nodemon
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]
