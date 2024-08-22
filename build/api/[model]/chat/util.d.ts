export declare const chatCompletionProviders: {
    [providerSlug: string]: {
        baseUrl: string;
        secret: any;
    };
};
/** Useful utility for streams! */
export declare function pipeResponseToController<T>(response: Response, controller: ReadableStreamDefaultController, reduceFn: (previous: T, current: any, index: number) => T, initialValue: T): Promise<T | undefined>;
//# sourceMappingURL=util.d.ts.map