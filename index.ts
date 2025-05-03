#! /usr/bin/env node
import { program } from "commander";
import { CompareEnv } from "./src/CompareEnvUtil";

program
  .name("compare")
  .description("Compare .env or .yaml configuration files for differences")
  .argument("<file1>", "First config file")
  .argument("<file2>", "Second config file")
  .option("--keys", "compares and prints only missing keys", false)
  .option("--values", "compares and prints only missing values", false)
  .option("--show-undefined", "compares and prints all keys and values", false)
  .action((file1, file2, options) => {
    const compareEnv = new CompareEnv(file1, file2, options);  
    compareEnv.compare();
  }).parse(process.argv);
