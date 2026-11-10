/** Abort-aware FIFO limit around complete IMA question operations. */
export class Semaphore {
  private active = 0
  private readonly queued: Array<{
    signal: AbortSignal
    resolve: (release: () => void) => void
    reject: (error: unknown) => void
    onAbort: () => void
  }> = []

  /** @param limit - current maximum simultaneous holders. */
  constructor(private readonly limit: () => number) {}

  /**
   * Wait for a permit.
   * @param signal - cancellation while queued.
   * @returns a one-shot release callback.
   */
  acquire(signal: AbortSignal): Promise<() => void> {
    if (signal.aborted) return Promise.reject(signal.reason)
    return new Promise((resolve, reject) => {
      const waiter = {
        signal,
        resolve,
        reject,
        onAbort: (): void => {
          const index = this.queued.indexOf(waiter)
          if (index >= 0) this.queued.splice(index, 1)
          reject(signal.reason)
        },
      }
      signal.addEventListener('abort', waiter.onAbort, { once: true })
      this.queued.push(waiter)
      this.drain()
    })
  }

  private drain(): void {
    while (this.active < this.limit() && this.queued.length > 0) {
      const waiter = this.queued.shift()
      if (waiter === undefined || waiter.signal.aborted) continue
      waiter.signal.removeEventListener('abort', waiter.onAbort)
      this.active += 1
      waiter.resolve(this.releaseOnce())
    }
  }

  private releaseOnce(): () => void {
    let released = false
    return () => {
      if (released) return
      released = true
      this.active -= 1
      this.drain()
    }
  }
}
