import WebSocket from 'ws';

const wsUrl = 'ws://localhost:8080'; // Ensure port matches server
console.log(`[RPC Client] Attempting to connect to RPC server at ${wsUrl}`);

const ws = new WebSocket(wsUrl);

// Define a more specific type for RPC responses
interface RPCResponse {
  id: string;
  result?: unknown;
  error?: string | { message?: string; [key: string]: unknown }; // Allow error to be string or object
}

function sendRpcCall(method: string, args: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      return reject(new Error('WebSocket connection is not open.'));
    }

    const id = Date.now().toString() + Math.random().toString(36).substring(2);
    const request = { type: 'call', method, args, id };

    const onMessageHandler = (dataBuff: WebSocket.RawData): void => {
      try {
        let messageString: string;
        if (Buffer.isBuffer(dataBuff)) {
          messageString = dataBuff.toString('utf8');
        } else if (dataBuff instanceof ArrayBuffer) {
          messageString = new TextDecoder('utf8').decode(dataBuff);
        } else if (Array.isArray(dataBuff)) {
          // Buffer[]
          messageString = Buffer.concat(dataBuff).toString('utf8');
        } else {
          // Should not happen with 'ws' library, but good for type safety
          console.warn('[RPC Client] Received unexpected data type:', dataBuff);
          reject(new Error('Received unexpected data type from server.'));
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response: RPCResponse = JSON.parse(messageString); // Specify utf8 and type response
        if (response.id === id) {
          ws.off('message', onMessageHandler); // Clean up listener
          if (response.error) {
            let errorMessage = 'Unknown RPC error';
            if (typeof response.error === 'string') {
              errorMessage = response.error;
            } else if (typeof response.error === 'object' && response.error !== null && response.error.message) {
              errorMessage = response.error.message;
            } else if (typeof response.error === 'object' && response.error !== null) {
              errorMessage = JSON.stringify(response.error);
            }
            reject(new Error(errorMessage));
          } else {
            resolve(response.result);
          }
        }
      } catch (error) {
        // Changed 'e' to 'error'
        ws.off('message', onMessageHandler); // Clean up listener on parse error
        // Construct the error message carefully, as dataBuff might be an ArrayBuffer
        let rawDataString = '';
        if (Buffer.isBuffer(dataBuff)) {
          rawDataString = dataBuff.toString('utf8');
        } else if (dataBuff instanceof ArrayBuffer) {
          rawDataString = `[ArrayBuffer of size ${dataBuff.byteLength}]`; // Avoid direct toString on ArrayBuffer
        } else if (Array.isArray(dataBuff)) {
          rawDataString = `[Array of Buffers, total size ${Buffer.concat(dataBuff).length}]`;
        } else {
          rawDataString = '[Unknown data type]';
        }
        reject(new Error(`Failed to parse server response: ${rawDataString}. Error: ${(error as Error).message}`));
      }
    };

    // Timeout for the RPC call
    const timeoutId = setTimeout(() => {
      ws.off('message', onMessageHandler); // Clean up listener
      reject(new Error(`RPC call to method '${method}' timed out after 10 seconds.`));
    }, 10000); // 10 seconds timeout

    ws.on('message', onMessageHandler);

    // Handle cases where the socket might close before a response is received
    const onCloseHandler = (): void => {
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
      if (error instanceof Error) {
        reject(error); // Reject with the error object itself
      } else {
        reject(new Error(String(error))); // Convert to string if not an Error instance
      }
    }
  });
}



// Explicitly define the async handler function with a Promise<void> return type
const handleOpen = async (): Promise<void> => {
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
    } catch (error) {
      console.log('[RPC Client] Error from subtract (as expected):', (error as Error).message);
    }
  } catch (error) {
    console.error('[RPC Client] Error during RPC call(s):', (error as Error).message);
    // Optionally re-throw or handle more gracefully if ws needs to close from here
  } finally {
    console.log('\n[RPC Client] All calls finished. Closing connection.');
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, 'Client finished all operations');
    }
  }
};

ws.on('open', (): void => {
  // The outer function is non-async and returns void
  void (async (): Promise<void> => {
    // IIFE is async, returns Promise<void>, and its promise is voided
    try {
      await handleOpen();
    } catch (err) {
      console.error('[RPC Client] Critical error in open handler:', (err as Error).message);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1011, 'Unexpected error occurred');
      }
    }
  })();
});

ws.on('close', (code: number, reason: Buffer): void => {
  console.log(
    `[RPC Client] Disconnected from server. Code: ${code}, Reason: ${reason.toString('utf8') || 'No reason given'}` // Specify utf8
  );
});

ws.on('error', (error: Error): void => {
  // This listener is crucial for catching connection errors, e.g., if the server is not running.
  console.error('[RPC Client] WebSocket error:', error.message);
  // You might want to exit the process if the connection fails fundamentally.
  // process.exit(1); // Uncomment if you want to exit on connection error
});
