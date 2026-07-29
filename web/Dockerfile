# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve the application via Nginx
FROM nginx:alpine
# Copy the built React app to Nginx's default public folder
COPY --from=build /app/dist /usr/share/nginx/html
# Expose port 80
EXPOSE 80
# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Run Nginx
CMD ["nginx", "-g", "daemon off;"]
