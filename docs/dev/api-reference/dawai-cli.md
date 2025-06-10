# API Reference: `@arifwidianto/dawai-cli`

This section provides a detailed API reference for the `@arifwidianto/dawai-cli` package. This package offers a command-line interface tool to scaffold and manage Dawai framework projects and components.

## Overview

`@arifwidianto/dawai-cli` is primarily used as an executable. Its main functionalities are exposed through commands like:
*   `dawai generate app`
*   `dawai generate service`
*   `dawai generate handler`
*   `dawai generate monorepo`
*   `dawai hello`

While it's mainly a CLI tool, it's built using the Dawai framework itself (specifically `@arifwidianto/dawai-stdio` and `@arifwidianto/dawai-microservice`), showcasing the framework's capability to build CLI applications.

## CLI Commands

*(This section is intended to be populated with detailed descriptions of each command, its options, and examples. For now, it serves as a placeholder. Much of this information is also covered in the [Using dawai-cli guide](../guides/cli-tool.md).)*

### `dawai generate app`
*   **Description**: Generates a new Dawai application.
*   **Options**: `--name`, `--path`, `--template` (future), etc.
*   **Details**: See [Using dawai-cli guide](../guides/cli-tool.md#1-dawai-generate-app).

### `dawai generate service`
*   **Description**: Generates a new service class within an existing Dawai project.
*   **Options**: `--name`, `--path`, etc.
*   **Details**: See [Using dawai-cli guide](../guides/cli-tool.md#2-dawai-generate-service).

### `dawai generate handler`
*   **Description**: Generates a new handler method within an existing service class.
*   **Options**: `--serviceName`, `--handlerName`, `--transports`, `--path`, `--method`, `--cliCommand`, `--wsEvent`, `--llmTool`, `--includeSchema`, `--schemaProps`, etc.
*   **Details**: See [Using dawai-cli guide](../guides/cli-tool.md#3-dawai-generate-handler).

### `dawai generate monorepo`
*   **Description**: Generates a new monorepo structure for Dawai projects.
*   **Options**: `--name`, `--path`, `--template` (future), etc.
*   **Details**: See [Using dawai-cli guide](../guides/cli-tool.md#4-dawai-generate-monorepo).

### `dawai hello`
*   **Description**: A simple command to check if `dawai-cli` is working.

## Programmatic API (Internal)

While `dawai-cli` is meant for command-line usage, its internal structure involves services and handlers built with Dawai. Understanding its internal API is generally not required for users of the CLI but might be relevant for contributors to the `dawai-cli` package itself.

*   **`CliService` (or similar)**: The main service class within `dawai-cli` that defines the CLI commands as handlers.
*   **Input Schemas**: Zod schemas used to validate command-line arguments for each `generate` command.

---

*Further details on the CLI commands and their options will be expanded here. For typical usage, refer to the [Using dawai-cli guide](../guides/cli-tool.md).*
