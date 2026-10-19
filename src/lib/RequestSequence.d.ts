export class RequestSequence {
  begin(): number
  invalidate(): void
  isCurrent(requestId: number): boolean
}
