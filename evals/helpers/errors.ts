// Thrown when an eval case cannot produce a verdict for infrastructure
// reasons (API down, judge returned garbage twice, server unreachable).
// runCase records these as status "error" so infra flakiness is never read
// as a quality regression (which records as "fail").
export class EvalInfraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvalInfraError';
  }
}
