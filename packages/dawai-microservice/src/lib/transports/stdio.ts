import * as readline from "readline";
import { Microservice } from "../microservice.js"; // Adjust if Microservice class is in a different relative path
import type { PluginContext } from "../microservice.js"; // Ensure PluginContext is imported as a type
import type { ITransportAdapter } from "./interfaces.js";

export class StdIOTransportAdapter implements ITransportAdapter {
  private microservice: Microservice;
  private rl?: readline.Interface;
  private shuttingDown: boolean = false; // To prevent double stop calls

  constructor(microservice: Microservice) {
    this.microservice = microservice;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async start(): Promise<void> {
    this.shuttingDown = false;
    console.log(`StdIOTransportAdapter for '${this.microservice.name}' starting...`);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${this.microservice.name}> `,
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.rl.on("line", async (line) => {
      if (this.shuttingDown) return; // Don't process new commands if already stopping

      const trimmedLine = line.trim();
      if (trimmedLine.toLowerCase() === "exit") {
        await this.microservice.stop(); // This will trigger this.stop()
        return;
      }

      const [command, ...args] = trimmedLine.split(/\s+/);
      const methodEntry = this.microservice.getMethod(command);

      if (methodEntry) {
        const context: PluginContext = {
          name: this.microservice.name,
          transportType: "stdio",
          end: async () => {
            await this.microservice.stop();
          },
          plugin: {
            request: { raw: trimmedLine, command, args },
            response: null,
            next: async () => {
              /* no-op for direct method calls in stdio */
            },
          },
          methods: this.microservice.getMethods(), // Populate methods for direct call context
        };
        try {
          const result = await methodEntry.handler(context, ...args);
          if (result !== undefined) {
            console.log(typeof result === "object" ? JSON.stringify(result, null, 2) : result);
          }
        } catch (error) {
          console.error(`Error executing method '${command}':`, error);
          // Consider emitting 'onError' on the microservice instance
          // await this.microservice['_emit']('onError', error, 'stdioMethodExecution');
        }
      } else {
        console.log(`Unknown command: ${command}`);
      }
      if (this.rl && !this.shuttingDown) {
        // Rely on rl instance and shuttingDown flag
        this.rl.prompt();
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.rl.on("close", async () => {
      // This handles Ctrl+D or other external closes
      if (!this.shuttingDown) {
        // Check if not already initiated by 'exit' command
        console.log(`StdIO input for '${this.microservice.name}' closed. Initiating shutdown...`);
        await this.microservice.stop();
      }
    });

    if (this.rl && !this.shuttingDown) {
      // Rely on rl instance and shuttingDown flag
      this.rl.prompt();
    }
    console.log(
      `StdIOTransportAdapter for '${this.microservice.name}' started. Type 'exit' to stop.`
    );
  }

  stop(): Promise<void> {
    // Removed async as no await is used
    if (this.shuttingDown) return Promise.resolve();
    this.shuttingDown = true;

    console.log(`StdIOTransportAdapter for '${this.microservice.name}' stopping...`);
    if (this.rl) {
      this.rl.removeAllListeners();
      this.rl.close();
    }
    console.log(`StdIOTransportAdapter for '${this.microservice.name}' stopped.`);
    return Promise.resolve();
  }
}
