export declare function isAddressAvailable(hostname: string, port: number): void;
export declare class Server {
    #private;
    private constructor();
    static startServe(dir: string, hostname: string, port: number): Promise<Server>;
    stopServe(): Promise<void>;
    isServing(): Promise<boolean>;
}
