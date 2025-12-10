import type { BunPlugin, BuildConfig, BuildOutput, BuildArtifact } from "bun";
import JavaScriptObfuscator from "javascript-obfuscator";
import type { ObfuscatorOptions } from "javascript-obfuscator";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { dirname, basename, join, resolve } from "path";

/**
 * Options for the bun-plugin-javascript-obfuscator plugin.
 * Extends javascript-obfuscator's ObfuscatorOptions with additional plugin-specific options.
 */
export interface BunObfuscatorPluginOptions extends Omit<ObfuscatorOptions, "inputFileName"> {
  /**
   * Glob patterns to include for obfuscation.
   * Defaults to all .js files.
   */
  include?: RegExp;

  /**
   * Glob patterns to exclude from obfuscation.
   * Files matching these patterns will not be obfuscated.
   */
  exclude?: RegExp;
}

/**
 * Options for the obfuscatedBuild function.
 * Extends Bun's BuildConfig with obfuscator-specific options.
 */
export interface ObfuscatorBuildOptions extends Omit<BuildConfig, "plugins"> {
  /**
   * javascript-obfuscator options to apply to the bundled output.
   */
  obfuscator?: Omit<ObfuscatorOptions, "inputFileName">;

  /**
   * Additional Bun plugins to run during the build.
   * These plugins run before obfuscation is applied.
   */
  plugins?: BunPlugin[];

  /**
   * Whether to bundle node_modules packages into a separate file.
   * When true, node_modules are bundled separately and not obfuscated.
   * When false, node_modules are excluded entirely (must be available at runtime).
   * Defaults to true.
   */
  bundleNodeModules?: boolean;

  /**
   * Name of the separate bundle file for node_modules.
   * Defaults to "vendor.js".
   */
  nodeModulesBundleName?: string;

  /**
   * Custom function to determine if a module should be treated as external.
   * By default, all modules from node_modules are treated as external.
   * Return true to mark the module as external (will go into vendor bundle).
   */
  isExternal?: (modulePath: string) => boolean;
}

/**
 * Result of the obfuscatedBuild function.
 * Extends Bun's BuildOutput with additional information about the vendor bundle.
 */
export interface ObfuscatorBuildResult {
  /** Whether the build was successful */
  success: boolean;
  /** Build logs/errors */
  logs: BuildOutput["logs"];
  /** Main bundle output artifacts (obfuscated user code) */
  outputs: BuildArtifact[];
  /** Vendor bundle output (non-obfuscated node_modules), if bundleNodeModules is true */
  vendorOutput?: BuildOutput;
}

/**
 * Default function to check if a module path is from node_modules.
 */
function defaultIsExternal(modulePath: string): boolean {
  return modulePath.includes("node_modules") ||
         (!modulePath.startsWith(".") && !modulePath.startsWith("/") && !modulePath.startsWith("~"));
}

/**
 * Collects all external dependencies from the build metafile.
 */
function collectExternalDependencies(
  entrypoints: string[],
  isExternal: (path: string) => boolean
): Set<string> {
  const externals = new Set<string>();
  const visited = new Set<string>();
  const queue = [...entrypoints];

  while (queue.length > 0) {
    const file = queue.shift()!;
    if (visited.has(file)) continue;
    visited.add(file);

    try {
      const resolvedPath = resolve(file);
      if (!existsSync(resolvedPath)) continue;

      const content = readFileSync(resolvedPath, "utf-8");

      // Match import/require statements
      const importRegex = /(?:import|export)(?:\s+(?:[\w*{}\s,]+)\s+from)?\s*['"]([^'"]+)['"]/g;
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const dep = match[1];
        if (isExternal(dep)) {
          externals.add(dep);
        }
      }
      while ((match = requireRegex.exec(content)) !== null) {
        const dep = match[1];
        if (isExternal(dep)) {
          externals.add(dep);
        }
      }
      while ((match = dynamicImportRegex.exec(content)) !== null) {
        const dep = match[1];
        if (isExternal(dep)) {
          externals.add(dep);
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return externals;
}

/**
 * Performs an obfuscated build with Bun.
 *
 * This function provides a two-phase build process:
 * 1. First, Bun compiles and bundles the user code (including TypeScript transformation and minification)
 *    with node_modules marked as external.
 * 2. Then, javascript-obfuscator is applied to the bundled output.
 * 3. Optionally, node_modules are bundled separately into a vendor file (not obfuscated).
 *
 * @param options - Build options including Bun build config and obfuscator options
 * @returns Build result with obfuscated user code and optional vendor bundle
 *
 * @example
 * ```typescript
 * import { obfuscatedBuild } from "bun-plugin-javascript-obfuscator";
 *
 * const result = await obfuscatedBuild({
 *   entrypoints: ["./src/index.ts"],
 *   outdir: "./dist",
 *   minify: true,
 *   obfuscator: {
 *     compact: true,
 *     controlFlowFlattening: true,
 *     stringArray: true,
 *   },
 * });
 * ```
 */
export async function obfuscatedBuild(options: ObfuscatorBuildOptions): Promise<ObfuscatorBuildResult> {
  const {
    obfuscator: obfuscatorOptions = {},
    plugins = [],
    bundleNodeModules = true,
    nodeModulesBundleName = "vendor.js",
    isExternal = defaultIsExternal,
    ...buildOptions
  } = options;

  const entrypoints = buildOptions.entrypoints;
  if (!entrypoints || entrypoints.length === 0) {
    throw new Error("At least one entrypoint is required");
  }

  const outdir = buildOptions.outdir;
  if (!outdir) {
    throw new Error("outdir is required for obfuscatedBuild");
  }

  // Ensure output directory exists
  if (!existsSync(outdir)) {
    mkdirSync(outdir, { recursive: true });
  }

  // Collect external dependencies from source files
  const externalDeps = collectExternalDependencies(entrypoints, isExternal);
  const externalArray = Array.from(externalDeps);

  // Phase 1: Build user code with node_modules as external
  // Bun will handle TypeScript compilation and minification
  const userBuildResult = await Bun.build({
    ...buildOptions,
    plugins,
    external: [...(buildOptions.external || []), ...externalArray],
  });

  if (!userBuildResult.success) {
    return {
      success: false,
      logs: userBuildResult.logs,
      outputs: [],
    };
  }

  // Phase 2: Apply obfuscation to the bundled output
  const obfuscatedOutputs: BuildArtifact[] = [];

  for (const output of userBuildResult.outputs) {
    // Only obfuscate JavaScript files
    if (output.path.endsWith(".js") || output.path.endsWith(".mjs")) {
      try {
        const code = await output.text();

        // Skip empty files
        if (!code.trim()) {
          obfuscatedOutputs.push(output);
          continue;
        }

        const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
          ...obfuscatorOptions,
          inputFileName: basename(output.path),
        });

        const obfuscatedCode = obfuscationResult.getObfuscatedCode();

        // Write the obfuscated code back to the file
        writeFileSync(output.path, obfuscatedCode, "utf-8");

        obfuscatedOutputs.push(output);
      } catch (error) {
        console.error(`[bun-plugin-javascript-obfuscator] Error obfuscating ${output.path}:`, error);
        throw error;
      }
    } else {
      // Non-JS files pass through unchanged
      obfuscatedOutputs.push(output);
    }
  }

  // Phase 3: Bundle node_modules separately (if enabled and there are external deps)
  let vendorOutput: BuildOutput | undefined;

  if (bundleNodeModules && externalArray.length > 0) {
    // Create a temporary entry file that imports all external dependencies
    const vendorEntryContent = externalArray
      .map((dep, i) => `export * as _dep${i} from "${dep}";`)
      .join("\n");

    const vendorEntryPath = join(outdir, "__vendor_entry__.js");
    writeFileSync(vendorEntryPath, vendorEntryContent, "utf-8");

    try {
      vendorOutput = await Bun.build({
        entrypoints: [vendorEntryPath],
        outdir,
        minify: buildOptions.minify,
        target: buildOptions.target,
        format: buildOptions.format,
        naming: nodeModulesBundleName,
        // Don't mark anything as external for the vendor bundle
      });

      // Clean up temporary entry file
      const fs = await import("fs/promises");
      await fs.unlink(vendorEntryPath).catch(() => {});

      if (!vendorOutput.success) {
        console.warn("[bun-plugin-javascript-obfuscator] Warning: Failed to bundle node_modules");
        console.warn(vendorOutput.logs);
      }
    } catch (error) {
      console.warn("[bun-plugin-javascript-obfuscator] Warning: Failed to bundle node_modules:", error);
      // Clean up temporary entry file on error
      const fs = await import("fs/promises");
      await fs.unlink(vendorEntryPath).catch(() => {});
    }
  }

  return {
    success: true,
    logs: userBuildResult.logs,
    outputs: obfuscatedOutputs,
    vendorOutput,
  };
}

/**
 * Creates a Bun bundler plugin that obfuscates JavaScript code using javascript-obfuscator.
 *
 * Note: This plugin uses onLoad hooks and works best for simple use cases where you want
 * to obfuscate source files directly. For TypeScript support and separate node_modules
 * bundling, use the `obfuscatedBuild` function instead.
 *
 * @param options - Plugin options including javascript-obfuscator options
 * @returns A BunPlugin instance
 *
 * @example
 * ```typescript
 * import { javascriptObfuscator } from "bun-plugin-javascript-obfuscator";
 *
 * await Bun.build({
 *   entrypoints: ["./src/index.js"],
 *   outdir: "./dist",
 *   plugins: [
 *     javascriptObfuscator({
 *       compact: true,
 *       controlFlowFlattening: true,
 *     }),
 *   ],
 * });
 * ```
 */
export function javascriptObfuscator(options: BunObfuscatorPluginOptions = {}): BunPlugin {
  const { include, exclude, ...obfuscatorOptions } = options;

  // Default filter matches .js and .mjs files
  const filter = include ?? /\.(js|mjs)$/;

  return {
    name: "bun-plugin-javascript-obfuscator",
    setup(build) {
      // Use onLoad with defer to process the final bundled output
      build.onLoad({ filter }, async (args) => {
        // Skip if file matches exclude pattern
        if (exclude && exclude.test(args.path)) {
          return undefined;
        }

        // Read the file contents
        const source = await Bun.file(args.path).text();

        // Skip empty files
        if (!source.trim()) {
          return undefined;
        }

        try {
          // Obfuscate using javascript-obfuscator
          const obfuscationResult = JavaScriptObfuscator.obfuscate(source, {
            ...obfuscatorOptions,
            inputFileName: args.path,
          });

          return {
            contents: obfuscationResult.getObfuscatedCode(),
            loader: "js",
          };
        } catch (error) {
          console.error(`[bun-plugin-javascript-obfuscator] Error obfuscating ${args.path}:`, error);
          throw error;
        }
      });
    },
  };
}

// Re-export types from javascript-obfuscator for convenience
export type { ObfuscatorOptions };

// Default export for convenience
export default obfuscatedBuild;
