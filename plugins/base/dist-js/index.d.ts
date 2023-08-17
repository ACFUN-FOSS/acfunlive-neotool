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
