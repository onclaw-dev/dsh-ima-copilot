/** Abort-aware FIFO limit around complete IMA question operations. */
export class Semaphore {
  private active = 0
  private readonly queued: Array<{
    signal: AbortSignal
    resolve: (release: () => void) => void
    reject: (error: unknown) => void
    onAbort: () => void
  }> = []

  /** @param limit - maximum simultaneous holders. */
  constructor(private readonly limit: number) {}

  /**
   * Wait for a permit.
   * @param signal - cancellation while queued.
   * @returns a one-shot release callback.
   */
  acquire(signal: AbortSignal): Promise<() => void> {
    if (signal.aborted) return Promise.reject(signal.reason)
    if (this.active < this.limit) {
      this.active += 1
      return Promise.resolve(this.releaseOnce())
    }
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
    })
  }

  private releaseOnce(): () => void {
    let released = false
    return () => {
      if (released) return
      released = true
      while (this.queued.length > 0) {
        const waiter = this.queued.shift()
        if (waiter === undefined || waiter.signal.aborted) continue
        waiter.signal.removeEventListener('abort', waiter.onAbort)
        waiter.resolve(this.releaseOnce())
        return
      }
      this.active -= 1
    }
  }
}
