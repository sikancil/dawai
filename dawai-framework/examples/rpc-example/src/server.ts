import { Microservice, llmTool, PluginContext, discoverAndRegisterMethods, LLMToolOptions } from '@arifwidianto/dawai-microservice';

// Re-use or define a similar toolset as in stdio-example
class MyRpcToolSet {
  @llmTool({ name: 'rpcGreet', description: 'RPC Greets a person.' }) // Decorator name 'rpcGreet'
  greet(ctx: PluginContext, name: string): string { // Method name 'greet'
    // const metadata = getMethodMetadata<LLMToolOptions>(LLM_TOOL_METADATA_KEY, this, 'greet'); // Removed
    // console.log('[RpcGreet Method] Metadata:', metadata); // Removed
    // Note: discoverAndRegisterMethods will register this method as 'greet' (the property name).
    // The client should call 'greet'. The decorator's 'name' property ('rpcGreet') is metadata.
    return `Hello, ${name}! This is ${ctx.name} (RPC Service). Client ID (from context): ${ctx.rpcContext?.clientId}`;
  }

  @llmTool({ name: 'rpcAdd', description: 'RPC Adds two numbers.' }) // Decorator name 'rpcAdd'
  add(ctx: PluginContext, a: number, b: number): string {
    // Corrected: The method signature in the example client sends numbers.
    return `${a} + ${b} = ${a + b}`;
  }
}

async function main() {
  const rpcService = new Microservice({
    name: 'RpcDemoService',
    transport: 'rpc', // RPCTransportAdapter will use default port 8080
    // rpcOptions: { port: 8081 } // Example if passing custom port
  });

  rpcService.on('onBeforeStart', () => console.log('[RpcDemoService] Event: onBeforeStart'));
  rpcService.on('onAfterStart', () => console.log('[RpcDemoService] Event: onAfterStart - RPC Server should be listening on port 8080.'));
  rpcService.on('onBeforeStop', () => console.log('[RpcDemoService] Event: onBeforeStop'));
  rpcService.on('onAfterStop', () => console.log('[RpcDemoService] Event: onAfterStop'));
  rpcService.on('onError', (err, eventName) => console.error(`[RpcDemoService] Event: onError during ${eventName || 'operation'}`, err));


  rpcService.use(async (ctx) => {
    if (ctx.plugin.request.rpcMessage?.method) { // Check if rpcMessage and method exist
        console.log(`[RpcDemoService Middleware] Incoming RPC for method: ${ctx.plugin.request.rpcMessage.method}`);
        // Note: The subtask asks to demonstrate ctx.methods in stdio-example's middleware.
        // For rpc-example, the focus is on using discoverAndRegisterMethods.
        // If demonstration were needed here, it would be similar to stdio-example:
        // const methodEntry = ctx.methods.get(ctx.plugin.request.rpcMessage.method);
        // if (methodEntry && methodEntry.decorators.llmTool) {
        //   console.log(`[RpcDemoService Middleware] Metadata for '${ctx.plugin.request.rpcMessage.method}':`, methodEntry.decorators.llmTool);
        // }
    } else {
        console.log(`[RpcDemoService Middleware] Incoming request (not RPC or no method):`, ctx.plugin.request);
    }
    await ctx.plugin.next();
  });

  const toolSet = new MyRpcToolSet();
  // Register methods from the class instance using discoverAndRegisterMethods
  // The methods will be registered using their actual names in the class (e.g., 'greet', 'add')
  discoverAndRegisterMethods(toolSet, rpcService);

  try {
    await rpcService.start();
    // await rpcService.run(); // For RPC, start() should be enough as the server is event-driven.
    console.log('[RpcDemoService] Service started. RPC server is active on port 8080.');
  } catch (error) {
    console.error('[RpcDemoService] Failed to start:', error);
    process.exit(1);
  }
}

main();
