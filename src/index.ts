import type { BunPlugin } from "bun";
import JavaScriptObfuscator from "javascript-obfuscator";
import type { ObfuscatorOptions } from "javascript-obfuscator";

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
 * Creates a Bun bundler plugin that obfuscates JavaScript code using javascript-obfuscator.
 *
 * @param options - Plugin options including javascript-obfuscator options
 * @returns A BunPlugin instance
 *
 * @example
 * ```typescript
 * import { javascriptObfuscator } from "bun-plugin-javascript-obfuscator";
 *
 * await Bun.build({
 *   entrypoints: ["./src/index.ts"],
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
export default javascriptObfuscator;
