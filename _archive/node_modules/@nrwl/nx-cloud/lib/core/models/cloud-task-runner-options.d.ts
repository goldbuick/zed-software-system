export interface DefaultTasksRunnerOptions {
    parallel?: number;
    cacheableOperations?: string[];
    cacheableTargets?: string[];
    runtimeCacheInputs?: string[];
    cacheDirectory?: string;
    remoteCache?: any;
    lifeCycle: any;
    captureStderr?: boolean;
    skipNxCache?: boolean;
}
export interface CloudTaskRunnerOptions extends DefaultTasksRunnerOptions {
    accessToken?: string;
    canTrackAnalytics?: boolean;
    encryptionKey?: string;
    maskedProperties?: string[];
    scan?: boolean;
    showUsageWarnings?: boolean;
    url?: string;
}
