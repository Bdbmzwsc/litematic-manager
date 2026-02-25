declare module 'deepslate' {
    export class NbtFile {
        root: NbtCompound;
        static read(data: Uint8Array): NbtFile;
        write(): Uint8Array;
    }

    export class NbtCompound {
        keys(): IterableIterator<string>;
        get(key: string): NbtTag | undefined;
        set(key: string, value: NbtTag): void;
        delete(key: string): boolean;
        getCompound(key: string): NbtCompound;
        getNumber(key: string): number;
        getString(key: string): string;
    }

    export class NbtString {
        constructor(value: string);
    }

    export class NbtInt {
        constructor(value: number);
    }

    export type NbtTag = NbtCompound | NbtString | NbtInt | unknown;
}

declare module 'expr-eval' {
    export class Parser {
        evaluate(expression: string, variables?: Record<string, number>): number;
    }
}
