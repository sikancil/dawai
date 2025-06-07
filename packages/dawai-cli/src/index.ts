import { Microservice, MicroserviceOptions } from '@arifwidianto/dawai-microservice';
import { StdioTransportAdapter } from '@arifwidianto/dawai-stdio';
import { DawaiCliService } from './services/cli.service';
import chalk from 'chalk';

async function main() {
  // Optional: A top-level welcome message for the CLI tool itself
  // console.log(chalk.bold.magenta('Dawai CLI'));

  const microserviceOptions: MicroserviceOptions = {
    stdio: {
      enabled: true,
      options: {
        // Let StdioTransportAdapter decide interactive vs one-shot based on TTY and args.
        // interactive: undefined will allow StdioTransportAdapter's logic to prevail:
        // - If (interactive:true in options AND TTY) -> interactive
        // - Else if (process.argv.length > 2) -> one-shot
        // - Else (fallback with help message)
        // This is usually the desired behavior for a CLI.
        interactive: undefined, // Default behavior: one-shot if command args, interactive if TTY and no args.
        prompt: 'dawai-cli> ' // Optional: Custom prompt for interactive mode
      }
    }
  };

  const cliApp = new Microservice(DawaiCliService, microserviceOptions);

  // Register the StdioTransportAdapter.
  // The options passed here during registerTransport would be overridden by
  // microserviceOptions.stdio if microserviceOptions were passed to the adapter's constructor directly,
  // or if the adapter internally uses the configKey 'stdio' to fetch from MicroserviceOptions.
  // Since StdioTransportAdapter is initialized with options from Microservice's bootstrap method based on configKey,
  // the options in microserviceOptions will take precedence.
  cliApp.registerTransport(new StdioTransportAdapter());

  try {
    await cliApp.bootstrap(); // Initializes adapters with config from microserviceOptions
    await cliApp.listen();   // Starts StdioTransportAdapter (handles argv or interactive)
  } catch (error) {
    // StdioTransportAdapter's _executeCommand and listen methods are designed
    // to handle command-specific errors and set process.exit(1) for command failures.
    // This top-level catch is for more fundamental errors (e.g., bootstrap issues,
    // or if listen() itself throws an unexpected error not caught by its internal logic).

    // Avoid re-logging errors already handled and exited by StdioTransportAdapter
    // (like "Unknown command" or "No command provided").
    // StdioTransportAdapter should ideally manage its own process.exit calls for those.
    // If an error reaches here, it's likely an unhandled one.
    if (error instanceof Error) {
        // Check if it's a known error message from Stdio that we might not want to double-log.
        // This is a bit fragile. Better if StdioTransportAdapter ensures it exits.
        const isStdioHandledError = error.message.includes('Unknown command:') ||
                                    error.message.includes('No command provided');
        if (!isStdioHandledError) {
            console.error(chalk.red('An unexpected error occurred during CLI execution:'), error.message);
            if (error.stack) {
                // console.error(chalk.gray(error.stack)); // Optional: for more details
            }
        }
    } else if (error) {
        console.error(chalk.red('An unexpected and untyped error occurred:'), error);
    }

    // If process.exitCode has not been set by a more specific error handler (like in StdioTransportAdapter)
    if (process.exitCode === undefined || process.exitCode === 0) {
         process.exitCode = 1;
    }
  }
}

main().catch(error => {
  // This catch is a final global fallback.
  // Errors from async main() if not caught inside main's try/catch, or if main itself is misconfigured.
  console.error(chalk.red('CLI Global Error Handler:'), error);
  if (process.exitCode === undefined || process.exitCode === 0) {
      process.exitCode = 1;
  }
});

// Ensure the process exits if an exit code has been set.
// This handles cases where an error occurs, process.exitCode is set, but the event loop is still pending.
process.on('beforeExit', (code) => {
  if (process.exitCode !== undefined && process.exitCode !== 0) {
    process.exit(process.exitCode);
  }
});
