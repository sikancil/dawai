import { z } from 'zod';

// Define Zod schema for the 'generate handler' command arguments
export const knownTransports = ['cli', 'crud', 'ws', 'mcp', 'a2a', 'rpc', 'sse', 'llm', 'webservice'] as const;
export const generateHandlerSchema = z.object({
  handlerName: z.string().min(1, "Handler name cannot be empty.")
    .refine(name => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name), {
      message: "Handler name must be a valid JavaScript identifier (alphanumeric, no spaces, can have underscores, not start with a number)."
    }),
  transports: z.string()
    .min(1, "At least one transport must be specified using --transports option.")
    .transform(val => val.split(',').map(t => t.trim().toLowerCase()).filter(t => t))
    .pipe(z.array(z.enum(knownTransports, {
      errorMap: (issue, ctx) => ({ message: `Invalid transport specified. Valid transports are: ${knownTransports.join(', ')}. Received: ${ctx.data}` })
    }))
      .min(1, "Transports list cannot be empty after parsing or contained invalid values.")
    ),
  serviceName: z.string()
    .refine(name => /^[A-Z][a-zA-Z0-9_]*$/.test(name), {
      message: "Service name must be a valid PascalCase JavaScript class identifier (e.g., MyService)."
    })
    .optional(),
  path: z.string()
    .min(1, { message: "Path cannot be empty if provided." })
    .refine(p => p.startsWith('/'), { message: "Path must start with a '/'." })
    .optional(),
  webserviceMethods: z.enum(['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'all'], {
    errorMap: (issue, ctx) => ({ message: `Invalid webservice method. Valid methods are: get, post, put, delete, patch, head, options, all. Received: ${ctx.data}` })
  })
    .optional(),
  crudMethods: z.enum(['get', 'post', 'put', 'delete', 'patch'], {
    errorMap: (issue, ctx) => ({ message: `Invalid CRUD method. Valid methods are: get, post, put, delete, patch. Received: ${ctx.data}` })
  })
    .optional(),
  methodName: z.string().min(1, "Method name cannot be empty if provided.")
    .refine(name => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name), {
      message: "Method name must be a valid JavaScript identifier (alphanumeric, no spaces, can have underscores, not start with a number)."
    })
    .optional(),
  includeSchema: z.boolean().optional().default(true), // Corresponds to --schema flag, defaults to true
});

export type GenerateHandlerOptions = z.infer<typeof generateHandlerSchema>;

// Define Zod schema for the 'generate service' command arguments
export const generateServiceSchema = z.object({
  serviceName: z.string()
    .min(1, { message: "Service name cannot be empty." })
    .refine(name => /^[A-Z][a-zA-Z0-9_]*$/.test(name), {
      message: "Service name must be a valid PascalCase JavaScript class identifier (e.g., MyService, Another_Service)."
    }),
  path: z.string().optional(), // Added path option
  // Add other potential options like --force later
});
export type GenerateServiceOptions = z.infer<typeof generateServiceSchema>;

// Define Zod schema for the 'generate app' command arguments
export const generateAppSchema = z.object({
  name: z.string()
    .min(1, { message: "App name cannot be empty." })
    .refine(name => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name), {
      message: "App name must be a valid kebab-case string (e.g., my-app, another-project)."
    }),
  path: z.string().optional(), // Added path option
  defaultServiceName: z.string()
    .refine(name => /^[A-Z][a-zA-Z0-9_]*$/.test(name), {
      message: "Default service name must be a valid PascalCase JavaScript class identifier (e.g., MyService, Another_Service)."
    })
    .optional(),
  type: z.enum(['single', 'mcp', 'a2a']) // Updated enum
    .default('single')
    .optional(),
});
export type GenerateAppOptions = z.infer<typeof generateAppSchema>;

// Define Zod schema for the 'generate monorepo' command arguments
export const generateMonorepoSchema = z.object({
  monorepoName: z.string()
    .min(1, { message: "Monorepo name cannot be empty." })
    .refine(name => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name), {
      message: "Monorepo name must be a valid kebab-case string (e.g., my-monorepo)."
    }),
  services: z.string()
    .min(1, { message: "At least one service name must be provided for the --services option." })
    .transform(val =>
      val.split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))
    ),
  sharedPackages: z.string()
    .optional()
    .transform(val =>
      val ? val.split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))
        : []
    ),
  monorepoManager: z.enum(['npm', 'yarn', 'pnpm', 'lerna'])
    .default('npm')
    .optional(),
}).refine(data => data.services.length > 0, {
  message: "The --services option must contain at least one valid service name after parsing.",
  path: ["services"],
});
export type GenerateMonorepoOptions = z.infer<typeof generateMonorepoSchema>;
