import { cp, mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

const outputDirectory = "dist";

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: `${outputDirectory}/Code.js`,
  format: "iife",
  globalName: "CraigslistAlertTriage",
  platform: "neutral",
  // Apps Script's V8 runtime supports modern JavaScript but its parser does not
  // accept public class fields. ES2019 makes esbuild lower that syntax.
  target: "es2019",
  footer: {
    js: [
      "function runCraigslistAlerts() { return CraigslistAlertTriage.runCraigslistAlerts(); }",
      "function runDailyDigest() { return CraigslistAlertTriage.runDailyDigest(); }",
      "function installTriggers() { return CraigslistAlertTriage.installTriggers(); }",
      "function baselineExistingAlerts() { return CraigslistAlertTriage.baselineExistingAlerts(); }",
      "function testConfiguration() { return CraigslistAlertTriage.testConfiguration(); }",
      "function testTelegramNotification() { return CraigslistAlertTriage.testTelegramNotification(); }"
    ].join("\n")
  },
  legalComments: "none"
});

await cp("appsscript.json", `${outputDirectory}/appsscript.json`);
