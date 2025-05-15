# FUD Buddy Deployment Guide

This document outlines how to deploy FUD Buddy to various platforms for production use.

## Build Process

Before deploying, build the application for production:

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This will create a `dist` directory with the compiled assets.

## Deployment Options

### Netlify

1. **Connect to GitHub**:
   - Sign up for Netlify
   - Connect your GitHub repository

2. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Set environment variables**:
   - Go to Site settings > Build & deploy > Environment
   - Add any required API keys (securely)

4. **Deploy**:
   - Trigger a manual deploy or push to your connected branch

### Vercel

1. **Connect to GitHub**:
   - Sign up for Vercel
   - Import your GitHub repository

2. **Configure build settings**:
   - Framework Preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Set environment variables**:
   - Go to Project Settings > Environment Variables
   - Add any required API keys (securely)

4. **Deploy**:
   - Vercel will automatically deploy your application

### GitHub Pages

1. **Update `vite.config.ts`**:
   ```typescript
   export default defineConfig({
     // Add your GitHub repo name if it's not at the root domain
     base: '/fud-buddy/',
     // ... other configuration
   });
   ```

2. **Create deployment workflow**:
   Create a file at `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main]

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v3

         - name: Set up Node.js
           uses: actions/setup-node@v3
           with:
             node-version: 18

         - name: Install dependencies
           run: npm ci

         - name: Build
           run: npm run build

         - name: Deploy to GitHub Pages
           uses: JamesIves/github-pages-deploy-action@4.1.5
           with:
             branch: gh-pages
             folder: dist
   ```

3. **Enable GitHub Pages**:
   - Go to repository Settings > Pages
   - Select the `gh-pages` branch as the source

### Docker Deployment

1. **Create a Dockerfile**:
   ```dockerfile
   FROM node:18-alpine as build
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Create nginx.conf**:
   ```
   server {
     listen 80;
     server_name _;
     
     location / {
       root /usr/share/nginx/html;
       try_files $uri $uri/ /index.html;
     }
   }
   ```

3. **Build and run the Docker image**:
   ```bash
   docker build -t fud-buddy .
   docker run -p 8080:80 fud-buddy
   ```

## Custom Domain Setup

To use a custom domain:

1. **Purchase a domain** from a registrar like Namecheap, GoDaddy, or Google Domains

2. **Configure DNS settings**:
   - Add an A record pointing to your hosting provider's IP
   - Or add a CNAME record pointing to your provider's domain

3. **Configure SSL**:
   - Most hosting providers offer automatic SSL with Let's Encrypt
   - Enable HTTPS in your hosting provider settings

4. **Update application config** if necessary:
   - Ensure your API endpoints use the correct domain
   - Update any hard-coded URLs in your application

## Environment Variables

For secure deployment, use environment variables for sensitive information:

1. **Local development**:
   - Create a `.env` file (but don't commit it to GitHub)
   - Load variables with Vite's built-in env support

2. **Production deployment**:
   - Set environment variables in your hosting provider's dashboard
   - Never expose API keys in client-side code

## Production Considerations

1. **Performance**:
   - Enable gzip/Brotli compression
   - Set up proper caching headers
   - Consider using a CDN like Cloudflare

2. **Monitoring**:
   - Set up error tracking with Sentry
   - Configure uptime monitoring
   - Add performance monitoring

3. **Security**:
   - Implement proper CORS policies
   - Set up Content Security Policy
   - Use HTTPs only
   - Store API keys securely

4. **Scalability**:
   - For high traffic, consider serverless functions for API calls
   - Implement rate limiting
   - Add caching layer for expensive operations
