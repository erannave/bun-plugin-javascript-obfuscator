/**
 * Example build script demonstrating the bun-plugin-javascript-obfuscator plugin.
 *
 * Run with: bun run example/build.ts
 */
import { javascriptObfuscator } from "../src/index";

const result = await Bun.build({
  entrypoints: ["./example/src/index.ts"],
  outdir: "./example/dist",
  plugins: [
    javascriptObfuscator({
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
    }),
  ],
});

if (result.success) {
  console.log("Build completed successfully!");
  console.log("Output files:");
  for (const output of result.outputs) {
    console.log(`  - ${output.path}`);
  }
} else {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}
