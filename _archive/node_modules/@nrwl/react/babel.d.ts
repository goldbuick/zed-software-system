interface NxReactBabelOptions {
    runtime?: string;
    importSource?: string;
    useBuiltIns?: boolean | string;
    decorators?: {
        decoratorsBeforeExport?: boolean;
        legacy?: boolean;
    };
    classProperties?: {
        loose?: boolean;
    };
}
declare function getReactPresetOptions({ presetOptions, env }: {
    presetOptions: any;
    env: any;
}): Record<string, string | boolean>;
