# Core Concepts of the Dawai Framework

The Dawai framework is designed to simplify the development of robust, scalable, and maintainable microservices and tool-based applications in TypeScript. Understanding its core concepts is key to leveraging its full potential.

## Overview

Dawai is a production-grade TypeScript monorepo framework. It emphasizes a modular architecture, standardized communication protocols, and a superior developer experience through a decorator-driven design and advanced tooling. The framework is particularly well-suited for building AI-driven microservices but is flexible enough for a wide range of applications.

## Core Development Principles

The design and development of Dawai are guided by the following principles:

1.  **Type Safety First**:
    *   Strict TypeScript is enforced across all packages. This ensures robustness, maintainability, and helps catch errors early in the development process.

2.  **Modular Architecture**:
    *   The framework is divided into distinct packages, each with a specific purpose and clear, well-defined boundaries (e.g., `@arifwidianto/dawai-common`, `@arifwidianto/dawai-microservice`, `@arifwidianto/dawai-webservice`, `@arifwidianto/dawai-stdio`, `@arifwidianto/dawai-cli`).
    *   This modularity promotes separation of concerns, reusability, and easier management of complex projects.

3.  **Decorator-Driven API**:
    *   Dawai extensively uses TypeScript decorators (similar in style to NestJS) for defining services, handlers, routes, command-line commands, and for injecting parameters.
    *   This approach leads to an intuitive, declarative, and less verbose API design, making code easier to read and write.

4.  **Transport Agnostic**:
    *   The core microservice logic is decoupled from the underlying transport mechanisms. A service method can be exposed over multiple transports (e.g., HTTP, WebSockets, CLI, RPC) simultaneously with minimal code changes.
    *   This is achieved through a `TransportAdapter` pattern, where specific adapters handle the communication details for each protocol.

5.  **Production Ready**:
    *   The framework prioritizes performance, security, and maintainability. Features like schema-based validation, structured error handling, and lifecycle management are built-in to support production deployments.

## Key Architectural Components

*   **Microservice (`@arifwidianto/dawai-microservice`)**:
    *   The central `Microservice` class orchestrates your application. It loads your service class(es), registers transport adapters, and manages the application lifecycle (bootstrap, listen, close).

*   **Service Classes**:
    *   These are standard TypeScript classes where you define your application's business logic. Methods within these classes become handlers for requests or commands.

*   **Decorators (`@arifwidianto/dawai-common`)**:
    *   **Class Decorators** (e.g., `@webservice()`, `@stdio()`): Used on service classes to enable and configure specific transport layers.
    *   **Method Decorators** (e.g., `@Cli()`, `@Crud()`, `@Ws()`, `@Llm()`): Used on methods within service classes to define them as handlers for specific commands, routes, or events. They carry metadata like paths, HTTP methods, command names, and Zod schemas for validation.
    *   **Parameter Decorators** (e.g., `@Body()`, `@Query()`, `@Params()`, `@Ctx()`): Used on parameters of handler methods to inject data from the incoming request or context (e.g., request body, URL parameters, CLI arguments, execution context).

*   **Transport Adapters** (e.g., `WebServiceTransportAdapter`, `StdioTransportAdapter`):
    *   Implementations of the abstract `TransportAdapter` class. Each adapter is responsible for a specific communication protocol.
    *   They interpret the metadata provided by decorators to route incoming requests/commands to the correct service methods and handle the specifics of their protocol.

*   **Metadata Storage (`@arifwidianto/dawai-common`)**:
    *   A system for collecting and querying metadata attached by decorators. This allows the framework to understand how services and handlers are configured at runtime.

*   **Input Validation (`Zod`)**:
    *   Dawai integrates `Zod` for schema definition and validation. Schemas can be attached to handlers via decorators, and the framework automatically validates incoming data against these schemas.

*   **`dawai-cli` (`@arifwidianto/dawai-cli`)**:
    *   A command-line tool for scaffolding Dawai projects, services, handlers, and other components. It aims to enhance developer productivity and ensure adherence to best practices.

## Workflow

A typical workflow for developing with Dawai involves:
1.  Defining a service class.
2.  Decorating methods within the service class to expose them as handlers for specific transports (e.g., `@Crud` for HTTP, `@Cli` for command-line).
3.  Using parameter decorators to inject necessary data into these handler methods.
4.  Instantiating the `Microservice` class with your service class.
5.  Registering and configuring the required transport adapters.
6.  Bootstrapping and starting the microservice.

This declarative and modular approach allows developers to focus on business logic while the framework handles the complexities of request routing, data parsing, validation, and transport management.
