interface ConfigOptions {
    keys?: boolean
    values?: boolean
}
type CompareConfigKeysRecord = Record<"missingKeysInFirstConfigFile" | "missingKeysInSecondConfigFile", string[]>;
type StringStringOrUndefinedRecord = { 
    [key: string]: string | undefined;
}

type StringStringRecord = {
    [key: string] :  string
}

export { ConfigOptions, CompareConfigKeysRecord, StringStringOrUndefinedRecord, StringStringRecord }