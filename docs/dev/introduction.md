# Introduction to Dawai

## What is Dawai?

Dawai is a comprehensive, TypeScript-first framework designed for building robust and scalable microservices, powerful tool-based applications (including CLIs and AI agents), and complex, interconnected systems. It emphasizes a modular architecture, developer productivity, and extensibility.

**Key Features:**

*   **Multi-Transport Support**: Out-of-the-box support for various communication protocols including HTTP/S (REST, RPC, SSE, WebSockets), STDIO (for CLIs), and planned support for advanced protocols like Model Context Protocol (MCP) and Agent-to-Agent (A2A) communication.
*   **Decorator-Based Programming**: Utilizes TypeScript decorators extensively for defining services, handlers, parameter injection, and metadata, leading to clean and declarative code.
*   **Integrated CLI (`dawai-cli`)**: A powerful command-line tool for scaffolding projects, services, handlers, and managing Dawai applications, enhancing developer experience.
*   **Schema-First Validation**: Integrates with Zod for robust, schema-based validation of incoming data across all transport layers.
*   **Extensibility**: Designed to be highly extensible, allowing developers to create custom transport adapters, decorators, middleware, and other components.
*   **AI Integration Focus**: Built with features and planned capabilities to simplify the development of AI-powered applications, including LLM tool integration and agent-based systems.
*   **Monorepo Structure**: Developed as a Lerna-managed monorepo, promoting modularity and maintainability of its core packages.

**Philosophy:**

Dawai aims to be the "go-to" solution (`dawai` can mean "medicine" or "remedy" in some contexts, and also sounds like "the way") for developers looking to build modern, distributed applications in the Node.js ecosystem. It strives to provide a balance between opinionated structure for consistency and flexibility for diverse use cases.

## Why Dawai?

**Benefits of Using Dawai:**

*   **Unified Framework**: Build various types of applications (web APIs, CLIs, background workers, AI agents) using a single, consistent framework and programming model.
*   **Accelerated Development**: Quickly scaffold and develop applications with `dawai-cli` and expressive decorators.
*   **Type Safety & Validation**: Leverage TypeScript's static typing and Zod's runtime validation to build more reliable applications.
*   **Modularity and Reusability**: Services and components can be easily reused and combined.
*   **Future-Proof**: Designed with emerging patterns like LLM integration and agentic systems in mind.
*   **Testability**: The clear separation of concerns and class-based services make Dawai applications easier to test.

**Target Audience:**

*   Developers building microservices or distributed systems.
*   Teams creating complex CLI tools.
*   Engineers working on AI-powered applications, LLM integrations, or multi-agent systems.
*   Anyone looking for a modern, TypeScript-centric backend framework.

**Use Cases:**

*   RESTful APIs and web services.
*   Real-time applications (WebSockets, SSE).
*   Command-Line Interfaces (CLIs).
*   AI agents and LLM-powered tools.
*   Inter-service communication backbones (via MCP, A2A).
*   Task runners and background job processors.

## Monorepo Structure

Dawai is organized as a Lerna-managed monorepo. This structure helps in managing multiple interdependent packages within a single repository. Key benefits include:

*   **Centralized Dependency Management**: Easier to manage versions and dependencies across packages.
*   **Simplified Cross-Package Development**: Changes in one package can be easily tested and integrated with others.
*   **Consistent Tooling**: Shared build, test, and linting configurations.

**Core Packages (Illustrative):**

*   `@arifwidianto/dawai-common`: Contains shared interfaces, decorators, types, and utilities used by other packages.
*   `@arifwidianto/dawai-microservice`: The core engine that manages services, transport adapters, and the application lifecycle.
*   `@arifwidianto/dawai-webservice`: Transport adapter for HTTP/S, WebSockets, and SSE, built on Express.js.
*   `@arifwidianto/dawai-stdio`: Transport adapter for building CLI applications.
*   `@arifwidianto/dawai-cli`: The command-line tool for scaffolding and managing Dawai projects.
*   *(Future packages for MCP, A2A, LLM utilities, etc.)*

This modular approach allows developers to include only the necessary components for their specific application needs, keeping the footprint minimal while offering a rich set of optional features.
