# `dawai` Framework

**`dawai`** is a comprehensive, go-to solution for building robust microservices and powerful tool-based applications. It is structured as a Lerna-managed monorepo, facilitating modular development and easy management of its various components.

## Overview

The `dawai` framework provides a collection of packages designed to streamline the development of scalable and maintainable applications. Whether you're building complex microservice architectures or sophisticated command-line tools, `dawai` offers the building blocks and conventions to accelerate your development process.

## Monorepo Structure

This repository contains the following key areas:

*   **`packages/`**: Core libraries and tools of the `dawai` framework.
    *   `dawai-cli`: A command-line interface for generating `dawai` projects, services, and handlers.
    *   `dawai-common`: Common utilities, decorators, and types used across the framework.
    *   `dawai-microservice`: Core functionalities for building microservices.
    *   `dawai-stdio`: Adapters and tools for standard I/O based applications, including interactive CLI features.
    *   `dawai-webservice`: Components for building web service endpoints.
*   **`examples/`**: Sample applications and usage demonstrations of the `dawai` framework.

## Getting Started

To get started with the `dawai` framework development environment:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/sikancil/dawai.git # Replace with actual repository URL
    cd dawai
    ```

2.  **Install dependencies and bootstrap packages:**
    The project uses Lerna to manage packages. Bootstrap the monorepo to install all dependencies and link local packages.
    ```bash
    npm run bootstrap
    ```
    This command utilizes `lerna bootstrap`.

## Available Scripts

The root `package.json` provides the following main scripts for managing the monorepo:

*   **`npm run bootstrap`**: Installs all package dependencies and links cross-dependencies.
*   **`npm run build`**: Builds all packages in the monorepo.
*   **`npm run test`**: Runs tests for all packages.

## Core Packages

A brief overview of the primary packages:

*   **`@arifwidianto/dawai-cli`**: Provides `dawai-cli`, a powerful command-line tool for scaffolding and managing `dawai` applications and their components.
*   **`@arifwidianto/dawai-common`**: Contains shared utilities, TypeScript decorators (`@Cli`, `@Crud`, `@Body`, etc.), enums, and core types that are fundamental to the framework's operation.
*   **`@arifwidianto/dawai-microservice`**: The foundation for creating microservices, offering features for service registration, communication, and lifecycle management.
*   **`@arifwidianto/dawai-stdio`**: Enables the creation of applications that interact via standard input/output, including an interactive mode for CLIs. It handles command parsing, validation, and execution.
*   **`@arifwidianto/dawai-webservice`**: Facilitates the development of web services, allowing easy definition of RESTful APIs and integration with the `dawai` microservice ecosystem.

## Documentation

Detailed documentation for developers and for LLM consumption is being developed and will be available in the `docs/` directory:

*   **Developer Documentation:** `docs/dev/`
*   **LLM-Focused Documentation:** `docs/llm/`

## License

This project is licensed under the MIT - see the [MIT](LICENSE) file for details. (Note: Update LICENSE_NAME and ensure LICENSE file is accurate).
