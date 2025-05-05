export class FileCompareError extends Error {
    constructor(public message: string = "Cannot compare dissimilar file") {
        super(message);
        this.name = this.constructor.name;
    }

    getMessage(): string {
        return `${this.name}: ${this.message}`;
    }
}