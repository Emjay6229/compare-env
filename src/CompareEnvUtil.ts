import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import yaml from 'js-yaml';
import chalk from 'chalk';
import { FileNotFoundError } from './exception/FileNotFoundError';
import { UnsupportedFileTypeError} from './exception/UnsupportedFileTypeError';
import { ConfigOptions, CompareConfigKeysRecord, StringStringOrUndefinedRecord, StringStringRecord } from './types';
import { FileCompareError } from './exception/FileCompareError';
// import Table from 'cli-table3';
/**
 * This is a utility class that compares config (.env or .yaml/.yml) files and outputs the difference.
 * Exposes a single public instance method @compare
 */
export class CompareEnv {
    private firstConfigFile: string;
    private secondConfigFile: string;
    private options: ConfigOptions;

    constructor(
        firstConfigFile: string, 
        secondConfigFile: string, 
        options: ConfigOptions) {
        this.firstConfigFile = firstConfigFile;
        this.secondConfigFile = secondConfigFile;
        this.options = options;
    }

    /**
     * @description compares two config files for differences
     * @returns void
     */
    compare(): void {
        try {
            this.checkIfBothFilesAreOfSameType(this.firstConfigFile, this.secondConfigFile);
            // reads, validates file type and parses the raws file into a Plain JavaScript Object
            const firstConfigObject: StringStringOrUndefinedRecord = this.parseFile(this.firstConfigFile);
            const secondConfigObject: StringStringOrUndefinedRecord = this.parseFile(this.secondConfigFile);
    
            // breaks operation if any of the config file objects are empty.
            this.checkIfAnyEnvironmentObjectIsEmpty(firstConfigObject, secondConfigObject);
    
            // extract the keys from each config file
            const firstConfigObjectKeys: string[] = Object.keys(firstConfigObject);
            const secondConfigObjectKeys: string[] = Object.keys(secondConfigObject);
    
            if (this.options.keys) {
                // compares and prints the missing keys in each config file
                const compareResult: CompareConfigKeysRecord = CompareEnv.compareEnvKeys(firstConfigObjectKeys, secondConfigObjectKeys);
                this.printKeyDifferences(compareResult);
                return;
            } else if (this.options.values) {
                // compares and prints keys present in both files but having different values.
                // useful when both files are sure to contain same keys but different values
                const configDifferences: Record<string, StringStringRecord> = this.getValueDifferences(firstConfigObject, secondConfigObject);

                Object.keys(configDifferences).length > 0 
                    ? this.printValueDifferences(configDifferences) 
                    : console.log(chalk.green('\n No value differences found between the two files.\n'));
            }
        } catch (e: unknown) {
            if (e instanceof FileNotFoundError || e instanceof UnsupportedFileTypeError || e instanceof FileCompareError) {
                console.error(`Something went wrong: [${e.getMessage()}]`);  
            } else {
                console.error(`An unknown error occurred: [${e}]`);
            }
            process.exit(1);
        }
    }

    private parseFile(filePath: string): StringStringOrUndefinedRecord {
        const { extname, resolvedPath } = this.validateAndReturnResolvedFilePath(filePath);
        let content: string;
    
        if (extname === '.env') {
            content = fs.readFileSync(resolvedPath, 'utf8');
            return dotenv.parse(content);
        } else {
            content = fs.readFileSync(resolvedPath, 'utf8');
            return CompareEnv.flattenObj(<StringStringOrUndefinedRecord>yaml.load(content));
        }
    }

    private validateAndReturnResolvedFilePath(configFilePath: string): StringStringRecord {
        const resolvedPath: string = path.resolve(process.cwd(), configFilePath);

        // throws an exception is inputted config file does not exist
        if (!fs.existsSync(resolvedPath)) {
            throw new FileNotFoundError(resolvedPath);
        }

        const extname: string = path.extname(resolvedPath);
 
        if (extname !== '.env' && extname !== '.yaml' && extname !== '.yml') {
            throw new UnsupportedFileTypeError(extname);
        }
        return { resolvedPath, extname };
    }

    private static flattenObj(obj: Record<string, any>, parentKey = '', sep = '.'): StringStringRecord {
        let result: StringStringRecord = {};

        for (const key in obj) {
          const newKey: string = parentKey ? parentKey + sep + key : key;
          
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            // recursively flatten nested object and merge into a single object using mixins
            Object.assign(result, this.flattenObj(obj[key], newKey, sep));
          } else {
            result[newKey] = obj[key];
          }
        }
        return result;
      }

    private static isEmpty(obj: Object) {
        return Object.keys(obj).length === 0;
    }

    private checkIfAnyEnvironmentObjectIsEmpty(firstConfigObject: Object, secondConfigObject: Object): void {
        if (CompareEnv.isEmpty(firstConfigObject) && CompareEnv.isEmpty(secondConfigObject)) {
            console.log(chalk.green('Both config files are empty.'));
            return;
        }

        if (CompareEnv.isEmpty(firstConfigObject)) {
            console.log(chalk.green(`file ${this.firstConfigFile} is empty.`));
            return;
        }

        if (CompareEnv.isEmpty(secondConfigObject)) {
            console.log(chalk.green(`file ${this.secondConfigFile} is empty.`));
            return;
        }
    }

   private static compareEnvKeys(firstConfigObjectArray: string[], secondConfigObjectArray: string[]) {
        // converts the array to a Set object for faster lookup
        const set1 = new Set(firstConfigObjectArray);
        const set2 = new Set(secondConfigObjectArray);

        // Find keys in arr2 that are missing in arr1
        const missingKeysInFirstConfigFile = secondConfigObjectArray.filter(item => !set1.has(item));
        // Find keys in arr1 that are missing in arr2
        const missingKeysInSecondConfigFile = firstConfigObjectArray.filter(item => !set2.has(item));
        return {
            missingKeysInFirstConfigFile,
            missingKeysInSecondConfigFile
        };
    }

    private static determineMessageByCheckingArraySize(array: string[]): string {
        if (array.length === 0) {
            return "No missing key in config file";
        }
        return array.length === 1 ? "This key is missing from" : "These keys are missing from";
    }

    private printKeyDifferences(result: CompareConfigKeysRecord): void {
        // format output as enumerated
        const firstConfigOutput: string = CompareEnv.formatKeysAsEnumerated(result.missingKeysInFirstConfigFile);
        const secondConfigOutput: string = CompareEnv.formatKeysAsEnumerated(result.missingKeysInSecondConfigFile);
    
        console.log(chalk.yellow(`\n${CompareEnv.determineMessageByCheckingArraySize(result.missingKeysInFirstConfigFile)} ${this.firstConfigFile}:\n`));
        console.log(chalk.green(firstConfigOutput));
    
        console.log(chalk.yellow(`\n${CompareEnv.determineMessageByCheckingArraySize(result.missingKeysInSecondConfigFile)} ${this.secondConfigFile}:\n`));
        console.log(chalk.green(secondConfigOutput));
    }
    
    private getValueDifferences(firstConfigObject: StringStringOrUndefinedRecord, secondConfigObject: StringStringOrUndefinedRecord): Record<string, StringStringRecord> {
        // This logic retrieves all possible obtainable keys from both files into a large set to eliminate duplicates and faster lookup
        const allKeys: Set<string> = new Set([...Object.keys(firstConfigObject), ...Object.keys(secondConfigObject)]);
        const differences: Record<string, StringStringRecord> = {};
    
        // Checks for key presence (non-null or not undefined)
        allKeys.forEach(key => {
            const value1: string | undefined = firstConfigObject[key];
            const value2: string | undefined = secondConfigObject[key];
    
            // if the key has defined values in both config files and both values are not equal
            // construct the output object -> an object of e
            if (value1 !== undefined && value2 !== undefined && value1 !== value2) {
                differences[key] = {
                    [this.firstConfigFile]: value1,
                    [this.secondConfigFile]: value2
                };
            }
        });
    
        return differences;
    }

    private printValueDifferences(output: Record<string, StringStringRecord>): void {
        console.log(chalk.yellow(`\nDifferences found between files:\n`));

        let index = 1;
        for (const [key, values] of Object.entries(output)) {
            console.log(chalk.green(`${index++}. ${key}\n`));
            console.log(`\t${chalk.blueBright(this.firstConfigFile)}: ${chalk.magentaBright(values[this.firstConfigFile])}\n`);
            console.log(`\t${chalk.blueBright(this.secondConfigFile)}: ${chalk.white(values[this.secondConfigFile])}\n`);
        }
    }

    // private printValueDifferencesInTabularFormat(output: Record<string, StringStringRecord>): void {
    //     console.log(chalk.yellow(`\nDifferences found between files:\n`));

    //     let tableData = new Table({
    //         head: ["Key", this.firstConfigFile, this.secondConfigFile],
    //         colWidths: [50, 50, 50],
    //         wordWrap: true,    
    //     });

    //     //let index = 1;
    //     for (const [key, values] of Object.entries(output)) {
    //         tableData.push(
    //             [chalk.yellow(key), values[this.firstConfigFile], values[this.secondConfigFile]]
    //         );

    //         console.log(chalk.green(`${index++}. ${key}\n`));
    //         console.log(`\t${chalk.blueBright(this.firstConfigFile)}: ${chalk.magentaBright(values[this.firstConfigFile])}\n`);
    //         console.log(`\t${chalk.blueBright(this.secondConfigFile)}: ${chalk.white(values[this.secondConfigFile])}\n`);
    //     }
    //     console.log(tableData.toString());
    // }

    private static formatKeysAsEnumerated(arg: string[]): string {
        return arg.map((key, index) => `${index++}. ${key}`).join('\n\n');
    }

    private checkIfBothFilesAreOfSameType(fileOne: string, fileTwo: string): void {
       const fileOneExtName: string = path.extname(fileOne);
       const fileTwoExtName: string = path.extname(fileTwo);

       if (fileOneExtName !== fileTwoExtName) {
        throw new FileCompareError();
       }
    }
}