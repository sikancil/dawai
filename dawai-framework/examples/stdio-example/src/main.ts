import { Microservice, llmTool, getMethodMetadata, LLM_TOOL_METADATA_KEY, PluginContext } from '@arifwidianto/dawai-microservice';

// Example class with decorated methods (optional, could be standalone functions too)
class MyToolSet {
  @llmTool({ name: 'greet', description: 'Greets a person.' })
  greet(ctx: PluginContext, name: string): string {
    const metadata = getMethodMetadata<LLMToolOptions>(LLM_TOOL_METADATA_KEY, this, 'greet');
    console.log('[Greet Method] Metadata:', metadata);
    console.log('[Greet Method] PluginContext Name:', ctx.name);
    if (!name) return 'Please provide a name.';
    return `Hello, ${name}! This is ${ctx.name} running via ${ctx.transportType}.`;
  }

  @llmTool({ name: 'add', description: 'Adds two numbers.' })
  add(ctx: PluginContext, a: string, b: string): string {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (isNaN(numA) || isNaN(numB)) {
      return 'Invalid numbers provided.';
    }
    return `${numA} + ${numB} = ${numA + numB}`;
  }
}

async function main() {
  const myService = new Microservice({
    name: 'StdioDemoService',
    transport: 'stdio',
  });

  myService.on('onBeforeStart', () => console.log('[StdioDemoService] Event: onBeforeStart'));
  myService.on('onAfterStart', () => console.log('[StdioDemoService] Event: onAfterStart'));
  myService.on('onBeforeStop', () => console.log('[StdioDemoService] Event: onBeforeStop'));
  myService.on('onAfterStop', () => console.log('[StdioDemoService] Event: onAfterStop'));
  myService.on('onError', (err, eventName) => console.error(`[StdioDemoService] Event: onError during ${eventName || 'operation'}`, err));


  myService.use(async (ctx) => {
    console.log(`[StdioDemoService Middleware] Request for command: ${ctx.plugin.request.command}`);
    await ctx.plugin.next(); // Ensure this is called to proceed
    if (ctx.plugin.response) {
      console.log(`[StdioDemoService Middleware] Response:`, ctx.plugin.response);
    }
  });

  const toolSet = new MyToolSet();
  // Register methods from the class instance, ensuring 'this' context is bound correctly
  myService.method('greet', toolSet.greet.bind(toolSet));
  myService.method('add', toolSet.add.bind(toolSet));
  myService.method('testAsync', async (ctx: PluginContext, delayMs: string) => {
    console.log(`[StdioDemoService] TestAsync called for ${ctx.name}. Waiting for ${delayMs}ms...`);
    await new Promise(resolve => setTimeout(resolve, parseInt(delayMs) || 1000));
    return `Async operation complete after ${delayMs}ms.`;
  });


  try {
    await myService.start();
    console.log('[StdioDemoService] Started. Type commands like "greet YourName", "add 10 5", "testAsync 2000", or "exit".');
    // For stdio, run() might not be explicitly needed if start() already kicks off readline prompt.
    // However, if run() is meant to keep the process alive for stdio, it can be called.
    // await myService.run(); // The StdIOTransportAdapter.start() already keeps it alive via readline.
  } catch (error) {
    console.error('[StdioDemoService] Failed to start:', error);
    process.exit(1);
  }
}

main();
