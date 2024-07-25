import Ajv, { ValidateFunction } from "ajv";
import { readFile } from "fs/promises";

export class SchemaInvalidError extends Error {
    constructor(public errors: any) {
        super('Schema invalid');
    }

    public toJSON() {
        return {
            message: this.message,
            errors: this.errors
        };
    }

    public toString() {
        return 'SchemaInvalidError: ' + JSON.stringify(this.errors, null, 2);
    }
}

class TypeValidator {
    public ajv = new Ajv();

    public validators: Map<string, ValidateFunction> = new Map();

    constructor() { }

    public async initialize() {
        this.validators.set('ConfigType', this.ajv.compile(await this.loadSchema('ConfigType.json')));
    }

    private async loadSchema(schemaPath: string) {
        let baseDir = __dirname + '/../schemas/';
        return JSON.parse(await readFile(baseDir + schemaPath, { encoding: 'utf-8' }));
    }

    public validate(type: string, data: any): boolean {
        const validator = this.validators.get(type);
        if (!validator) {
            throw new Error(`Validator for type ${type} not found.`);
        }

        return validator(data);
    }

    public get validateConfig() {
        return this.validators.get('ConfigType')!;
    }
}

export const validator = new TypeValidator();