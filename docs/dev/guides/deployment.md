# Deploying Dawai Applications

Deploying your Dawai application involves preparing it for a production environment, ensuring it runs reliably, efficiently, and securely. This guide covers key considerations and common practices for deploying Node.js applications built with Dawai.

## 1. Building for Production

Before deployment, you need to transpile your TypeScript code into JavaScript.

**Typical Build Process:**
1.  **Ensure `tsconfig.json` is configured for production:**
    *   `"target": "ES2020"` or newer (depending on your Node.js version).
    *   `"module": "CommonJS"` (unless you are using ES Modules in Node.js, which requires specific setup).
    *   `"outDir": "./dist"` (or your preferred output directory).
    *   `"sourceMap": false` (or true, if you need source maps in production for debugging, but be mindful of size and exposure).
    *   `"removeComments": true`.
    *   Ensure `"experimentalDecorators": true` and `"emitDecoratorMetadata": true` are enabled.

2.  **Add a build script to `package.json`:**
    ```json
    "scripts": {
      "build": "tsc -p tsconfig.json && npm run copy-assets", // Add asset copying if needed
      "copy-assets": "cp -R src/assets dist/assets" // Example for copying static assets
      // ... other scripts
    }
    ```
    If you have non-TypeScript assets (e.g., email templates, static files served by your app) in your `src` directory, ensure they are copied to the `dist` directory.

3.  **Run the build command:**
    ```bash
    npm run build
    ```
    This will generate the JavaScript output in your `dist` directory.

## 2. Environment Configuration

Production applications should **never** use hardcoded configuration values. Use environment variables to manage settings like:
*   `NODE_ENV=production`
*   Database connection strings
*   API keys and secrets
*   Port numbers
*   Logging levels
*   CORS origins
*   Rate limiting settings

Refer to the [Configuration guide](./configuration.md) for how to load these into your `MicroserviceOptions`.

**Best Practices for Environment Variables:**
*   Use a `.env` file for local development (and ensure it's in `.gitignore`).
*   In production, inject environment variables through your deployment platform's mechanisms (e.g., Heroku config vars, AWS Elastic Beanstalk environment properties, Kubernetes ConfigMaps/Secrets).
*   Validate critical environment variables at application startup to fail fast if misconfigured.

## 3. Containerization with Docker (Recommended)

Containerizing your Dawai application with Docker is highly recommended for consistency, portability, and scalability.

**Example `Dockerfile`:**
```dockerfile
# Stage 1: Build the application
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force
# If you have devDependencies needed for the build step (e.g., typescript itself)
# RUN npm ci && npm cache clean --force

# Copy the rest of your application code
COPY . .

# Build the TypeScript application
RUN npm run build

# Stage 2: Create the production image
FROM node:18-alpine
WORKDIR /usr/src/app

# Copy only necessary production dependencies from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port your application runs on (if it's a webservice)
# This should match the port configured in your MicroserviceOptions
EXPOSE 3000

# Set the environment to production
ENV NODE_ENV=production
# Other environment variables can be set here or injected at runtime

# Command to run the application
# Ensure your main entry point is dist/index.js or similar
CMD ["node", "dist/index.js"]
```

**Building and Running the Docker Image:**
```bash
# Build the image
docker build -t my-dawai-app .

# Run the container (example)
docker run -p 3000:3000 -e PORT=3000 -e DATABASE_URL="your_db_url" my-dawai-app
```

**Key Dockerfile Considerations:**
*   **Multi-stage builds**: Use a builder stage to compile your TypeScript and install dependencies, then copy only the necessary artifacts (built code, production `node_modules`) to a smaller final image. This reduces image size and improves security.
*   **`npm ci` vs `npm install`**: Use `npm ci` for more reliable and faster installs in CI/CD environments, as it uses the `package-lock.json`.
*   **Non-root user**: For enhanced security, run your application as a non-root user inside the container.
*   **Health checks**: Define a `HEALTHCHECK` instruction in your Dockerfile if your deployment platform supports it.

## 4. Process Management

In a production environment, your Node.js application should be managed by a process manager to ensure it restarts automatically if it crashes and to leverage multi-core CPUs.

*   **PM2**: A popular and feature-rich process manager for Node.js.
    *   Installation: `npm install pm2 -g`
    *   Starting your app: `pm2 start dist/index.js --name my-dawai-app -i max` (cluster mode)
    *   PM2 provides logging, monitoring, startup scripts, and more.
    *   You can use a `ecosystem.config.js` file to configure PM2 for your application.

*   **Container Orchestrators (Kubernetes, Docker Swarm, etc.)**: If you are deploying containers, the orchestrator itself handles process management, restarts, scaling, and health checks. PM2 might still be used *inside* the container for managing the Node.js process itself, but often the orchestrator's capabilities are sufficient.

## 5. Logging

Robust logging is essential for monitoring and troubleshooting in production.
*   **Structured Logging**: Use a library like `pino` or `winston` to output logs in a structured format (e.g., JSON). This makes them easier to parse, search, and analyze by log management systems.
*   **Log Levels**: Implement configurable log levels (DEBUG, INFO, WARN, ERROR) and set an appropriate level for production (usually INFO or WARN).
*   **Log Aggregation**: Send logs to a centralized log management system (e.g., ELK Stack, Splunk, Datadog, CloudWatch Logs).
*   Dawai's `WebServiceTransportAdapter` may have built-in request logging (e.g., using `morgan`), which can be configured.

## 6. Security Considerations

*   **HTTPS**: Always use HTTPS for web services. Terminate SSL/TLS at a load balancer or reverse proxy, or configure HTTPS directly in Dawai's `WebServiceTransportAdapter` (see `https` options in `WebserviceOptions`).
*   **Input Validation**: Dawai's Zod integration is excellent for this. Ensure all incoming data is validated.
*   **Rate Limiting**: Protect against brute-force attacks and denial-of-service. `WebServiceTransportAdapter` has options for rate limiting.
*   **Helmet**: Use security-focused HTTP headers (e.g., via the `helmet` Express middleware, which can be configured in `WebServiceTransportAdapter`).
*   **Dependency Management**: Regularly update your dependencies to patch security vulnerabilities. Use tools like `npm audit` or Snyk.
*   **Secrets Management**: Store secrets securely (e.g., using HashiCorp Vault, AWS Secrets Manager, or your platform's secret management solution). Do not commit secrets to your repository.

## 7. Monitoring and Performance

*   **Application Performance Monitoring (APM)**: Use APM tools (e.g., Datadog, New Relic, Dynatrace) to monitor application performance, trace requests, and identify bottlenecks.
*   **Health Checks**: Implement health check endpoints (e.g., `/health`) that your deployment platform can use to determine if your application instances are healthy.
*   **Metrics**: Collect key application metrics (e.g., request latency, error rates, resource usage).

## 8. Scalability

Dawai applications, being Node.js based, are single-threaded by nature (though they use non-blocking I/O). To scale:
*   **Vertical Scaling**: Increase the resources (CPU, memory) of the server running your application.
*   **Horizontal Scaling**: Run multiple instances of your application behind a load balancer. This is the more common and robust approach.
    *   Containerization and process managers like PM2 (in cluster mode) or orchestrators like Kubernetes facilitate horizontal scaling.
    *   Ensure your application is stateless or manages state externally (e.g., in a database or cache like Redis) if you scale horizontally.

## Example Deployment Workflow (Conceptual)

1.  Code is pushed to a Git repository.
2.  A CI/CD pipeline (e.g., GitHub Actions, Jenkins, GitLab CI) triggers.
3.  **CI Phase**:
    *   Lints the code.
    *   Runs unit tests and E2E tests.
    *   Builds the application (`npm run build`).
    *   Builds a Docker image.
    *   Pushes the Docker image to a container registry (e.g., Docker Hub, AWS ECR, Google GCR).
4.  **CD Phase**:
    *   Deploys the new Docker image to your production environment (e.g., Kubernetes cluster, AWS ECS, Heroku).
    *   Injects environment-specific configurations.
    *   Performs health checks.
    *   Optionally, runs smoke tests.

This is a high-level overview. The specifics of deployment will vary greatly depending on your chosen infrastructure and tools.
