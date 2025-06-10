# `@arifwidianto/dawai-common`

This package is a core component of the `dawai` framework, providing shared utilities, constants, decorators, interfaces, and the metadata storage system used across all `dawai` packages.

## Description

`@arifwidianto/dawai-common` serves as the foundational layer for the `dawai` ecosystem. It centralizes common functionalities to ensure consistency and reduce boilerplate in other `dawai` packages and applications built with the framework.

Key features include:
*   **Metadata Storage:** A singleton class (`MetadataStorage`) for registering and retrieving metadata associated with classes, methods, and parameters, primarily populated by decorators.
*   **Decorators:** A rich set of class, method, and parameter decorators to define services, handlers, and their behaviors for various transport layers (CLI, WebService, Microservice, etc.).
*   **Constants:** Enumerations and constant values for transport types, parameter types, and metadata keys.
*   **Interfaces:** TypeScript interfaces defining the shapes of options objects for decorators and core framework components.
*   **Utilities:** Helper functions for common tasks like object manipulation, text processing, and validation.

## Installation

This package is typically installed as a dependency of other `dawai` packages. If you need to install it directly:

```bash
npm install @arifwidianto/dawai-common
# or
yarn add @arifwidianto/dawai-common
# or
pnpm add @arifwidianto/dawai-common
```

## Core Components

### Metadata Storage (`MetadataStorage`)

The `MetadataStorage` class is a singleton responsible for storing and managing metadata attached to classes, methods, and parameters via decorators. This allows the framework to introspect components at runtime and configure them accordingly.

### Decorators

The package provides a wide array of decorators, including:

**Class Decorators:**
*   `@A2aAgent()`: Marks a class as an Agent-to-Agent communication agent.
*   `@McpClient()`: Configures a class as an MCP (Model Context Protocol) client.
*   `@McpServer()`: Configures a class as an MCP server.
*   `@stdio()`: Marks a class to be handled by the STDIO transport (e.g., for CLI applications).
*   `@webservice()`: Marks a class as a web service, often used to group related HTTP endpoints.

**Method Decorators:**
*   `@A2a()`: Defines a method as an A2A handler.
*   `@Cli()`: Defines a method as a CLI command handler.
*   `@Crud()`: Defines a method for CRUD operations (Create, Read, Update, Delete), typically over HTTP.
*   `@Llm()`: Defines a method for Large Language Model interactions.
*   `@Mcp()`: Defines a method as an MCP handler.
*   `@Rpc()`: Defines a method as a Remote Procedure Call handler.
*   `@Sse()`: Defines a method as a Server-Sent Events handler.
*   `@Ws()`: Defines a method as a WebSocket handler.
*   `@useMiddleware()`: Applies middleware to a handler method.

**Parameter Decorators:**
*   `@Body()`: Injects the request body.
*   `@Cookies()`: Injects specific cookies.
*   `@Ctx()`: Injects a context object.
*   `@Files()`: Injects uploaded files.
*   `@Headers()`: Injects specific request headers.
*   `@Params()`: Injects URL path parameters (e.g., from `/users/:id`).
*   `@Query()`: Injects URL query parameters.
*   `@Req()`: Injects the raw request object.
*   `@Res()`: Injects the raw response object.
*   `@Session()`: Injects session data.

### Constants

Key constants and enumerations include:

*   **`Metadata Keys`**: (e.g., `TRANSPORT_TYPE_METADATA`, `DECORATOR_KEY_CLI`) String constants used as keys for storing and retrieving metadata.
*   **`ParameterType` Enum**: Defines types of parameters that can be injected (e.g., `BODY`, `QUERY`, `HEADERS`).
*   **`TransportType` Enum**: Defines primary transport mechanisms (e.g., `WEBSERVICE`, `STDIO`).
*   **`TransportFeature` Enum**: Defines specific features or sub-protocols within transports (e.g., `CRUD`, `WEBSOCKET`, `SSE`, `CLI`).

### Interfaces

The package exports various TypeScript interfaces to ensure type safety and define the structure for options objects used by decorators and other framework parts. Examples include:
*   `CliDecoratorOptions`
*   `CrudDecoratorOptions`
*   `WebserviceDecoratorOptions`
*   `StdioDecoratorOptions`
*   `MicroserviceOptions`
*   `ParameterDecoratorOptions`

### Utilities

Helper functions are provided for:
*   Object manipulation (`object.util.ts`)
*   Text processing (`text.util.ts`)
*   Common validation logic (`validation.util.ts`)
*   Other general-purpose utilities (`common.util.ts`)

## Usage

This package is primarily used internally by other `dawai` packages. Developers building applications with `dawai` will interact with its exports (especially decorators and interfaces) when defining services and handlers.

Example of using a decorator:
```typescript
import { webservice, Crud, Body, Param } from '@arifwidianto/dawai-common';
import { z } from 'zod';

const itemSchema = z.object({
  name: z.string(),
});

@webservice({ path: '/items' })
export class ItemService {
  @Crud({ method: 'POST', schema: itemSchema })
  async create(@Body() data: z.infer<typeof itemSchema>) {
    // ... logic to create an item
    return { id: '1', ...data };
  }

  @Crud({ method: 'GET', path: '/:id' })
  async getOne(@Param('id') itemId: string) {
    // ... logic to get an item by id
    return { id: itemId, name: 'Sample Item' };
  }
}
```

This `README.md` provides an overview of the `@arifwidianto/dawai-common` package.
