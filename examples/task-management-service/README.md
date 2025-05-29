# Task Management Service Example

This example demonstrates a comprehensive Task Management microservice built using the DAWAI Framework, showcasing decorator-based method registration with support for both STDIO and RPC transports in a single service implementation.

## Features Demonstrated

- **Dual Transport Support**: Single service implementation supporting both STDIO and RPC transports
- **Decorator System**: Usage of `@mcpMethod` and `@llmTool` decorators to define and expose service methods
- **Automatic Registration**: `discoverAndRegisterMethods` automatically registers all decorated methods
- **Method Metadata**: Access to decorator metadata within middleware through `PluginContext`
- **Lifecycle Events**: Complete microservice lifecycle with event handlers
- **In-Memory Storage**: Task persistence during service runtime (data is lost on restart)
- **Type Safety**: Full TypeScript implementation with proper interfaces

## Prerequisites

- Node.js (version 18+)
- The DAWAI Framework monorepo properly built
- All dependencies installed at the monorepo root

## Quick Start

**From the monorepo root:**

```bash
# STDIO mode (default - command-line interface)
npm run example:03:start

# RPC server mode (separate terminals)
# Terminal 1: Start RPC server
npm run example:03:start:rpc:server

# RPC server's client (separate terminals)
# Terminal 2: Run RPC client demo
npm run example:03:start:rpc:client
```

**From the example directory:**

```bash
cd examples/task-management-service

# STDIO mode (default)
npm start

# RPC mode 
npm start:rpc:server
# or
npm run start -- rpc
```

## STDIO Transport Usage

When running in STDIO mode, the service provides an interactive command-line interface. Commands use actual method names from the `TaskService` class.

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `addTask <title> <description>` | Add a new task | `addTask "Buy Milk" "Get fresh milk from store"` |
| `getTask <id>` | Get a specific task by ID | `getTask mb97jz7kv7zdozgrg9c` |
| `listTasks [status]` | List all tasks or filter by status | `listTasks` or `listTasks pending` |
| `completeTask <id>` | Mark a task as completed | `completeTask mb97jz7kv7zdozgrg9c` |
| `categorizeTask <id> <category>` | Assign a category to a task | `categorizeTask mb97jz7kv7zdozgrg9c Personal` |
| `exit` | Stop the service | `exit` |

### Expected STDIO Output

```bash
[Main] Starting Task Management Service setup with STDIO transport...
Microservice 'TaskManagementService' initialized with transport 'stdio'.
[TaskService] Instance created.
[TaskManagementService] Event: onBeforeStart
Microservice 'TaskManagementService' starting...
StdIOTransportAdapter for 'TaskManagementService' starting...
TaskManagementService> StdIOTransportAdapter for 'TaskManagementService' started. Type 'exit' to stop.
[TaskManagementService] Event: onAfterStart. StdIO Service is ready for commands.
Microservice 'TaskManagementService' has started.
[TaskManagementService] Service started successfully with STDIO transport.
Try commands like:
  addTask "Buy Groceries" "Milk, Eggs, Bread"
  listTasks
  getTask <task_id>
  completeTask <task_id>
  categorizeTask <task_id> "Personal"
  exit
```

**Sample interaction:**

```bash
TaskManagementService> addTask "Buy Groceries" "Milk, Eggs, Bread"
[TaskService] addTask called by microservice 'TaskManagementService' (transport: stdio). Title: "Buy
[TaskService] Task added with ID: mb97jz7kv7zdozgrg9c
{
  "id": "mb97jz7kv7zdozgrg9c",
  "title": "\"Buy",
  "description": "Groceries\"", 
  "status": "pending",
  "createdAt": "2025-05-29T10:05:00.800Z",
  "updatedAt": "2025-05-29T10:05:00.800Z"
}

TaskManagementService> listTasks
[TaskService] listTasks called by microservice 'TaskManagementService' (transport: stdio). Status filter: none
[TaskService] Returning all 1 tasks.
[
  {
    "id": "mb97jz7kv7zdozgrg9c",
    "title": "\"Buy",
    "description": "Groceries\"",
    "status": "pending",
    "createdAt": "2025-05-29T10:05:00.800Z",
    "updatedAt": "2025-05-29T10:05:00.800Z"
  }
]

TaskManagementService> categorizeTask mb97jz7kv7zdozgrg9c Personal
[TaskService] AI categorizeTask called by microservice 'TaskManagementService' (transport: stdio). Task ID: mb97jz7kv7zdozgrg9c, Category: Personal
[TaskService] Task mb97jz7kv7zdozgrg9c categorized as 'Personal'.
{
  "id": "mb97jz7kv7zdozgrg9c",
  "title": "\"Buy",
  "description": "Groceries\"",
  "status": "pending",
  "createdAt": "2025-05-29T10:05:00.800Z",
  "updatedAt": "2025-05-29T10:06:21.474Z",
  "category": "Personal"
}
```

**Note**: There is currently a known issue with argument parsing in STDIO mode where quoted arguments are not properly handled, causing titles and descriptions to be split incorrectly.

## RPC Transport Usage

When running in RPC mode, the service starts a WebSocket server on `localhost:8080`.

### Expected RPC Server Output

```bash
[Main] Starting Task Management Service setup with RPC transport...
Microservice 'TaskManagementService' initialized with transport 'rpc'.
[TaskService] Instance created.
[TaskManagementService] Event: onBeforeStart
Microservice 'TaskManagementService' starting...
RPCTransportAdapter for 'TaskManagementService' starting on port 8080...
RPCTransportAdapter for 'TaskManagementService' listening on ws://localhost:8080
[TaskManagementService] Event: onAfterStart. RPC Service listening on default port 8080.
Microservice 'TaskManagementService' has started.
[TaskManagementService] Service started successfully with RPC transport.

# When client connects and performs operations:
RPC client connected to 'TaskManagementService'.
[TaskService] addTask called by microservice 'TaskManagementService' (transport: rpc). Title: Learn DAWAI Framework
[TaskService] Task added with ID: mb98a5k4li7x6973l3o
[TaskService] addTask called by microservice 'TaskManagementService' (transport: rpc). Title: Build Sample App
[TaskService] Task added with ID: mb98a5k6k0fvr2mqmd
[TaskService] addTask called by microservice 'TaskManagementService' (transport: rpc). Title: Write Tests
[TaskService] Task added with ID: mb98a5k8kj0x5rx56gt
[TaskService] listTasks called by microservice 'TaskManagementService' (transport: rpc). Status filter: none
[TaskService] Returning all 3 tasks.
[TaskService] getTask called by microservice 'TaskManagementService' (transport: rpc). Task ID: mb98a5k4li7x6973l3o
[TaskService] Task found: Learn DAWAI Framework
[TaskService] completeTask called by microservice 'TaskManagementService' (transport: rpc). Task ID: mb98a5k4li7x6973l3o
[TaskService] Task mb98a5k4li7x6973l3o marked as completed.
[TaskService] AI categorizeTask called by microservice 'TaskManagementService' (transport: rpc). Task ID: mb98a5k6k0fvr2mqmd, Category: Development
[TaskService] Task mb98a5k6k0fvr2mqmd categorized as 'Development'.
[TaskService] listTasks called by microservice 'TaskManagementService' (transport: rpc). Status filter: completed
[TaskService] Found 1 tasks with status 'completed'.
[TaskService] listTasks called by microservice 'TaskManagementService' (transport: rpc). Status filter: pending
[TaskService] Found 2 tasks with status 'pending'.
RPC client disconnected from 'TaskManagementService'.
```

### Sample RPC Client

Create a `client.js` file to test the RPC interface:

```javascript
// client.js - Simple RPC client example
const WebSocket = require("ws");

const ws = new WebSocket("ws://localhost:8080");

function sendRpc(method, args) {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      return reject(new Error("Connection not open"));
    }
    
    const id = Date.now().toString() + Math.random().toString(16).slice(2);
    const payload = JSON.stringify({ type: "call", method, args, id });

    const onMessage = (data) => {
      try {
        const response = JSON.parse(data);
        if (response.id === id) {
          ws.removeListener("message", onMessage);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.result);
          }
        }
      } catch (e) {
        ws.removeListener("message", onMessage);
        reject(new Error(`Failed to parse response: ${e.message}`));
      }
    };
    
    ws.on("message", onMessage);
    ws.send(payload);
  });
}

ws.on("open", async () => {
  console.log("Connected to Task Management Service");
  
  try {
    // Add a task
    const task = await sendRpc("addTask", ["Learn DAWAI", "Study the framework documentation"]);
    console.log("Added Task:", task);
    
    // List all tasks
    const tasks = await sendRpc("listTasks", []);
    console.log("All Tasks:", tasks);
    
    // Categorize the task (demonstrates dual decorator usage)
    const categorized = await sendRpc("categorizeTask", [task.id, "Education"]);
    console.log("Categorized Task:", categorized);
    
  } catch (error) {
    console.error("RPC Error:", error.message);
  } finally {
    ws.close(1000); // Normal closure
  }
});

ws.on("error", (err) => console.error("WebSocket Error:", err.message));
ws.on("close", () => console.log("Disconnected from Task Management Service"));
```

**Run the TypeScript client demo:**

```bash
# Start the RPC server first (Terminal 1)
npm run start:rpc:server

# Run the TypeScript client demo (Terminal 2)
npm run start:rpc:client
```

### Expected RPC Client Output

```bash
🚀 Starting Task Management Service RPC Client Demo
📡 Connecting to RPC server at ws://localhost:8080
⚠️  Make sure the server is running: npm run start:rpc:server

[Client] Connected to Task Management Service at ws://localhost:8080

=== Task Management Service Demo ===

[Client] Adding task: "Learn DAWAI Framework"
✅ Added Task 1: {
  "id": "mb98a5k4li7x6973l3o",
  "title": "Learn DAWAI Framework",
  "description": "Study the microservice framework documentation and examples",
  "status": "pending",
  "createdAt": "2025-05-29T10:25:22.084Z",
  "updatedAt": "2025-05-29T10:25:22.084Z"
}
[Client] Adding task: "Build Sample App"
✅ Added Task 2: {
  "id": "mb98a5k6k0fvr2mqmd",
  "title": "Build Sample App",
  "description": "Create a demo application using DAWAI",
  "status": "pending",
  "createdAt": "2025-05-29T10:25:22.086Z",
  "updatedAt": "2025-05-29T10:25:22.086Z"
}
[Client] Adding task: "Write Tests"
✅ Added Task 3: {
  "id": "mb98a5k8kj0x5rx56gt",
  "title": "Write Tests",
  "description": "Add comprehensive test coverage",
  "status": "pending",
  "createdAt": "2025-05-29T10:25:22.088Z",
  "updatedAt": "2025-05-29T10:25:22.088Z"
}

--- Listing All Tasks ---
[Client] Listing tasks
📋 All Tasks: [
  {
    "id": "mb98a5k4li7x6973l3o",
    "title": "Learn DAWAI Framework",
    "description": "Study the microservice framework documentation and examples",
    "status": "pending",
    "createdAt": "2025-05-29T10:25:22.084Z",
    "updatedAt": "2025-05-29T10:25:22.084Z"
  },
  {
    "id": "mb98a5k6k0fvr2mqmd",
    "title": "Build Sample App",
    "description": "Create a demo application using DAWAI",
    "status": "pending",
    "createdAt": "2025-05-29T10:25:22.086Z",
    "updatedAt": "2025-05-29T10:25:22.086Z"
  },
  {
    "id": "mb98a5k8kj0x5rx56gt",
    "title": "Write Tests",
    "description": "Add comprehensive test coverage",
    "status": "pending",
    "createdAt": "2025-05-29T10:25:22.088Z",
    "updatedAt": "2025-05-29T10:25:22.088Z"
  }
]

--- Getting Specific Task ---
[Client] Getting task: mb98a5k4li7x6973l3o
🔍 Specific Task: {
  "id": "mb98a5k4li7x6973l3o",
  "title": "Learn DAWAI Framework",
  "description": "Study the microservice framework documentation and examples",
  "status": "pending",
  "createdAt": "2025-05-29T10:25:22.084Z",
  "updatedAt": "2025-05-29T10:25:22.084Z"
}

--- Completing Task ---
[Client] Completing task: mb98a5k4li7x6973l3o
✅ Completed Task: {
  "id": "mb98a5k4li7x6973l3o",
  "title": "Learn DAWAI Framework",
  "description": "Study the microservice framework documentation and examples",
  "status": "completed",
  "createdAt": "2025-05-29T10:25:22.084Z",
  "updatedAt": "2025-05-29T10:25:22.091Z"
}

--- Categorizing Task (AI/LLM Feature) ---
[Client] Categorizing task mb98a5k6k0fvr2mqmd as: Development
🏷️ Categorized Task: {
  "id": "mb98a5k6k0fvr2mqmd",
  "title": "Build Sample App",
  "description": "Create a demo application using DAWAI",
  "status": "pending",
  "createdAt": "2025-05-29T10:25:22.086Z",
  "updatedAt": "2025-05-29T10:25:22.092Z",
  "category": "Development"
}

--- Listing Completed Tasks ---
[Client] Listing tasks with status: completed
✅ Completed Tasks: [
  {
    "id": "mb98a5k4li7x6973l3o",
    "title": "Learn DAWAI Framework",
    "description": "Study the microservice framework documentation and examples",
    "status": "completed",
    "createdAt": "2025-05-29T10:25:22.084Z",
    "updatedAt": "2025-05-29T10:25:22.091Z"
  }
]

--- Listing Pending Tasks ---
[Client] Listing tasks with status: pending
⏳ Pending Tasks: [
  {
    "id": "mb98a5k6k0fvr2mqmd",
    "title": "Build Sample App",
    "description": "Create a demo application using DAWAI",
    "status": "pending",
    "createdAt": "2025-05-29T10:25:22.086Z",
    "updatedAt": "2025-05-29T10:25:22.092Z",
    "category": "Development"
  },
  {
    "id": "mb98a5k8kj0x5rx56gt",
    "title": "Write Tests",
    "description": "Add comprehensive test coverage",
    "status": "pending",
    "createdAt": "2025-05-29T10:25:22.088Z",
    "updatedAt": "2025-05-29T10:25:22.088Z"
  }
]

🎉 Demo completed successfully!
[Client] Disconnected from Task Management Service
```

**Alternative: JavaScript client example:**

```bash
# Install WebSocket dependency
npm install ws

# Run client (ensure service is running in RPC mode first)
node client.js
```

## Service Architecture

### Task Interface

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed";
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### TaskService Methods

The service provides five core methods, all decorated for automatic registration:

- **`addTask(title, description)`**: Creates a new pending task
- **`getTask(id)`**: Retrieves a specific task by ID
- **`listTasks(status?)`**: Lists all tasks, optionally filtered by status
- **`completeTask(id)`**: Marks a task as completed
- **`categorizeTask(id, category)`**: Assigns a category to a task (dual-decorated with `@llmTool`)

### Decorator Usage

The service demonstrates two types of decorators:

- **`@mcpMethod`**: Registers the method for MCP protocol exposure
- **`@llmTool`**: Additional decorator for AI/LLM integration (shown on `categorizeTask`)

## File Structure

```
examples/task-management-service/
├── src/
│   ├── main.ts          # Complete service implementation
│   └── client.ts        # TypeScript RPC client demo
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── eslint.config.js     # Linting configuration
└── README.md            # This documentation
```

## Development Commands

```bash
# Start in STDIO mode
npm start

# Start in RPC mode
npm start -- rpc

# Development mode with auto-restart
npm run dev

# Lint the code
npm run lint

# Format the code
npm run format

# Build TypeScript
npm run build
```

## Known Issues

1. **STDIO Argument Parsing**: Quoted arguments with spaces are not properly parsed, causing title/description splitting
2. **Middleware Logging**: The service doesn't display middleware logs for method metadata like other examples

## Troubleshooting

**Service won't start:**
- Ensure all dependencies are installed: `npm install` in the monorepo root
- Check that the framework packages are built properly
- Verify TypeScript compilation: `npm run build`

**RPC connection fails:**
- Ensure the service is running in RPC mode: `npm start -- rpc`
- Check that port 8080 is available
- Verify WebSocket client dependencies: `npm install ws`

**STDIO commands not recognized:**
- Use exact method names: `addTask`, `listTasks`, `getTask`, etc.
- Check for typos in command names
- Ensure the service has started properly

## Educational Notes

This example showcases:
- **Transport Flexibility**: Same business logic working with different transport mechanisms
- **Decorator Pattern**: Clean separation of concerns with method registration
- **Type Safety**: Full TypeScript integration throughout the service
- **Event-Driven Architecture**: Comprehensive lifecycle event handling
- **Metadata Access**: Runtime access to decorator information in middleware

The implementation demonstrates how the DAWAI Framework enables building transport-agnostic microservices with minimal boilerplate while maintaining type safety and developer experience.
