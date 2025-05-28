import WebSocket from 'ws';

const wsUrl = 'ws://localhost:8080'; // Ensure port matches server
console.log(`[RPC Client] Attempting to connect to RPC server at ${wsUrl}`);

const ws = new WebSocket(wsUrl); 

function sendRpcCall(method: string, args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      return reject(new Error('WebSocket connection is not open.'));
    }

    const id = Date.now().toString() + Math.random().toString(36).substring(2);
    const request = { type: 'call', method, args, id };

    const onMessageHandler = (dataBuff: WebSocket.RawData) => {
      try {
        const response = JSON.parse(dataBuff.toString());
        if (response.id === id) {
          ws.off('message', onMessageHandler); // Clean up listener
          if (response.error) {
            reject(new Error(typeof response.error === 'object' ? JSON.stringify(response.error) : response.error));
          } else {
            resolve(response.result);
          }
        }
      } catch (e) {
        ws.off('message', onMessageHandler); // Clean up listener on parse error
        reject(new Error(`Failed to parse server response: ${dataBuff.toString()}`));
      }
    };
    
    // Timeout for the RPC call
    const timeoutId = setTimeout(() => {
        ws.off('message', onMessageHandler); // Clean up listener
        reject(new Error(`RPC call to method '${method}' timed out after 10 seconds.`));
    }, 10000); // 10 seconds timeout


    ws.on('message', onMessageHandler);
    
    // Handle cases where the socket might close before a response is received
    const onCloseHandler = () => {
        clearTimeout(timeoutId);
        ws.off('message', onMessageHandler); // Ensure listener is removed
        reject(new Error('WebSocket connection closed before receiving RPC response.'));
    };
    ws.once('close', onCloseHandler); // Use once to avoid multiple rejections if already handled

    try {
        ws.send(JSON.stringify(request));
    } catch (error) {
        clearTimeout(timeoutId);
        ws.off('message', onMessageHandler);
        ws.off('close', onCloseHandler);
        reject(error);
    }
  });
}

ws.on('open', async () => {
  console.log('[RPC Client] Connected to server.');

  try {
    console.log('\n[RPC Client] Calling "greet" with "RPC User"...');
    const greetResult = await sendRpcCall('greet', ['RPC User']);
    console.log('[RPC Client] Response from greet:', greetResult);

    console.log('\n[RPC Client] Calling "add" with [123, 877]...');
    const addResult = await sendRpcCall('add', [123, 877]);
    console.log('[RPC Client] Response from add:', addResult);
    
    console.log('\n[RPC Client] Calling non-existent method "subtract"...');
    try {
        const subtractResult = await sendRpcCall('subtract', [10, 5]);
        console.log('[RPC Client] Response from subtract (should not reach here):', subtractResult);
    } catch(error) {
        console.log('[RPC Client] Error from subtract (as expected):', (error as Error).message);
    }

  } catch (error) {
    console.error('[RPC Client] Error during RPC call(s):', (error as Error).message);
  } finally {
    console.log('\n[RPC Client] All calls finished. Closing connection.');
    ws.close();
  }
});

ws.on('close', (code, reason) => {
  console.log(`[RPC Client] Disconnected from server. Code: ${code}, Reason: ${reason.toString() || 'No reason given'}`);
});

ws.on('error', (error) => {
  // This listener is crucial for catching connection errors, e.g., if the server is not running.
  console.error('[RPC Client] WebSocket error:', error.message);
  // You might want to exit the process if the connection fails fundamentally.
  // process.exit(1); // Uncomment if you want to exit on connection error
});
