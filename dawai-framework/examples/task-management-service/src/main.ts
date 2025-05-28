// dawai-framework/examples/task-management-service/src/main.ts
import { PluginContext, mcpMethod, llmTool, MCPMethodOptions, LLMToolOptions, Microservice, discoverAndRegisterMethods } from '@arifwidianto/dawai-microservice';

// Task interface and TaskService class definitions remain here

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
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
    console.log('[TaskService] Instance created.');
  }

  @mcpMethod({ name: 'tasks.add', description: 'Adds a new task.' })
  public addTask(ctx: PluginContext, title: string, description: string): Task {
    console.log(`[TaskService] addTask called by microservice '${ctx.name}' (transport: ${ctx.transportType}). Title: ${title}`);
    const newTask: Task = {
      id: this.generateId(),
      title,
      description,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.push(newTask);
    console.log(`[TaskService] Task added with ID: ${newTask.id}`);
    return newTask;
  }

  @mcpMethod({ name: 'tasks.get', description: 'Retrieves a specific task by its ID.' })
  public getTask(ctx: PluginContext, id: string): Task | undefined {
    console.log(`[TaskService] getTask called by microservice '${ctx.name}' (transport: ${ctx.transportType}). Task ID: ${id}`);
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      console.log(`[TaskService] Task found: ${task.title}`);
    } else {
      console.log(`[TaskService] Task with ID ${id} not found.`);
    }
    return task;
  }

  @mcpMethod({ name: 'tasks.list', description: 'Lists all tasks, optionally filtered by status.' })
  public listTasks(ctx: PluginContext, status?: 'pending' | 'completed'): Task[] {
    console.log(`[TaskService] listTasks called by microservice '${ctx.name}' (transport: ${ctx.transportType}). Status filter: ${status || 'none'}`);
    if (status) {
      const filteredTasks = this.tasks.filter(t => t.status === status);
      console.log(`[TaskService] Found ${filteredTasks.length} tasks with status '${status}'.`);
      return filteredTasks;
    }
    console.log(`[TaskService] Returning all ${this.tasks.length} tasks.`);
    return this.tasks;
  }

  @mcpMethod({ name: 'tasks.complete', description: 'Marks a task as completed.' })
  public completeTask(ctx: PluginContext, id: string): Task | undefined {
    console.log(`[TaskService] completeTask called by microservice '${ctx.name}' (transport: ${ctx.transportType}). Task ID: ${id}`);
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      if (task.status === 'pending') {
        task.status = 'completed';
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

  @llmTool({ name: 'ai_categorize_task', description: 'Suggests a category for a task using AI.' })
  @mcpMethod({ name: 'tasks.categorize', description: 'Assigns a category to a task (can be AI-driven).' })
  public categorizeTask(ctx: PluginContext, id: string, categoryGuess: string): Task | undefined {
    console.log(`[TaskService] AI categorizeTask called by microservice '${ctx.name}' (transport: ${ctx.transportType}). Task ID: ${id}, Category: ${categoryGuess}`);
    const task = this.tasks.find(t => t.id === id);
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

async function main() {
  const transportType = process.argv[2] === 'rpc' ? 'rpc' : 'stdio';
  console.log(`[Main] Starting Task Management Service setup with ${transportType.toUpperCase()} transport...`);

  const taskMicroservice = new Microservice({
    name: 'TaskManagementService',
    transport: transportType,
  });

  const taskServiceLogic = new TaskService();
  discoverAndRegisterMethods(taskServiceLogic, taskMicroservice);

  taskMicroservice.use(async (ctx: PluginContext) => {
    let commandName = 'N/A';
    let commandArgs = 'N/A';

    if (ctx.transportType === 'stdio') {
      commandName = ctx.plugin.request.command;
      commandArgs = ctx.plugin.request.args?.join(', ') || '';
    } else if (ctx.transportType === 'rpc' && ctx.plugin.request.rpcMessage) {
      commandName = ctx.plugin.request.rpcMessage.method;
      commandArgs = ctx.plugin.request.rpcMessage.args?.join(', ') || '';
    }
    console.log(`[Middleware] Received command: ${commandName}, Args: ${commandArgs}, Transport: ${ctx.transportType}`);
    
    // Metadata logging based on commandName
    // For discoverAndRegisterMethods, the method is registered by its class property name (e.g., 'categorizeTask')
    // However, an RPC client might call using the mcpMethod decorator's name (e.g., 'tasks.categorize')
    // The current StdIO adapter calls by the class property name.
    // This example will log metadata if the *called* commandName matches a registered *class method name*
    // or if the called command name matches a decorator name *and* we look up the corresponding class method name.
    // For simplicity, we'll log if the direct commandName (which is propertyName for stdio, or rpc method for rpc) has metadata.
    // If RPC calls 'tasks.categorize', and 'tasks.categorize' is NOT the key in ctx.methods, this won't find it.
    // The current discoverAndRegisterMethods registers by property name (e.g. 'categorizeTask').
    // So, for RPC to trigger this metadata log, it must call 'categorizeTask'.
    // If the RPC client *must* use 'tasks.categorize', the RPC adapter or discovery mechanism would need to map it.
    // The current setup means the client for RPC should call 'categorizeTask', 'addTask', etc.
    const methodEntry = ctx.methods.get(commandName); 
    if (methodEntry) {
      console.log(`[Middleware] Decorator metadata for '${commandName}':`, methodEntry.decorators);
    }


    await ctx.plugin.next();

    if (ctx.plugin.response) {
      console.log(`[Middleware] Response generated:`, ctx.plugin.response);
    }
  });

  taskMicroservice.on('onBeforeStart', () => console.log(`[${taskMicroservice.name}] Event: onBeforeStart`));
  taskMicroservice.on('onAfterStart', () => {
    if (transportType === 'rpc') {
      console.log(`[${taskMicroservice.name}] Event: onAfterStart. RPC Service listening on default port 8080.`);
    } else {
      console.log(`[${taskMicroservice.name}] Event: onAfterStart. StdIO Service is ready for commands.`);
    }
  });
  taskMicroservice.on('onBeforeStop', () => console.log(`[${taskMicroservice.name}] Event: onBeforeStop`));
  taskMicroservice.on('onAfterStop', () => console.log(`[${taskMicroservice.name}] Event: onAfterStop`));
  taskMicroservice.on('onError', (err, eventName) => console.error(`[${taskMicroservice.name}] Event: onError during ${eventName || 'operation'}:`, err));

  try {
    await taskMicroservice.start();
    console.log(`[${taskMicroservice.name}] Service started successfully with ${transportType.toUpperCase()} transport.`);
    if (transportType === 'stdio') {
      console.log(`Try commands like:`);
      console.log(`  addTask "Buy Groceries" "Milk, Eggs, Bread"`);
      console.log(`  listTasks`);
      console.log(`  getTask <task_id>`);
      console.log(`  completeTask <task_id>`);
      console.log(`  categorizeTask <task_id> "Personal"`); 
      console.log(`  exit`);
    }
  } catch (error) {
    console.error(`[${taskMicroservice.name}] Failed to start with ${transportType.toUpperCase()} transport:`, error);
    process.exit(1);
  }
}

main().catch(console.error);
