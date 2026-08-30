/** Abort-aware FIFO limit around complete IMA question operations. */
export declare class Semaphore {
    private readonly limit;
    private active;
    private readonly queued;
    /** @param limit - maximum simultaneous holders. */
    constructor(limit: number);
    /**
     * Wait for a permit.
     * @param signal - cancellation while queued.
     * @returns a one-shot release callback.
     */
    acquire(signal: AbortSignal): Promise<() => void>;
    private releaseOnce;
}
//# sourceMappingURL=semaphore.d.ts.map