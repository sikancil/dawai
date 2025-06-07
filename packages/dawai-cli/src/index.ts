import minimist from 'minimist';
import chalk from 'chalk';
import { handleGenerateHandlerCommand } from './commands/generateHandler';

async function main() {
  const args = minimist(process.argv.slice(2));
  const command = args._[0];
  const subCommand = args._[1];

  // console.log('Parsed args:', args);

  if (command === 'generate' && subCommand === 'handler') {
    const handlerName = args._[2];
    const transportsOption = args.transports || args.t; // Allow --transports or -t

    if (!handlerName) {
      console.error(chalk.red('Error: Handler name is required.'));
      console.log(chalk.yellow('Usage: dawai generate handler <HandlerName> --transports=<cli,ws,...>'));
      process.exit(1);
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(handlerName)) {
      console.error(chalk.red('Error: Invalid handler name. Must be a valid JavaScript identifier.'));
      process.exit(1);
    }

    if (!transportsOption) {
      console.error(chalk.red('Error: --transports option is required.'));
      console.log(chalk.yellow('Example: --transports=cli,ws,crud'));
      process.exit(1);
    }

    const transports = String(transportsOption).split(',').map(t => t.trim()).filter(t => t);
    if (transports.length === 0) {
      console.error(chalk.red('Error: At least one transport must be specified.'));
      process.exit(1);
    }

    try {
      await handleGenerateHandlerCommand({ handlerName, transports });
      // Success message is now printed by handleGenerateHandlerCommand
    } catch (genError) {
      // Error message is also printed by handleGenerateHandlerCommand as it throws.
      // The main catch block below will handle process.exit(1)
      // console.error(chalk.red('Handler generation failed.')); // This would be redundant
      process.exitCode = 1; // Ensure exit code is set if error is handled before main catch
    }

  } else if (command) {
    console.error(chalk.red(`Unknown command: ${command}`));
    console.log(chalk.yellow('Available commands: generate handler')); // TODO: Add more or a help command
    process.exit(1);
  } else {
    // No command, print general help or info
    console.log(chalk.bold.blue('Dawai Framework CLI'));
    console.log('Usage: dawai <command> [options]');
    console.log('\nAvailable commands:');
    console.log(chalk.cyan('  generate handler <HandlerName> --transports=<transportList>'));
    console.log('    Generates a new handler boilerplate.');
    console.log(chalk.yellow('\nExample: dawai generate handler sendEmail --transports=cli,crud,ws'));
    // TODO: Add a proper help command or integrate with a command framework later
  }
}

main().catch(error => {
  console.error(chalk.red('An unexpected error occurred:'), error);
  process.exit(1);
});
