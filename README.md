# bun-plugin-javascript-obfuscator

A Bun bundler plugin that integrates [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator) for code obfuscation during builds.

## Features

- **TypeScript Support**: Works seamlessly with TypeScript files - Bun handles compilation before obfuscation
- **Separate Vendor Bundles**: Automatically bundles node_modules separately (not obfuscated) and rewrites imports so everything works at runtime
- **Recursive Dependency Scanning**: Automatically discovers all external dependencies by scanning your entire codebase
- **Comment-Aware**: Ignores imports in commented-out code
- **Minification Support**: Apply Bun's minification before obfuscation for optimal code size
- **Full Obfuscator Options**: All [javascript-obfuscator options](https://github.com/javascript-obfuscator/javascript-obfuscator#javascript-obfuscator-options) are supported

## Installation

```bash
bun add bun-plugin-javascript-obfuscator
```

## Usage

### Recommended: `obfuscatedBuild` Function

The `obfuscatedBuild` function provides a complete build pipeline that:
1. Uses Bun to compile TypeScript to JavaScript and apply minification
2. Applies obfuscation to your application code
3. Bundles node_modules into a separate vendor file (not obfuscated)
4. Rewrites imports in the main bundle to use the vendor bundle

```typescript
import { obfuscatedBuild } from "bun-plugin-javascript-obfuscator";

const result = await obfuscatedBuild({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  minify: true, // Bun handles minification before obfuscation

  obfuscator: {
    compact: true,
    controlFlowFlattening: true,
    stringArray: true,
    stringArrayThreshold: 0.75,
  },

  // Bundle node_modules separately (default: true)
  bundleNodeModules: true,
  nodeModulesBundleName: "vendor.js",
});

if (result.success) {
  console.log("Build completed!");
  console.log("Main bundle (obfuscated):", result.outputs);
  console.log("Vendor bundle:", result.vendorOutput?.outputs);
}
```

### Alternative: Plugin API (for simple use cases)

For simpler use cases where you don't need TypeScript support or separate vendor bundling, you can use the plugin API directly:

```typescript
import { javascriptObfuscator } from "bun-plugin-javascript-obfuscator";

await Bun.build({
  entrypoints: ["./src/index.js"], // Note: .js files only
  outdir: "./dist",
  plugins: [
    javascriptObfuscator({
      compact: true,
      controlFlowFlattening: true,
    }),
  ],
});
```

## API Reference

### `obfuscatedBuild(options)`

The main build function that provides full TypeScript support and vendor bundle separation.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entrypoints` | `string[]` | **required** | Entry point files for the build |
| `outdir` | `string` | **required** | Output directory for bundled files |
| `minify` | `boolean` | `false` | Enable Bun's minification before obfuscation |
| `obfuscator` | `ObfuscatorOptions` | `{}` | javascript-obfuscator options |
| `bundleNodeModules` | `boolean` | `true` | Bundle node_modules into a separate file |
| `nodeModulesBundleName` | `string` | `"vendor.js"` | Name of the vendor bundle file |
| `isExternal` | `(path: string) => boolean` | (see below) | Custom function to identify external modules |
| `plugins` | `BunPlugin[]` | `[]` | Additional Bun plugins to run before obfuscation |
| `external` | `string[]` | `[]` | Modules to exclude from both main and vendor bundles (e.g., native modules) |
| `skipVendorBundleGeneration` | `boolean` | `false` | Skip generating vendor bundle but still rewrite imports to use an existing one |
| `existingVendorBundlePath` | `string` | `undefined` | Path to existing vendor bundle (for validation when using `skipVendorBundleGeneration`) |

**Default `isExternal` behavior**: Modules are considered external if they:
- Contain `node_modules` in the path
- Don't start with `.`, `/`, or `~` (bare imports like `lodash`)

#### Return Value

```typescript
interface ObfuscatorBuildResult {
  success: boolean;
  logs: BuildLog[];
  outputs: BuildArtifact[];      // Main bundle (obfuscated)
  vendorOutput?: BuildOutput;    // Vendor bundle (not obfuscated)
}
```

### `javascriptObfuscator(options)`

Creates a Bun plugin for direct integration with `Bun.build()`.

**Note**: This plugin works at the source file level and is best suited for JavaScript files. For TypeScript support, use `obfuscatedBuild` instead.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | `RegExp` | `/\.(js\|mjs)$/` | Files to include for obfuscation |
| `exclude` | `RegExp` | `undefined` | Files to exclude from obfuscation |

Plus all [javascript-obfuscator options](https://github.com/javascript-obfuscator/javascript-obfuscator#javascript-obfuscator-options).

## Examples

### Full Obfuscation with TypeScript

```typescript
import { obfuscatedBuild } from "bun-plugin-javascript-obfuscator";

await obfuscatedBuild({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  minify: true,
  target: "bun",

  obfuscator: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: true,
    disableConsoleOutput: true,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false,
    selfDefending: true,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ["base64"],
    stringArrayThreshold: 0.75,
  },
});
```

### With Native Module Exclusions

When using native modules that can't be bundled (e.g., modules with `.node` files), exclude them:

```typescript
await obfuscatedBuild({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  minify: true,

  obfuscator: {
    compact: true,
    stringArray: true,
  },

  // These modules will remain as external requires
  external: [
    "argon2",           // Native crypto module
    "nodejs-polars",    // Has .node files
    "better-sqlite3",   // Native SQLite bindings
  ],

  bundleNodeModules: true,
  nodeModulesBundleName: "vendor.js",
});
```

### Using Presets

```typescript
import { obfuscatedBuild } from "bun-plugin-javascript-obfuscator";
import JavaScriptObfuscator from "javascript-obfuscator";

// Get preset options
const presetOptions = JavaScriptObfuscator.getOptionsByPreset("high-obfuscation");

await obfuscatedBuild({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  obfuscator: presetOptions,
});
```

Available presets:
- `default`
- `low-obfuscation`
- `medium-obfuscation`
- `high-obfuscation`

### Without Vendor Bundle

If you want node_modules to remain external (not bundled at all):

```typescript
await obfuscatedBuild({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  bundleNodeModules: false, // node_modules imports remain as external requires
  obfuscator: {
    compact: true,
  },
});
```

### Custom External Detection

```typescript
await obfuscatedBuild({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",

  // Only treat specific packages as external
  isExternal: (path) => {
    return path.startsWith("react") || path.startsWith("lodash");
  },

  obfuscator: {
    compact: true,
  },
});
```

### Shared Vendor Bundle (Multiple Builds)

When building multiple entrypoints separately (e.g., main app and worker scripts), you can share a single vendor bundle:

```typescript
const outdir = "./dist";
const obfuscatorConfig = { compact: true, stringArray: true };

// First build: generates vendor.js
const mainResult = await obfuscatedBuild({
  entrypoints: ["./src/index.ts"],
  outdir,
  minify: true,
  obfuscator: obfuscatorConfig,
  bundleNodeModules: true,
  nodeModulesBundleName: "vendor.js",
});

// Second build: reuses existing vendor.js
const workerResult = await obfuscatedBuild({
  entrypoints: [
    "./src/workers/worker1.ts",
    "./src/workers/worker2.ts",
  ],
  outdir,
  minify: true,
  obfuscator: obfuscatorConfig,
  bundleNodeModules: true,
  nodeModulesBundleName: "vendor.js",
  // Skip generating vendor.js, just rewrite imports to use the existing one
  skipVendorBundleGeneration: true,
  existingVendorBundlePath: `${outdir}/vendor.js`,
});
```

This approach:
- Generates the vendor bundle only once (from the first build)
- Rewrites imports in all builds to reference the shared vendor bundle
- Avoids duplicating dependencies across multiple output files

## How It Works

1. **Dependency Analysis**: The build function recursively scans all your source files (starting from entrypoints) for import/require statements to identify external dependencies. Comments are stripped before scanning to avoid false positives from commented-out code.

2. **Phase 1 - Bun Compilation**: Your TypeScript/JavaScript code is compiled and bundled by Bun with node_modules marked as external. This phase handles:
   - TypeScript to JavaScript compilation
   - Minification (if enabled)
   - Tree shaking
   - Bundle optimization

3. **Phase 2 - Obfuscation**: The bundled JavaScript output is passed through javascript-obfuscator with your specified options.

4. **Phase 3 - Vendor Bundle**: If `bundleNodeModules` is enabled:
   - External dependencies are bundled into a separate vendor file (not obfuscated)
   - The main bundle is rewritten to import from the vendor bundle instead of the original package names
   - All import styles are handled: `import x from`, `import * as x from`, `import { a, b } from`, and `require()`

This approach keeps your application code obfuscated while:
- Third-party code remains readable (it's already public anyway)
- Avoiding issues that can occur when obfuscating already-minified library code
- Making debugging easier by keeping vendor code readable

## TypeScript Support

The plugin is written in TypeScript and exports all necessary types:

```typescript
import {
  obfuscatedBuild,
  javascriptObfuscator,
  type ObfuscatorBuildOptions,
  type ObfuscatorBuildResult,
  type BunObfuscatorPluginOptions,
  type ObfuscatorOptions,
} from "bun-plugin-javascript-obfuscator";
```

## License

MIT
