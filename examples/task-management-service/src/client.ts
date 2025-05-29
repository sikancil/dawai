// examples/task-management-service/src/client.ts
import WebSocket from "ws";

interface RpcRequest {
  type: "call";
  method: string;
  args: unknown[];
  id: string;
}

interface RpcResponse {
  id: string;
  result?: unknown;
  error?: string;
}

class TaskManagementClient {
  private ws: WebSocket;
  private readonly url: string;

  constructor(url = "ws://localhost:8080") {
    this.url = url;
    this.ws = new WebSocket(url);
  }

  private sendRpc(method: string, args: unknown[] = []): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error("Connection not open"));
      }

      const id = Date.now().toString() + Math.random().toString(16).slice(2);
      const request: RpcRequest = { type: "call", method, args, id };

      const timeout = setTimeout(() => {
        this.ws.removeListener("message", onMessage);
        reject(new Error(`Request timed out for method ${method}`));
      }, 10000);

      const onMessage = (data: WebSocket.Data): void => {
        try {
          const responseData: string =
            data instanceof Buffer
              ? data.toString()
              : data instanceof ArrayBuffer
                ? Buffer.from(data).toString()
                : data.toString();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const response: RpcResponse = JSON.parse(responseData);
          if (response.id === id) {
            clearTimeout(timeout);
            this.ws.removeListener("message", onMessage);

            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          clearTimeout(timeout);
          this.ws.removeListener("message", onMessage);
          reject(new Error(`Failed to parse response: ${(error as Error).message}`));
        }
      };

      this.ws.on("message", onMessage);

      this.ws.send(JSON.stringify(request), (error) => {
        if (error) {
          clearTimeout(timeout);
          this.ws.removeListener("message", onMessage);
          reject(new Error(`Failed to send request: ${error.message}`));
        }
      });
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 5000);

      this.ws.once("open", () => {
        clearTimeout(timeout);
        console.log(`[Client] Connected to Task Management Service at ${this.url}`);
        resolve();
      });

      this.ws.once("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Connection failed: ${error.message}`));
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.once("close", () => {
          console.log("[Client] Disconnected from Task Management Service");
          resolve();
        });
        this.ws.close(1000); // Normal closure
      } else {
        resolve();
      }
    });
  }

  // Task Management Service Methods
  async addTask(title: string, description: string): Promise<unknown> {
    console.log(`[Client] Adding task: "${title}"`);
    return this.sendRpc("addTask", [title, description]);
  }

  async getTask(id: string): Promise<unknown> {
    console.log(`[Client] Getting task: ${id}`);
    return this.sendRpc("getTask", [id]);
  }

  async listTasks(status?: "pending" | "completed"): Promise<unknown> {
    console.log(`[Client] Listing tasks${status ? ` with status: ${status}` : ""}`);
    return this.sendRpc("listTasks", status ? [status] : []);
  }

  async completeTask(id: string): Promise<unknown> {
    console.log(`[Client] Completing task: ${id}`);
    return this.sendRpc("completeTask", [id]);
  }

  async categorizeTask(id: string, category: string): Promise<unknown> {
    console.log(`[Client] Categorizing task ${id} as: ${category}`);
    return this.sendRpc("categorizeTask", [id, category]);
  }
}

async function demonstrateTaskManagement(): Promise<void> {
  const client = new TaskManagementClient();

  try {
    await client.connect();

    console.log("\n=== Task Management Service Demo ===\n");

    // Add some tasks
    const task1 = await client.addTask(
      "Learn DAWAI Framework",
      "Study the microservice framework documentation and examples"
    );
    console.log("✅ Added Task 1:", JSON.stringify(task1, null, 2));

    const task2 = await client.addTask("Build Sample App", "Create a demo application using DAWAI");
    console.log("✅ Added Task 2:", JSON.stringify(task2, null, 2));

    const task3 = await client.addTask("Write Tests", "Add comprehensive test coverage");
    console.log("✅ Added Task 3:", JSON.stringify(task3, null, 2));

    // List all tasks
    console.log("\n--- Listing All Tasks ---");
    const allTasks = await client.listTasks();
    console.log("📋 All Tasks:", JSON.stringify(allTasks, null, 2));

    // Get specific task
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const taskId: string = (task1 as any)?.id;
    if (taskId) {
      console.log("\n--- Getting Specific Task ---");
      const specificTask = await client.getTask(taskId);
      console.log("🔍 Specific Task:", JSON.stringify(specificTask, null, 2));
    }

    // Complete a task
    if (taskId) {
      console.log("\n--- Completing Task ---");
      const completedTask = await client.completeTask(taskId);
      console.log("✅ Completed Task:", JSON.stringify(completedTask, null, 2));
    }

    // Categorize a task (demonstrates @llmTool decorator)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const task2Id: string = (task2 as any)?.id;
    if (task2Id) {
      console.log("\n--- Categorizing Task (AI/LLM Feature) ---");
      const categorizedTask = await client.categorizeTask(task2Id, "Development");
      console.log("🏷️ Categorized Task:", JSON.stringify(categorizedTask, null, 2));
    }

    // List completed tasks
    console.log("\n--- Listing Completed Tasks ---");
    const completedTasks = await client.listTasks("completed");
    console.log("✅ Completed Tasks:", JSON.stringify(completedTasks, null, 2));

    // List pending tasks
    console.log("\n--- Listing Pending Tasks ---");
    const pendingTasks = await client.listTasks("pending");
    console.log("⏳ Pending Tasks:", JSON.stringify(pendingTasks, null, 2));

    console.log("\n🎉 Demo completed successfully!");
  } catch (error) {
    console.error("❌ Demo failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

async function main(): Promise<void> {
  console.log("🚀 Starting Task Management Service RPC Client Demo");
  console.log("📡 Connecting to RPC server at ws://localhost:8080");
  console.log("⚠️  Make sure the server is running: npm run start:rpc:server\n");

  await demonstrateTaskManagement();
}

// Handle graceful shutdown
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/require-await
process.on("SIGINT", async (): Promise<void> => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/require-await
process.on("SIGTERM", async (): Promise<void> => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Run the demo
void main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
