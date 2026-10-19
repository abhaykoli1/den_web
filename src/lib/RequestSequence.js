/** Marks only the newest async request as eligible to update shared UI state. */
export class RequestSequence {
  #current = 0

  begin() {
    this.#current += 1
    return this.#current
  }

  invalidate() {
    this.#current += 1
  }

  isCurrent(requestId) {
    return requestId === this.#current
  }
}
