# TERMINAL-1
```
@sikancil ➜ /workspaces/dawai/examples/task-management-service (feat/microservice-core-enhancements) $ npm run start:rpc:server

> @arifwidianto/dawai-example-task-management-service@0.0.1 start:rpc:server
> tsx src/main.ts rpc

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

***

# TERMINAL-2
```
@sikancil ➜ /workspaces/dawai/examples/task-management-service (feat/microservice-core-enhancements) $ npm run start:rpc:client

> @arifwidianto/dawai-example-task-management-service@0.0.1 start:rpc:client
> tsx src/client.ts

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
