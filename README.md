# 🚀 `dawai` Monorepo

`dawai`! 🎉 This framework is your go-to solution for building robust microservices and powerful tool-based applications. It simplifies defining services, methods, and how they talk to each other.

## 🤔 What's "dawai"?

The name "dawai" (Indonesian) has a couple of interesting meanings:
*   🎶 In **music**, a "dawai" is a string – like on a guitar or piano – that vibrates to create sound. It's a fundamental element for beautiful melodies.
*   🔬 In **physics** (specifically String Theory), a "dawai" is a tiny, one-dimensional vibrating object, a basic building block of elementary particles.

In essence, "dawai" represents a fundamental, vibrating element that can connect and create, much like how this framework aims to connect services and enable creation!

## 🏗️ Core Packages

The magic of `dawai` is organized into these core packages:

-   **`packages/dawai-microservice`**: The heart of your services! ❤️
    -   Provides the `Microservice` class – the foundation for all your service creations.
    -   Comes packed with handy decorators like `@llmTool`, `@mcpMethod`, `@a2aMethod`, and `@restEndpoint` to easily define your service methods and their special powers.
    -   Supports various communication styles (transports) like RPC and Stdio, so your services can chat in different ways.
-   **`packages/dawai-protocol-core`**: This is the rulebook 📖 that ensures all parts of `dawai` speak the same language. It defines the core protocol specifications and interfaces.

## ✨ Examples in Action!

Curious how to use `dawai`? Check out the `examples/` directory. It's full of practical showcases:

-   **`examples/rpc-example`**: See how to set up a classic client-server chat using RPC (Remote Procedure Call).
    -   `server.ts`: Implements `MyRpcToolSet` with cool methods like `greet` and `add`.
    -   `client.ts`: Shows how your client can easily call the server's methods.
-   **`examples/stdio-example`**: Want to build a service that talks through the command line (standard input/output)? This one's for you!
    -   `main.ts`: Implements `MyToolSet` with methods like `greet` and `add`, all over stdio.
-   **`examples/task-management-service`**: A more beefy example! 💪 This one builds a full task management service.
    -   `main.ts` (Server-side): Contains the `TaskService` with all the logic for adding, getting, listing, completing, and even categorizing tasks.
    -   `client.ts`: Provides a `TaskManagementClient` so you can interact with your `TaskService` like a pro.

## 🏁 Getting Started

Ready to dive in? *(This section is a great place to add detailed setup and run instructions!)*

Building packages is a breeze with Nx. To build a specific package, just run:

```sh
npx nx build <package-name>
```

For example, to build the main microservice package:
```sh
npx nx build dawai-microservice
```
Isn't that easy? 😎

To run an example, hop into its directory. Check its `README.md` or `package.json` for specific run commands (often `npm start` or an `nx` command).

Let's say you want to run the `stdio-example`:
```sh
cd examples/stdio-example
# Now, look for a start script in its package.json!
# It might be something like: npm run start OR npx nx serve stdio-example
```

## 🛠️ Development with Nx

This workspace is supercharged by [Nx](https://nx.dev)! Nx helps manage everything from generating code to running tasks and releasing your awesome packages.

Happy coding with `dawai`! 🚀 If you have ideas or contributions, this is where you'd find info on how to help. *(Consider adding contribution guidelines here!)*

## LICENSE
[MIT](LICENSE)
