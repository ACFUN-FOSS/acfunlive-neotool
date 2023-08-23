export type AppConfig = {
    id: string;
    name: string;
    path: string;
    description?: string;
    entry: string;
    css?: string;
};
export declare function loadAppsConfig(appsDir: string): Promise<AppConfig[]>;
export declare function canonicalize(path: string): Promise<string>;
export declare function hashFileSha256(path: string): Promise<string>;
export declare function symlinkDir(source: string, destination: string): Promise<void>;
