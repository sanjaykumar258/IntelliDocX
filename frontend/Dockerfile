FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expose Vite dev port
EXPOSE 5173

# Run vite dev with --host so it's accessible outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
