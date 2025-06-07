import { z } from 'zod';
import {
  webservice,
  crud,
  mcp,
  a2a,
  cli,
  ws,
  rpc,
  stdio,
  Body,
  Params,
  Query,
  Ctx // Explicitly adding Ctx for clarity, though './' should cover it
} from './'; // Assuming decorators are exported from main index

import {
  WebserviceDecoratorOptions,
  CrudDecoratorOptions,
  McpDecoratorOptions,
  A2aDecoratorOptions,
  CliDecoratorOptions,
  WsDecoratorOptions,
  RpcDecoratorOptions,
  StdioOptions,
  MicroserviceOptions
} from './'; // Assuming options are exported from main index

import { validateServiceDefinition, ValidationSuggestion } from './core'; // Using core export
import { Microservice } from './core';
import { HttpTransportAdapter } from './transports';
import { StdioTransportAdapter } from '@arifwidianto/dawai-stdio';


// --- Zod Schemas ---
const sendEmailSchema = z.object({
  to: z.string().email(),
  from: z.string().email().optional(),
  subject: z.string().min(3),
  body: z.string().min(10),
});

const taskSchema = z.object({
  taskId: z.string().uuid(),
  description: z.string().min(5),
  payload: z.record(z.any()).optional(),
});

// --- Service Configuration ---
const serviceOptions: WebserviceDecoratorOptions = {
  enabled: true,
  options: {
    port: 3000,
    crud: { // Default CRUD settings for @webservice related CRUDs if not overridden
      enabled: true,
      options: {
        basePath: '/api/v1'
      }
    }
  }
};

const sendEmailCrudOptions: CrudDecoratorOptions = {
  endpoint: '/email/:userId',
  method: 'POST',
  schema: sendEmailSchema, // Added schema
};

const microserviceGlobalOptions: MicroserviceOptions = {
  webservice: serviceOptions, // From constructor
  stdio: { // For StdioTransportAdapter constructor options
    enabled: true,
    options: {
      interactive: false // Example: run in non-interactive mode
    }
  }
};


@stdio({ enabled: true, options: { interactive: true } }) // Class decorator for CLI
@webservice() // Will use constructor options or find defaults if any
export class EmailService {
  constructor() {
    // console.log('EmailService instantiated');
  }

  @crud(sendEmailCrudOptions)
  sendEmail(
    @Params('userId') userId: string,
    @Query('sendConfirmation') sendConfirmation: string,
    @Body() payload: z.infer<typeof sendEmailSchema> // Type inference from Zod
  ) {
    console.log(`EmailService: Invoked sendEmail with userId: ${userId}, sendConfirmation: ${sendConfirmation}, payload:`, payload);
    return {
      status: 'Email processed by service',
      userIdReceived: userId,
      confirmationRequested: sendConfirmation === 'true',
      toAddress: payload.to,
      emailSubject: payload.subject,
      bodyReceived: payload.body
    };
  }

  @mcp({ command: 'process_task', schema: taskSchema })
  processTaskInternal(
    @Body() taskData: z.infer<typeof taskSchema>
  ) {
    console.log('EmailService: Processing MCP task:', taskData);
    return { status: 'MCP Task Processed', taskId: taskData.taskId };
  }

  // Intentionally has a schema and a parameter, but the parameter is not decorated
  // with @Body, @Query, or @Params. This should trigger the "Schema Defined but Not Actively Injected" warning.
  @a2a({ command: 'notify_user', schema: sendEmailSchema })
  triggerNotification(
    // @Body() notificationPayload: z.infer<typeof sendEmailSchema>
    someOtherParam: string = "default" // Parameter exists but doesn't use schema
  ) {
    console.log('EmailService: Triggering A2A Notification. Param `someOtherParam` =', someOtherParam, '. A validation warning for unused schema injection is expected.');
    return { status: 'A2A Notification Triggered (validation warning expected for unused schema injection)' };
  }

  @cli({ command: 'execute_job', schema: taskSchema, description: "Executes a specific job based on task details." })
  runCliCommand(
    @Body() jobData: z.infer<typeof taskSchema>
  ) {
    console.log('EmailService: Running CLI command:', jobData.description);
    return { status: 'CLI Command Executed', taskId: jobData.taskId };
  }

  @ws({ event: 'user_update', schema: taskSchema })
  handleWsMessage(
    @Body() updateData: z.infer<typeof taskSchema>
  ) {
    console.log('EmailService: Handling WS message for event "user_update":', updateData);
    return { status: 'WS Message Handled', event: 'user_update', taskId: updateData.taskId };
  }

  @rpc({ command: 'get_status', schema: taskSchema }) // Assuming taskSchema can be used for a status query context
  executeRpcCommand(
    @Body() statusQuery: z.infer<typeof taskSchema> // Example: using taskId from taskSchema to get status
  ) {
    console.log('EmailService: Executing RPC command "get_status" with query:', statusQuery);
    return { status: 'RPC Command Executed', currentStatus: 'All systems nominal for ' + statusQuery.taskId };
  }

  @cli({ command: 'countdown', description: 'A simple countdown timer example.' })
  async countdown(@Ctx() ctx: any): Promise<void> { // Add type for ctx if available/defined
    ctx.stdout.write('Starting countdown:\n'); // Use direct stdout
    for (let i = 5; i >= 0; i--) {
      ctx.writeOverwritable(`Counting down: ${i}...`);
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    ctx.clearLine(); // Clear the last countdown message
    ctx.stdout.write('Countdown finished!\n');
    // Note: If interactive mode is on, the prompt will appear after this.
    // If one-shot, the app will exit.
  }

  @mcp({ command: 'process_empty_payload', schema: taskSchema })
  // This method has a schema but no parameters, which should trigger a validation warning.
  async processEmptyPayload() {
    console.log('EmailService: Attempting to process empty payload. A validation warning for zero parameters is expected.');
    // In a real scenario, this method might perform an action that doesn't require input,
    // but having a schema associated via decorator without a way to receive it is questionable.
    return { status: 'Processed empty payload (validation warning expected for zero params)' };
  }

  helperMethod() {
    // console.log('Helper method called');
  }

  onModuleInit() {
    console.log("EmailService: onModuleInit called. Service is initializing.");
  }

  onApplicationShutdown() {
    console.log("EmailService: onApplicationShutdown called. Service is shutting down.");
  }
}

// --- Validation Demonstration ---
const suggestions: ValidationSuggestion[] = validateServiceDefinition(EmailService);
if (suggestions.length > 0) {
  console.warn('\n[Dawai Validation Suggestions for EmailService]:');
  suggestions.forEach(suggestion => {
    let msg = `  - ${suggestion.severity.toUpperCase()}: ${suggestion.message}`;
    if (suggestion.methodName) msg += ` (Method: ${suggestion.methodName})`;
    if (suggestion.parameterIndex !== undefined) msg += ` (Parameter Index: ${suggestion.parameterIndex})`;
    console.warn(msg);
  });
  console.warn('');
} else {
  console.log('\n[Dawai Validation Suggestions for EmailService]: No issues found.\n');
}

// --- Simple Bootstrap Function ---
async function bootstrapExample() {
  console.log("\n--- Bootstrapping Example Service ---");

  const service = new Microservice(EmailService, microserviceGlobalOptions);

  // Transports will be configured using microserviceGlobalOptions primarily
  service.registerTransport(new HttpTransportAdapter() /* options here would be overridden by constructor options if key matches */);
  service.registerTransport(new StdioTransportAdapter() /* StdioTransport also uses constructor options */);
  // Example of registering another transport with explicit options that might not be in constructor options
  // service.registerTransport(new SomeOtherTransportAdapter(), { customOption: 'value' });


  try {
    await service.bootstrap();
    await service.listen();
    console.log('EmailService is running. Press Ctrl+C to stop.');

    // Simulate CLI call for demonstration if stdio is interactive
    if (microserviceGlobalOptions.stdio?.options?.interactive) {
        console.log("\n--- Simulating CLI Interaction ---");
        const stdioAdapter = Array.from(service['transportAdapters'].keys()).find(a => a instanceof StdioTransportAdapter) as StdioTransportAdapter | undefined;
        if (stdioAdapter && stdioAdapter['cliInstance']) {
             console.log("To test CLI: node dist/example.service.js execute_job '{\"taskId\": \"cli-task-123\", \"description\": \"Run from bootstrap\"}'");
            // Simulating an internal call to a CLI command handler if possible, or just logging instructions.
            // Direct invocation like this is tricky as it bypasses the argument parsing layer.
            // For a real test, you'd run the compiled JS with arguments.
        }
    }

  } catch (error) {
    console.error("Failed to bootstrap or listen:", error);
    process.exit(1);
  }

  // Graceful shutdown handling (optional but good practice)
  process.on('SIGINT', async () => {
    console.log('\nCaught SIGINT. Shutting down gracefully...');
    await service.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    console.log('\nCaught SIGTERM. Shutting down gracefully...');
    await service.close();
    process.exit(0);
  });
}

// Only run bootstrap if this file is executed directly
if (require.main === module) {
  bootstrapExample();
}
