# Tutorial: Creating a REST API

This tutorial will guide you through the process of creating a simple RESTful API using the Dawai framework. We'll cover:
1.  Setting up a new Dawai project.
2.  Defining a service class.
3.  Using the `@webservice` class decorator.
4.  Creating CRUD (Create, Read, Update, Delete) handlers using the `@Crud` method decorator.
5.  Using parameter decorators like `@Body`, `@Params`, and `@Query`.
6.  Input validation with Zod schemas.
7.  Testing your API endpoints.

## Prerequisites

*   Node.js (version 16.x or higher recommended)
*   npm or yarn
*   Basic understanding of TypeScript and REST APIs.
*   A tool for making HTTP requests (e.g., Postman, curl, Insomnia).

## 1. Project Setup

First, let's create a new Dawai application using `dawai-cli`.

```bash
npx @arifwidianto/dawai-cli generate app --name MyRestApi --path ./my-rest-api
cd my-rest-api
npm install # or yarn install
```
This will scaffold a basic Dawai project structure.

## 2. Defining the `TodoService`

We'll create a simple To-Do list API. Let's define a `TodoService`.

Create `src/services/TodoService.service.ts`:
```typescript
import { webservice, Crud, Body, Params, Query } from '@arifwidianto/dawai-common';
import { z } from 'zod';
import { NotFoundException } from '../errors/NotFoundException'; // We'll create this later

// Define Zod schemas for validation
const TodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  completed: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
});
type Todo = z.infer<typeof TodoSchema>;

const CreateTodoSchema = TodoSchema.omit({ id: true, createdAt: true });
type CreateTodoPayload = z.infer<typeof CreateTodoSchema>;

const UpdateTodoSchema = CreateTodoSchema.partial(); // All fields optional for update
type UpdateTodoPayload = z.infer<typeof UpdateTodoSchema>;

@webservice({
  enabled: true,
  options: {
    basePath: '/todos' // Base path for all routes in this service
  }
})
export class TodoService {
  private todos: Todo[] = [];

  // Create (POST /todos)
  @Crud({ method: 'POST', path: '/', schema: CreateTodoSchema })
  async createTodo(@Body() data: CreateTodoPayload): Promise<Todo> {
    const newTodo: Todo = {
      id: crypto.randomUUID(), // Requires Node.js 19+ or a polyfill/library
      ...data,
      completed: data.completed || false,
      createdAt: new Date(),
    };
    this.todos.push(newTodo);
    console.log('[TodoService] Created:', newTodo);
    return newTodo;
  }

  // Read All (GET /todos)
  @Crud({ method: 'GET', path: '/' })
  async getAllTodos(
    @Query('completed') completed?: string // Example: /todos?completed=true
  ): Promise<Todo[]> {
    if (completed !== undefined) {
      const isCompleted = completed === 'true';
      return this.todos.filter(todo => todo.completed === isCompleted);
    }
    console.log('[TodoService] Fetched all todos');
    return this.todos;
  }

  // Read One (GET /todos/:id)
  @Crud({ method: 'GET', path: '/:id' })
  async getTodoById(@Params('id') id: string): Promise<Todo> {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) {
      throw new NotFoundException(`Todo with ID ${id} not found.`);
    }
    console.log(`[TodoService] Fetched by ID ${id}:`, todo);
    return todo;
  }

  // Update (PUT /todos/:id or PATCH /todos/:id)
  @Crud({ method: 'PATCH', path: '/:id', schema: UpdateTodoSchema })
  async updateTodo(
    @Params('id') id: string,
    @Body() data: UpdateTodoPayload
  ): Promise<Todo> {
    const todoIndex = this.todos.findIndex(t => t.id === id);
    if (todoIndex === -1) {
      throw new NotFoundException(`Todo with ID ${id} not found for update.`);
    }
    this.todos[todoIndex] = { ...this.todos[todoIndex], ...data };
    console.log(`[TodoService] Updated ID ${id}:`, this.todos[todoIndex]);
    return this.todos[todoIndex];
  }

  // Delete (DELETE /todos/:id)
  @Crud({ method: 'DELETE', path: '/:id' })
  async deleteTodo(@Params('id') id: string): Promise<{ message: string }> {
    const todoIndex = this.todos.findIndex(t => t.id === id);
    if (todoIndex === -1) {
      throw new NotFoundException(`Todo with ID ${id} not found for deletion.`);
    }
    this.todos.splice(todoIndex, 1);
    console.log(`[TodoService] Deleted ID ${id}`);
    return { message: `Todo with ID ${id} deleted successfully.` };
  }
}
```

## 3. Create Custom Error (Optional but good practice)

Create `src/errors/NotFoundException.ts` (as used in `TodoService`):
```typescript
import { HttpException } from './HttpException'; // We'll create this base class too

export class NotFoundException extends HttpException {
  constructor(message: string = 'Resource not found', details?: any) {
    super(404, message, details);
    Object.setPrototypeOf(this, NotFoundException.prototype);
  }
}
```
And `src/errors/HttpException.ts`:
```typescript
export class HttpException extends Error {
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, HttpException.prototype);
  }
}
```

## 4. Update Main Application File

Modify `src/index.ts` to use `TodoService` and configure `WebServiceTransportAdapter` if needed (though `@webservice` decorator often handles basic setup).

```typescript
import 'reflect-metadata'; // Must be the first import
import { Microservice } from '@arifwidianto/dawai-microservice';
import { MicroserviceOptions } from '@arifwidianto/dawai-common';
import { TodoService } from './services/TodoService.service'; // Import your new service

async function bootstrap() {
  const options: MicroserviceOptions = {
    webservice: {
      enabled: true, // Ensure webservice is globally enabled
      port: parseInt(process.env.PORT, 10) || 3000,
      options: {
        // Global webservice options can go here
        // e.g., global basePath, cors settings
        // The @webservice decorator on TodoService will also apply
      }
    },
    // stdio: { enabled: false } // Disable stdio if not needed for this API
  };

  // Pass your TodoService to the Microservice constructor
  const app = new Microservice(TodoService, options);

  try {
    await app.bootstrap();
    await app.listen();
    console.log(`MyRestApi is running on port ${options.webservice.port}`);
    console.log(`Todo API available at http://localhost:${options.webservice.port}/todos`);
  } catch (error) {
    console.error('Failed to start the application:', error);
    process.exit(1);
  }
}

bootstrap();
```

## 5. Install Dependencies

We used `zod`. Make sure it's installed:
```bash
npm install zod
# or
yarn add zod
```
If you don't have `crypto.randomUUID()` (Node.js < 19), you might need `uuid`:
```bash
npm install uuid @types/uuid
# Then in TodoService:
# import { v4 as uuidv4 } from 'uuid';
# id: uuidv4(),
```

## 6. Running and Testing the API

1.  **Build the application:**
    ```bash
    npm run build
    ```
2.  **Start the application:**
    ```bash
    npm start # Assuming "start": "node dist/index.js" in package.json
    ```

Now you can test your API endpoints using Postman, curl, or any HTTP client:

*   **POST `/todos`**: Create a new todo.
    *   Body (JSON): `{"title": "Learn Dawai", "completed": false}`
*   **GET `/todos`**: Get all todos.
*   **GET `/todos?completed=true`**: Get all completed todos.
*   **GET `/todos/:id`**: Get a specific todo by its ID.
*   **PATCH `/todos/:id`**: Update a todo.
    *   Body (JSON): `{"title": "Learn Dawai Framework Thoroughly", "completed": true}`
*   **DELETE `/todos/:id`**: Delete a todo.

**Example with `curl`:**

```bash
# Create a todo
curl -X POST -H "Content-Type: application/json" -d '{"title":"Buy milk"}' http://localhost:3000/todos

# Get all todos
curl http://localhost:3000/todos

# Get a specific todo (replace <TODO_ID> with an actual ID from the GET response)
# curl http://localhost:3000/todos/<TODO_ID>
```

## 7. Input Validation in Action

Try sending invalid data to the `POST /todos` endpoint:
*   Missing `title`: `{"completed": false}`
*   `title` as a number: `{"title": 123}`
You should receive a `400 Bad Request` response with details about the validation errors, thanks to the Zod schemas.

## Conclusion

This tutorial demonstrated how to quickly set up a REST API with Dawai, including routing, request handling, parameter injection, and input validation. You can expand on this foundation by adding more services, more complex business logic, authentication middleware, and database integration.

Refer to the [Guides](../guides/index.md) for more in-depth information on specific topics.
