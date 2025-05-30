// dawai-framework/examples/task-management-service/src/main.ts
import {
  type PluginContext,
  mcpMethod,
  llmTool,
  Microservice,
  discoverAndRegisterMethods,
} from "@arifwidianto/dawai-microservice";

// Task interface and TaskService class definitions remain here

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed";
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskService {
  private tasks: Task[] = [];

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  constructor() {
    console.log("[TaskService] Instance created.");
  }

  @mcpMethod({ name: "tasks.add", description: "Adds a new task." })
  public addTask(ctx: PluginContext, title: string, description: string): Task {
    console.log(
      `[TaskService] addTask called by microservice '${ctx.name ?? "UnknownService"}' (transport: ${ctx.transportType ?? "unknown"}). Title: ${title}`
    );
    const newTask: Task = {
      id: this.generateId(),
      title,
      description,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.push(newTask);
    console.log(`[TaskService] Task added with ID: ${newTask.id}`);
    return newTask;
  }

  @mcpMethod({ name: "tasks.get", description: "Retrieves a specific task by its ID." })
  public getTask(ctx: PluginContext, id: string): Task | undefined {
    console.log(
      `[TaskService] getTask called by microservice '${ctx.name ?? "UnknownService"}' (transport: ${ctx.transportType ?? "unknown"}). Task ID: ${id}`
    );
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      console.log(`[TaskService] Task found: ${task.title}`);
      return { ...task };
    } else {
      console.log(`[TaskService] Task with ID ${id} not found.`);
    }
    return undefined;
  }

  @mcpMethod({ name: "tasks.list", description: "Lists all tasks, optionally filtered by status." })
  public listTasks(ctx: PluginContext, status?: "pending" | "completed"): Task[] {
    console.log(
      `[TaskService] listTasks called by microservice '${ctx.name ?? "UnknownService"}' (transport: ${ctx.transportType ?? "unknown"}). Status filter: ${status || "none"}`
    );
    if (status) {
      const filteredTasks = this.tasks.filter((t) => t.status === status);
      console.log(`[TaskService] Found ${filteredTasks.length} tasks with status '${status}'.`);
      return filteredTasks.map((t) => ({ ...t }));
    }
    console.log(`[TaskService] Returning all ${this.tasks.length} tasks.`);
    return this.tasks.map((t) => ({ ...t }));
  }

  @mcpMethod({ name: "tasks.complete", description: "Marks a task as completed." })
  public completeTask(ctx: PluginContext, id: string): Task | undefined {
    console.log(
      `[TaskService] completeTask called by microservice '${ctx.name ?? "UnknownService"}' (transport: ${ctx.transportType ?? "unknown"}). Task ID: ${id}`
    );
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      if (task.status === "pending") {
        task.status = "completed";
        task.updatedAt = new Date();
        console.log(`[TaskService] Task ${id} marked as completed.`);
        return task;
      } else {
        console.log(`[TaskService] Task ${id} is already completed.`);
        return task; // Or return undefined if strictly only pending can be "completed"
      }
    }
    console.log(`[TaskService] Task with ID ${id} not found for completion.`);
    return undefined;
  }

  @llmTool({ name: "ai_categorize_task", description: "Suggests a category for a task using AI." })
  @mcpMethod({
    name: "tasks.categorize",
    description: "Assigns a category to a task (can be AI-driven).",
  })
  public categorizeTask(ctx: PluginContext, id: string, categoryGuess: string): Task | undefined {
    console.log(
      `[TaskService] AI categorizeTask called by microservice '${ctx.name ?? "UnknownService"}' (transport: ${ctx.transportType ?? "unknown"}). Task ID: ${id}, Category: ${categoryGuess}`
    );
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.category = categoryGuess;
      task.updatedAt = new Date();
      console.log(`[TaskService] Task ${id} categorized as '${categoryGuess}'.`);
      return task;
    }
    console.log(`[TaskService] Task with ID ${id} not found for categorization.`);
    return undefined;
  }
}

// Example of how this service might be instantiated and used (will be done in the microservice setup later)
// const taskServiceInstance = new TaskService();
// console.log('[TaskService] TaskService instance ready for use by a microservice.');

async function main(): Promise<void> {
  const transportType = process.argv[2] === "rpc" ? "rpc" : "stdio";
  console.log(`[Main] Starting Task Management Service setup with ${transportType.toUpperCase()} transport...`);

  const taskMicroservice = new Microservice({
    name: "TaskManagementService",
    transport: transportType,
    // rpcOptions: transportType === "rpc" ? { port: 8080 } : undefined, // Example if specific options needed
  });

  const taskServiceLogic = new TaskService();
  // discoverAndRegisterMethods will use the Microservice instance passed to it.
  discoverAndRegisterMethods(taskServiceLogic, taskMicroservice);

  taskMicroservice.use(async (ctx: PluginContext) => {
    let commandName = "N/A";
    let commandArgs = "N/A";

    // Safely access properties based on transport type
    if (ctx.transportType === "stdio" && ctx.stdioContext?.rawInput) {
      // Assuming discoverAndRegisterMethods registers by property name for stdio
      // And assuming rawInput is split into command and args by the stdio adapter
      // This part needs alignment with how StdIOTransportAdapter provides request info
      // For now, let's assume ctx.plugin.request is populated correctly by the adapter
      const request = ctx.plugin.request as { command?: string; args?: string[] }; // Type assertion
      commandName = request.command ?? "N/A";
      commandArgs = request.args?.join(", ") || "";
    } else if (ctx.transportType === "rpc" && ctx.rpcContext?.rawRequest) {
      commandName = ctx.rpcContext.rawRequest.method ?? "N/A";
      commandArgs = ctx.rpcContext.rawRequest.args?.join(", ") || "";
    }
    console.log(
      `[Middleware] Received command: ${commandName}, Args: ${commandArgs}, Transport: ${ctx.transportType ?? "unknown"}`
    );

    const methodEntry = taskMicroservice.getMethods().get(commandName);
    if (methodEntry?.decorators) {
      console.log(`[Middleware] Decorator metadata for '${commandName}':`, methodEntry.decorators);
    }

    await ctx.plugin.next();

    if (ctx.plugin.response) {
      console.log(`[Middleware] Response generated:`, ctx.plugin.response);
    }
  });

  taskMicroservice.on("onBeforeStart", () =>
    console.log(`[${taskMicroservice.name ?? "TaskService"}] Event: onBeforeStart`)
  );
  taskMicroservice.on("onAfterStart", () => {
    if (transportType === "rpc") {
      console.log(
        `[${taskMicroservice.name ?? "TaskService"}] Event: onAfterStart. RPC Service listening on default port 8080.`
      );
    } else {
      console.log(
        `[${taskMicroservice.name ?? "TaskService"}] Event: onAfterStart. StdIO Service is ready for commands.`
      );
    }
  });
  taskMicroservice.on("onBeforeStop", () =>
    console.log(`[${taskMicroservice.name ?? "TaskService"}] Event: onBeforeStop`)
  );
  taskMicroservice.on("onAfterStop", () =>
    console.log(`[${taskMicroservice.name ?? "TaskService"}] Event: onAfterStop`)
  );
  taskMicroservice.on("onError", (err, eventName) =>
    console.error(
      `[${taskMicroservice.name ?? "TaskService"}] Event: onError during ${eventName?.toString() || "operation"}:`,
      err
    )
  );

  try {
    await taskMicroservice.start();
    console.log(
      `[${taskMicroservice.name ?? "TaskService"}] Service started successfully with ${transportType.toUpperCase()} transport.`
    );
    if (transportType === "stdio") {
      console.log(`Try commands like:`);
      console.log(`  addTask "Buy Groceries" "Milk, Eggs, Bread"`);
      console.log(`  listTasks`);
      console.log(`  getTask <task_id>`);
      console.log(`  completeTask <task_id>`);
      console.log(`  categorizeTask <task_id> "Personal"`);
      console.log(`  exit`);
    }
  } catch (error) {
    console.error(
      `[${taskMicroservice.name ?? "TaskService"}] Failed to start with ${transportType.toUpperCase()} transport:`,
      error
    );
    process.exit(1);
  }
}

void main().catch(console.error);
