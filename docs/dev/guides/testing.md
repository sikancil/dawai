# Testing Dawai Applications

Testing is a critical part of developing reliable Dawai microservices. The framework's design, which promotes separation of concerns, makes it conducive to various testing strategies, including unit tests for business logic and end-to-end (E2E) tests for transport layers and integration points.

This guide outlines common approaches to testing Dawai applications. We'll use Jest as the example testing framework, but the principles apply to other frameworks like Mocha or Vitest.

## 1. Unit Testing Handlers and Services

Unit tests focus on testing individual pieces of your application in isolation, typically your service methods (handlers) and any underlying business logic. Since Dawai handlers are just methods on a class, they can be tested directly without needing to run a live server or involve the full transport layer.

**Key Goals of Unit Testing:**
*   Verify the correctness of business logic within handlers.
*   Test different input scenarios and edge cases.
*   Ensure methods behave as expected given certain inputs, without concern for HTTP requests, CLI arguments parsing, etc. (that's for E2E tests).

**Example: Unit Testing a Service Method**

Let's assume we have a `UserService` with a method to find a user:

```typescript
// src/services/UserService.service.ts
import { Crud, Params } from '@arifwidianto/dawai-common';
import { NotFoundException } from '../errors/NotFoundException'; // Custom error

interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: User[] = [
    { id: '1', name: 'Alice Wonderland', email: 'alice@example.com' },
    { id: '2', name: 'Bob The Builder', email: 'bob@example.com' },
  ];

  // This method is decorated with @Crud in a real app, but we test its logic directly.
  // @Crud({ method: 'GET', path: '/users/:id' })
  async findUserById(id: string): Promise<User> {
    console.log(`Service method findUserById called with ID: ${id}`); // For test visibility
    const user = this.users.find(u => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  async addUser(user: Omit<User, 'id'>): Promise<User> {
    const newUser = { id: String(this.users.length + 1), ...user };
    this.users.push(newUser);
    return newUser;
  }
}
```

Now, let's write a unit test for `UserService` using Jest:

```typescript
// src/services/UserService.test.ts
import { UserService } from './UserService.service';
import { NotFoundException } from '../errors/NotFoundException';

describe('UserService - Unit Tests', () => {
  let userService: UserService;

  beforeEach(() => {
    // Create a new instance of the service for each test
    userService = new UserService();
  });

  describe('findUserById', () => {
    it('should return a user when a valid ID is provided', async () => {
      const user = await userService.findUserById('1');
      expect(user).toBeDefined();
      expect(user.id).toBe('1');
      expect(user.name).toBe('Alice Wonderland');
    });

    it('should throw NotFoundException when an invalid ID is provided', async () => {
      // We expect the promise to reject with NotFoundException
      await expect(userService.findUserById('invalid-id'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw NotFoundException with a specific message for an invalid ID', async () => {
      const invalidId = '99';
      try {
        await userService.findUserById(invalidId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe(`User with ID ${invalidId} not found.`);
      }
    });
  });

  describe('addUser', () => {
    it('should add a new user and return it with an ID', async () => {
      const newUserPayload = { name: 'Charlie Brown', email: 'charlie@example.com' };
      const addedUser = await userService.addUser(newUserPayload);

      expect(addedUser).toBeDefined();
      expect(addedUser.id).toBeDefined(); // ID should be assigned
      expect(addedUser.name).toBe(newUserPayload.name);
      expect(addedUser.email).toBe(newUserPayload.email);

      // Optionally, verify it was added by trying to find it
      const foundUser = await userService.findUserById(addedUser.id);
      expect(foundUser).toEqual(addedUser);
    });
  });
});
```

**Tips for Unit Testing:**
*   **Mock Dependencies**: If your service methods depend on other services, databases, or external APIs, mock these dependencies to isolate the unit under test. Jest provides powerful mocking capabilities (`jest.fn()`, `jest.mock()`).
*   **Focus on Logic**: Don't test the framework's functionality (like decorator processing or request routing) in unit tests.
*   **Test Edge Cases**: Cover scenarios like invalid input, missing data, and boundary conditions.

## 2. End-to-End (E2E) Testing

E2E tests verify the entire application flow, from the transport layer (e.g., HTTP request, CLI command execution) through middleware, to the handler, and back to the client. These tests ensure that all parts of your Dawai application integrate correctly.

**Key Goals of E2E Testing:**
*   Validate request routing and parameter injection.
*   Test middleware execution.
*   Ensure correct response formatting and status codes (for HTTP).
*   Verify command output and exit codes (for CLI).
*   Test integration with actual databases or other external services (though these might sometimes be mocked for stability and speed).

**Example: E2E Testing an HTTP Endpoint (using `supertest`)**

For testing HTTP endpoints, `supertest` is a popular library.

```typescript
// test/e2e/user.e2e-spec.ts
import * => request from 'supertest'; // or import request from 'supertest';
import { Microservice } from '@arifwidianto/dawai-microservice';
import { MicroserviceOptions } from '@arifwidianto/dawai-common';
import { UserService } from '../../src/services/UserService.service'; // Adjust path as needed

describe('UserService - E2E Tests (HTTP)', () => {
  let app: Microservice;
  let httpServer: any; // To hold the raw HTTP server instance for supertest

  beforeAll(async () => {
    const options: MicroserviceOptions = {
      webservice: {
        enabled: true,
        port: 0, // Use port 0 to let the OS pick a random available port for testing
        options: {
          // No middleware for this simple test, but you could add test-specific ones
        }
      },
    };
    app = new Microservice(UserService, options);
    await app.bootstrap();
    await app.listen(); // Starts the HTTP server

    // Get the underlying Express app instance for supertest
    // This assumes WebServiceTransportAdapter exposes getHttpServer() or similar
    httpServer = app.getTransportAdapters().find(ta => ta.constructor.name === 'WebServiceTransportAdapter')?.getHttpServer();
    if (!httpServer) {
      throw new Error('WebServiceTransportAdapter not found or httpServer not available for E2E tests.');
    }
  });

  afterAll(async () => {
    await app.close(); // Gracefully shut down the microservice and server
  });

  it('GET /users/1 should return Alice Wonderland', async () => {
    const response = await request(httpServer)
      .get('/users/1') // Assuming @Crud({ path: '/users/:id' })
      .expect(200);

    expect(response.body).toBeDefined();
    expect(response.body.id).toBe('1');
    expect(response.body.name).toBe('Alice Wonderland');
  });

  it('GET /users/99 should return 404 Not Found', async () => {
    const response = await request(httpServer)
      .get('/users/99')
      .expect(404);

    // The framework should convert NotFoundException to a 404
    expect(response.body).toBeDefined();
    expect(response.body.message).toContain('User with ID 99 not found');
    expect(response.body.statusCode).toBe(404);
  });

  it('POST /users should create a new user', async () => {
    const newUserPayload = { name: 'Test User', email: 'test@example.com' };
    const response = await request(httpServer)
      .post('/users') // Assuming @Crud({ path: '/users', method: 'POST' })
      .send(newUserPayload)
      .expect(201); // Or 200, depending on your handler's response for POST

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe(newUserPayload.name);
  });
});
```

**Example: E2E Testing a CLI Command**

Testing CLI commands often involves using Node.js's `child_process` module to execute your application as a separate process and inspect its `stdout`, `stderr`, and exit code.

```typescript
// test/e2e/cli.e2e-spec.ts
import { exec } from 'child_process';
import * as path from 'path';

const mainScriptPath = path.resolve(__dirname, '../../dist/index.js'); // Path to your compiled main file

describe('CLI - E2E Tests', () => {
  it('should execute "my-command --name Test" successfully', (done) => {
    // Assuming your app has a CLI command 'my-command' from a service like:
    // @Cli({ command: 'my-command' }) async myCommand(@Body('name') name: string) { console.log(`Hello, ${name}!`); }
    exec(`node ${mainScriptPath} my-command --name Test`, (error, stdout, stderr) => {
      expect(error).toBeNull();
      expect(stderr).toBe('');
      expect(stdout.trim()).toBe('Hello, Test!'); // Or whatever your command outputs
      done();
    });
  });

  it('should handle errors for invalid CLI commands', (done) => {
    exec(`node ${mainScriptPath} non-existent-command`, (error, stdout, stderr) => {
      expect(error).not.toBeNull(); // Expect an error (non-zero exit code)
      // Check stderr for an appropriate error message from Dawai's CLI handler
      expect(stderr).toContain('Unknown command'); // Or similar
      done();
    });
  });
});
```

**Tips for E2E Testing:**
*   **Test Database**: Use a separate test database and ensure it's reset before or after each test suite to maintain test isolation.
*   **Environment Configuration**: Manage test-specific configurations (e.g., database connections, ports) using environment variables or dedicated config files.
*   **Speed vs. Coverage**: E2E tests are slower than unit tests. Focus them on critical user flows and integration points.

## Test Coverage

Aim for high test coverage for both unit and E2E tests. Tools like Jest provide built-in coverage reporting (`jest --coverage`). This helps identify untested parts of your codebase.

## Setting Up Your Testing Environment

1.  **Install Jest (or your preferred framework):**
    ```bash
    npm install --save-dev jest @types/jest ts-jest
    # or
    # yarn add --dev jest @types/jest ts-jest
    ```
2.  **Configure Jest (`jest.config.js`):**
    ```javascript
    // jest.config.js
    module.exports = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleNameMapper: {
        // If you use path aliases in tsconfig.json
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      // Optional: Setup files, coverage paths, etc.
      // setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
    };
    ```
3.  **Add Test Scripts to `package.json`:**
    ```json
    "scripts": {
      "test": "jest",
      "test:watch": "jest --watch",
      "test:cov": "jest --coverage",
      "test:e2e": "jest --config ./test/jest-e2e.json" // If you have separate E2E config
    }
    ```

By combining unit and E2E tests, you can build confidence in the correctness and reliability of your Dawai applications.
