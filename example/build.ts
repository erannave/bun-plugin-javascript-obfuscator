/**
 * Example build script demonstrating the bun-plugin-javascript-obfuscator plugin.
 *
 * Run with: bun run example/build.ts
 */
import { obfuscatedBuild } from "../src/index";

// Using the new obfuscatedBuild function
// This approach:
// 1. Uses Bun to compile TypeScript to JavaScript and apply minification
// 2. Bundles node_modules separately (not obfuscated) - if any are used
// 3. Applies obfuscation only to your application code
const result = await obfuscatedBuild({
  entrypoints: ["./example/src/index.ts"],
  outdir: "./example/dist",
  minify: true, // Bun handles minification before obfuscation

  // Obfuscator options (applied after Bun's compilation)
  obfuscator: {
    // Light obfuscation for this example
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: "hexadecimal",
    log: false,
    renameGlobals: false,
    selfDefending: false,
    stringArray: true,
    stringArrayThreshold: 0.75,
  },

  // Bundle node_modules into a separate vendor.js file (not obfuscated)
  // When there are no external dependencies, no vendor bundle is created
  bundleNodeModules: true,
  nodeModulesBundleName: "vendor.js",
});

if (result.success) {
  console.log("Build completed successfully!");
  console.log("\nOutput files (obfuscated):");
  for (const output of result.outputs) {
    console.log(`  - ${output.path}`);
  }

  if (result.vendorOutput?.success && result.vendorOutput.outputs.length > 0) {
    console.log("\nVendor bundle (not obfuscated):");
    for (const output of result.vendorOutput.outputs) {
      console.log(`  - ${output.path}`);
    }
  } else {
    console.log("\nNo vendor bundle created (no external dependencies)");
  }
} else {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}
