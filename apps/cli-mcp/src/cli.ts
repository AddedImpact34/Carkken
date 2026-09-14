#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import {
  handleTokenize,
  handleWhitelist,
  handleMint,
  handleLaunchOffering,
  handleAgentRegister,
  handleMandateIssue,
  handleRentBook,
  handleFeedback,
} from "./handlers";

const program = new Command("carkken");

function readJson(filePath: string) {
  const base = process.env.INIT_CWD || process.cwd();
  const fullPath = path.resolve(base, filePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

program
  .command("tokenize")
  .requiredOption("--file <path>", "vehicle JSON")
  .action(async (opts) => console.log(await handleTokenize(readJson(opts.file))));

program
  .command("whitelist")
  .requiredOption("--file <path>", "{ tokenSymbol, investorAddress, investorEmail }")
  .action(async (opts) => console.log(await handleWhitelist(readJson(opts.file))));

program
  .command("mint")
  .requiredOption("--file <path>", "{ tokenSymbol, investorEmail, investorAddress, amount }")
  .action(async (opts) => console.log(await handleMint(readJson(opts.file))));

program
  .command("offering-launch")
  .requiredOption("--file <path>", "STO settings")
  .action(async (opts) => console.log(await handleLaunchOffering(readJson(opts.file))));

program
  .command("agent-register")
  .requiredOption("--file <path>", "{ name, description, image, services[] }")
  .action(async (opts) => console.log(await handleAgentRegister(readJson(opts.file))));

program
  .command("mandate-issue")
  .requiredOption("--file <path>", "mandate settings")
  .action(async (opts) => console.log(await handleMandateIssue(readJson(opts.file))));

program
  .command("rent-book")
  .requiredOption("--file <path>", "{ mandate, renterAgentId, amount, method }")
  .action(async (opts) => console.log(await handleRentBook(readJson(opts.file))));

program
  .command("feedback")
  .requiredOption("--file <path>", "{ agentId, score, comment }")
  .action(async (opts) => console.log(await handleFeedback(readJson(opts.file))));

program.parseAsync(process.argv);
