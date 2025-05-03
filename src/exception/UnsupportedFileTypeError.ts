export class UnsupportedFileTypeError extends Error {
    constructor(public extname?: string, message: string = "Unsupported File type") {
        super(message);
        this.extname = extname;
        this.name = this.constructor.name;
    }

    getMessage() {
        return `${this.name}: ${this.message} - Type: ${this.extname}`;
    }
}