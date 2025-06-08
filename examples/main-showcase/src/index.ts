import { z } from 'zod';
import chalk from 'chalk';
import {
  mcp,
  a2a,
  cli,
  rpc,
  stdio,
  Ctx,
  McpDecoratorOptions,
  A2aDecoratorOptions,
  CliDecoratorOptions,
  RpcDecoratorOptions,
  StdioOptions,
  MicroserviceOptions as CoreMicroserviceOptions, // Renamed to avoid conflict
  validateServiceDefinition,
  ValidationSuggestion,
  Microservice
} from '@arifwidianto/dawai-microservice';

import {
  webservice,
  crud,
  ws,
  sse,
  Body,
  Params,
  Query,
  WebserviceDecoratorOptions,
  CrudDecoratorOptions,
  WsDecoratorOptions,
  SseDecoratorOptions, // Added SseDecoratorOptions
  WebserviceOptions, // Added WebserviceOptions
  WebServiceTransportAdapter as HttpTransportAdapter // Alias to keep usage same
} from '@arifwidianto/dawai-webservice';

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

const filterOptionsSchema = z.object({ // Example schema for getItemWithBody
  status: z.string().optional(),
});

const initialSseSettingsSchema = z.object({ // Example schema for streamUpdatesWithBody
  clientId: z.string().optional(),
  filter: z.array(z.string()).optional(),
});

// --- Service Configuration ---
const serviceOptions: WebserviceOptions = { // Now correctly using WebserviceOptions from dawai-webservice
  enabled: true,
  options: {
    port: 3000,
    crud: {
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
  schema: sendEmailSchema,
};

const microserviceGlobalOptions: CoreMicroserviceOptions = { // Use aliased CoreMicroserviceOptions
  webservice: serviceOptions, // This will now expect the structure from dawai-webservice
  stdio: {
    enabled: true,
    options: {
      interactive: false
    }
  }
};

@stdio({ enabled: true, options: { interactive: true } })
@webservice({}) // Added empty object as argument
export class EmailService {
  constructor() {
    // console.log('EmailService instantiated');
  }

  @crud(sendEmailCrudOptions)
  sendEmail(
    @Params('userId') userId: string,
    @Query('sendConfirmation') sendConfirmation: string,
    @Body() payload: z.infer<typeof sendEmailSchema>
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

  @a2a({ command: 'notify_user', schema: sendEmailSchema })
  triggerNotification(
    someOtherParam: string = "default"
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

  @rpc({ command: 'get_status', schema: taskSchema })
  executeRpcCommand(
    @Body() statusQuery: z.infer<typeof taskSchema>
  ) {
    console.log('EmailService: Executing RPC command "get_status" with query:', statusQuery);
    return { status: 'RPC Command Executed', currentStatus: 'All systems nominal for ' + statusQuery.taskId };
  }

  @cli({ command: 'countdown', description: 'A simple countdown timer example.' })
  async countdown(@Ctx() ctx: any): Promise<void> {
    ctx.stdout.write('Starting countdown:\n');
    for (let i = 5; i >= 0; i--) {
      ctx.writeOverwritable(`Counting down: ${i}...`);
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    ctx.clearLine();
    ctx.stdout.write('Countdown finished!\n');
  }

  @mcp({ command: 'process_empty_payload', schema: taskSchema })
  async processEmptyPayload() {
    console.log('EmailService: Attempting to process empty payload. A validation warning for zero parameters is expected.');
    return { status: 'Processed empty payload (validation warning expected for zero params)' };
  }

  // Method to trigger DAWAI-VAL-HTTP001
  @crud({ endpoint: '/items/:id', method: 'GET', schema: filterOptionsSchema }) // Added schema for completeness, though not strictly needed for the @Body validation
  async getItemWithBody(
    @Params('id') id: string,
    @Body() filterOptions: z.infer<typeof filterOptionsSchema> // Problematic @Body() for GET
  ) {
    console.log(`EmailService: getItemWithBody called for ID ${id}. A validation error (DAWAI-VAL-HTTP001) for @Body on GET is expected.`);
    return { id, data: `Item data for ${id}`, receivedFilter: filterOptions };
  }

  // Method to trigger DAWAI-VAL-SSE001
  @sse({ endpoint: '/live-updates', schema: initialSseSettingsSchema })
  async streamUpdatesWithBody(
    @Ctx() ctx: any,
    @Body() initialSettings: z.infer<typeof initialSseSettingsSchema> // Problematic @Body() for SSE
  ) {
    console.log(`EmailService: streamUpdatesWithBody called. A validation warning (DAWAI-VAL-SSE001) for @Body on @sse is expected.`);
    if (ctx.res && typeof ctx.res.write === 'function') {
      ctx.res.write(`data: Initial settings received: ${JSON.stringify(initialSettings)}\n\n`);
      ctx.res.write(`data: Update 1\n\n`);
      if (typeof ctx.res.end === 'function') ctx.res.end();
    } else {
      console.warn("ctx.res.write is not available in this SSE context for testing.");
    }
    return { status: "SSE stream initiated with body (warning expected)"};
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
  console.warn(chalk.bold.underline('\n[Dawai Validation Suggestions for EmailService]:'));
  suggestions.forEach(suggestion => {
    let msg = `
[${suggestion.severity.toUpperCase()}] ${suggestion.message}`;
    if (suggestion.suggestionCode) msg += chalk.gray(` (${suggestion.suggestionCode})`);

    let details = '';
    if (suggestion.methodName) details += `
  Method: ${chalk.cyan(suggestion.className + '.' + suggestion.methodName)}`;
    if (suggestion.parameterIndex !== undefined) details += chalk.magenta(`, Param Index: ${suggestion.parameterIndex}`);
    if (suggestion.decoratorInvolved) details += `
  Decorator: ${chalk.yellow(suggestion.decoratorInvolved)}`;
    if (suggestion.keyInvolved) details += `
  Key/Property: ${chalk.yellow(suggestion.keyInvolved)}`;
    if (suggestion.expectedPattern) details += `
  Expected: ${suggestion.expectedPattern}`;
    if (suggestion.actualPattern) details += `
  Actual: ${suggestion.actualPattern}`;

    if (suggestion.severity === 'error') {
      console.error(chalk.red(msg) + details);
    } else if (suggestion.severity === 'warning') {
      console.warn(chalk.yellow(msg) + details);
    } else {
      console.info(chalk.blue(msg) + details);
    }
  });
  console.log('');
} else {
  console.log(chalk.green.bold('\n[Dawai Validation Suggestions for EmailService]: No issues found!\n'));
}

// --- Simple Bootstrap Function ---
async function bootstrapExample() {
  console.log("\n--- Bootstrapping Example Service ---");

  const service = new Microservice(EmailService, microserviceGlobalOptions);

  service.registerTransport(new HttpTransportAdapter());
  service.registerTransport(new StdioTransportAdapter());

  try {
    await service.bootstrap();
    await service.listen();
    console.log('EmailService is running. Press Ctrl+C to stop.');

    if (microserviceGlobalOptions.stdio?.options?.interactive) {
        console.log("\n--- Simulating CLI Interaction ---");
        // ... (existing simulation log)
    }

  } catch (error) {
    console.error("Failed to bootstrap or listen:", error);
    process.exit(1);
  }

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

if (require.main === module) {
  bootstrapExample();
}
