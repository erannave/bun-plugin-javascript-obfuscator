# bun-plugin-javascript-obfuscator

A Bun bundler plugin that integrates [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator) for code obfuscation during builds.

## Installation

```bash
bun add bun-plugin-javascript-obfuscator
```

## Usage

### Basic Usage

```typescript
import { javascriptObfuscator } from "bun-plugin-javascript-obfuscator";

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  plugins: [javascriptObfuscator()],
});
```

### With Options

All [javascript-obfuscator options](https://github.com/javascript-obfuscator/javascript-obfuscator#javascript-obfuscator-options) are supported:

```typescript
import { javascriptObfuscator } from "bun-plugin-javascript-obfuscator";

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  plugins: [
    javascriptObfuscator({
      // Plugin-specific options
      include: /\.(js|mjs)$/,  // Files to include (default: /\.(js|mjs)$/)
      exclude: /node_modules/, // Files to exclude

      // javascript-obfuscator options
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      debugProtection: false,
      disableConsoleOutput: true,
      identifierNamesGenerator: "hexadecimal",
      log: false,
      numbersToExpressions: true,
      renameGlobals: false,
      selfDefending: true,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayEncoding: ["base64"],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 2,
      stringArrayWrappersChainedCalls: true,
      stringArrayWrappersParametersMaxCount: 4,
      stringArrayWrappersType: "function",
      stringArrayThreshold: 0.75,
      transformObjectKeys: true,
      unicodeEscapeSequence: false,
    }),
  ],
});
```

### Using Presets

You can use javascript-obfuscator's built-in presets:

```typescript
import { javascriptObfuscator } from "bun-plugin-javascript-obfuscator";
import JavaScriptObfuscator from "javascript-obfuscator";

// Get preset options
const presetOptions = JavaScriptObfuscator.getOptionsByPreset("high-obfuscation");

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  plugins: [javascriptObfuscator(presetOptions)],
});
```

Available presets:
- `default`
- `low-obfuscation`
- `medium-obfuscation`
- `high-obfuscation`

## Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | `RegExp` | `/\.(js\|mjs)$/` | Files to include for obfuscation |
| `exclude` | `RegExp` | `undefined` | Files to exclude from obfuscation |

All other options are passed directly to javascript-obfuscator. See the [full options list](https://github.com/javascript-obfuscator/javascript-obfuscator#javascript-obfuscator-options).

## TypeScript Support

The plugin is written in TypeScript and exports all necessary types:

```typescript
import {
  javascriptObfuscator,
  type BunObfuscatorPluginOptions,
  type ObfuscatorOptions,
} from "bun-plugin-javascript-obfuscator";
```

## License

MIT
