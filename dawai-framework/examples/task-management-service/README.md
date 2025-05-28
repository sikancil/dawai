# Task Management Service Example (StdIO & RPC)

This example demonstrates a simple Task Management microservice built using the DAWAI Framework, showcasing decorator-based method registration and support for both StdIO and RPC transports.

## Features Demonstrated

-   **Microservice Core**: Basic setup of a `@arifwidianto/dawai-microservice`.
-   **Decorators**: Usage of `@mcpMethod` and `@llmTool` to define and expose service methods.
-   **`discoverAndRegisterMethods`**: Automatic registration of decorated methods from a service class.
-   **`PluginContext.methods`**: Accessing method metadata within middleware.
-   **StdIO Transport**: Interacting with the service via the command line.
-   **RPC Transport**: Interacting with the service via WebSocket RPC.
-   **In-Memory Data**: Tasks are stored in memory and will be lost when the service stops.

## Prerequisites

-   Node.js (version compatible with the monorepo, e.g., v18+)
-   NPM or Yarn (consistent with the monorepo)
-   The DAWAI Framework monorepo should be cloned and built (at least the `@arifwidianto/dawai-microservice` package).

## Setup

1.  **Navigate to the example directory:**
    ```bash
    cd examples/task-management-service
    ```

2.  **Install dependencies:**
    If you are in an Nx monorepo and dependencies are hoisted, this step might not be strictly necessary. However, if this example were standalone or if direct dependencies are preferred:
    ```bash
    npm install
    # or
    # yarn install
    ```
    *(Note: The `package.json` references `@arifwidianto/dawai-microservice` using `workspace:^`, so ensure your monorepo's package manager has linked it correctly, e.g., via `npm install` or `yarn install` at the monorepo root).*

## Running the Service

You can run the service with either StdIO (default) or RPC transport.

**StdIO (Default):**
```bash
npm start
# or
# ts-node src/main.ts
```

**RPC Transport:**
The RPC transport will start a WebSocket server on `ws://localhost:8080` by default.
```bash
npm start -- rpc
# or
# ts-node src/main.ts rpc
```
*(Note: The `--` after `npm start` is to ensure `rpc` is passed as an argument to the script, not to npm itself.)*

## Interacting with the Service (StdIO Commands)

If running with StdIO transport, you will see a prompt like `TaskManagementService> `. You can then type commands. Method names are the actual class method names from `TaskService` because `discoverAndRegisterMethods` registers them using these names.

**Available commands:**

*   **Add a new task:**
    *   Syntax: `addTask "<title>" "<description>"`
    *   Example: `addTask "Buy Milk" "Get fresh milk from the store"`
*   **Get a specific task by ID:**
    *   Syntax: `getTask "<task_id>"`
    *   Example: `getTask "generated_task_id_here"`
*   **List all tasks (optionally filter by status):**
    *   Syntax: `listTasks [pending|completed]`
    *   Example: `listTasks` or `listTasks pending`
*   **Complete a task:**
    *   Syntax: `completeTask "<task_id>"`
    *   Example: `completeTask "generated_task_id_here"`
*   **Categorize a task:**
    *   Syntax: `categorizeTask "<task_id>" "<category_guess>"`
    *   Example: `categorizeTask "generated_task_id_here" "Household"`
*   **Exit the service:**
    *   `exit`

**Example StdIO Interaction Flow:**
```
TaskManagementService> addTask "Finish report" "Complete the Q3 sales report"
[Main] Starting Task Management Service setup with STDIO transport...
[Middleware] Received command: addTask, Args: "Finish report", "Complete the Q3 sales report", Transport: stdio
[TaskService] addTask called by microservice 'TaskManagementService' (transport: stdio). Title: "Finish report"
[TaskService] Task added with ID: generated_id_1
[Middleware] Response generated: { id: 'generated_id_1', title: 'Finish report', ... }
{
  "id": "generated_id_1",
  "title": "Finish report",
  "description": "Complete the Q3 sales report",
  "status": "pending",
  "createdAt": "2023-10-27T10:00:00.000Z",
  "updatedAt": "2023-10-27T10:00:00.000Z"
}
TaskManagementService> listTasks
...
TaskManagementService> categorizeTask "generated_id_1" "Work"
[Middleware] Received command: categorizeTask, Args: "generated_id_1", "Work", Transport: stdio
[Middleware] Decorator metadata for 'categorizeTask': { llmTool: { name: 'ai_categorize_task', description: 'Suggests a category for a task using AI.' }, mcpMethod: { name: 'tasks.categorize', description: 'Assigns a category to a task (can be AI-driven).' } }
[TaskService] AI categorizeTask called by microservice 'TaskManagementService' (transport: stdio). Task ID: "generated_id_1", Category: "Work"
[TaskService] Task "generated_id_1" categorized as 'Work'.
[Middleware] Response generated: { id: 'generated_id_1', ..., category: 'Work', ... }
...
TaskManagementService> exit
```

## Interacting with the Service (RPC)

If you run the service with RPC transport, you can use a WebSocket client to interact with it. Method names for RPC calls should also be the actual class method names (e.g., `addTask`, `listTasks`) for consistency with the current registration mechanism.

**Example Node.js RPC Client (`client.js`):**

Create a file named `client.js` (or similar) in the `examples/task-management-service/` directory with the following content:

```javascript
// client.js
const WebSocket = require('ws'); // Run `npm install ws` or `yarn add ws` in the example dir or monorepo root

const wsUrl = 'ws://localhost:8080';
const ws = new WebSocket(wsUrl);

function sendRpc(method, args) {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      ws.close(); // Attempt to close before rejecting
      return reject(new Error('Connection not open. Client has been closed.'));
    }
    const id = Date.now().toString() + Math.random().toString(16).slice(2);
    const payload = JSON.stringify({ type: 'call', method, args, id });

    const onMessage = (data) => {
      try {
        const response = JSON.parse(data);
        if (response.id === id) {
          ws.removeListener('message', onMessage);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.result);
          }
        }
      } catch (e) {
        ws.removeListener('message', onMessage); // Clean up listener on error
        reject(new Error(`Failed to parse response: ${data}. Error: ${e.message}`));
      }
    };
    ws.on('message', onMessage);

    // Handle timeout for the request
    const timeout = setTimeout(() => {
        ws.removeListener('message', onMessage);
        reject(new Error(`Request timed out for method ${method} with id ${id}`));
    }, 10000); // 10 seconds timeout

    ws.send(payload, (err) => {
        if (err) {
            clearTimeout(timeout);
            ws.removeListener('message', onMessage);
            reject(new Error(`Failed to send payload: ${err.message}`));
        }
    });
  });
}

ws.on('open', async () => {
  console.log('Connected to RPC Task Service');
  try {
    // Using actual class method names as registered by discoverAndRegisterMethods
    const task = await sendRpc('addTask', ['RPC Task', 'Via WebSocket']);
    console.log('Added Task:', task);
    const taskId = task.id;

    const tasks = await sendRpc('listTasks', []);
    console.log('All tasks:', tasks);

    // Example of calling categorizeTask, which has decorators.
    // The client calls 'categorizeTask', the actual method name.
    // The middleware in the service will log the decorators for 'categorizeTask'.
    const categorizedTask = await sendRpc('categorizeTask', [taskId, 'Tech']);
    console.log('Categorized Task:', categorizedTask);

  } catch (error) {
    console.error('RPC Error:', error.message);
  } finally {
    if (ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
  }
});

ws.on('error', (err) => console.error('WebSocket Error:', err.message));
ws.on('close', () => console.log('Disconnected from RPC Task Service'));
```

**Running the Client:**

1.  Ensure the Task Management service is running with RPC transport (`npm start -- rpc`).
2.  Open a new terminal in `examples/task-management-service/` and run:
    ```bash
    node client.js
    ```

## Code Structure

-   `src/main.ts`: Contains the `Task` interface, `TaskService` class (with business logic and decorators), and the main microservice setup and execution logic for both StdIO and RPC transports.
-   `package.json`: Project dependencies and scripts.
-   `tsconfig.json`: TypeScript configuration.
-   `client.js` (Optional): Example RPC client, not part of the service itself.

This example is intended for educational purposes to demonstrate core framework features.
