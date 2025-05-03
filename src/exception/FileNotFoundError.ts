export class FileNotFoundError extends Error {
    constructor(public filePath: string, message: string = "File Not Found") {
        super(message);
        this.filePath = filePath;
        this.name = this.constructor.name;
    }

    getMessage(): string {
        return `${this.name}: ${this.message} - File: ${this.filePath}`;
    }
}