import { Microservice, llmTool, getMethodMetadata, LLM_TOOL_METADATA_KEY, PluginContext } from '@arifwidianto/dawai-microservice';

// Re-use or define a similar toolset as in stdio-example
class MyRpcToolSet {
  @llmTool({ name: 'rpcGreet', description: 'RPC Greets a person.' })
  greet(ctx: PluginContext, name: string): string {
    const metadata = getMethodMetadata<LLMToolOptions>(LLM_TOOL_METADATA_KEY, this, 'greet');
    console.log('[RpcGreet Method] Metadata:', metadata); // This will be undefined if decorator name is 'rpcGreet' but method name is 'greet'
    // Corrected: Assuming the decorator is on 'greet' method of this class.
    // If the method itself is named rpcGreet, then getMethodMetadata(..., this, 'rpcGreet')
    return `Hello, ${name}! This is ${ctx.name} (RPC Service). Client ID (from context): ${ctx.rpcContext?.clientId}`;
  }

  @llmTool({ name: 'rpcAdd', description: 'RPC Adds two numbers.' })
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
    } else {
        console.log(`[RpcDemoService Middleware] Incoming request (not RPC or no method):`, ctx.plugin.request);
    }
    await ctx.plugin.next();
  });

  const toolSet = new MyRpcToolSet();
  // Register methods. The names used here are what the client will call.
  rpcService.method('greet', toolSet.greet.bind(toolSet)); 
  rpcService.method('add', toolSet.add.bind(toolSet));   

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
