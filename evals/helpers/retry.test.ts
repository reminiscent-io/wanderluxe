// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { withRetry } from './retry';
import { EvalInfraError } from './errors';

describe('withRetry', () => {
  it('returns the result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, 1, 0)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries once after a failure and returns the second result', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('flake')).mockResolvedValue('ok');
    await expect(withRetry(fn, 1, 0)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error once retries are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('still broken'));
    await expect(withRetry(fn, 1, 0)).rejects.toThrow('still broken');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('supports zero retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('nope'));
    await expect(withRetry(fn, 0, 0)).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('clamps negative retries to a single attempt instead of throwing undefined', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withRetry(fn, -3, 0)).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('EvalInfraError', () => {
  it('sets name and message and satisfies instanceof', () => {
    const err = new EvalInfraError('infra down');
    expect(err.name).toBe('EvalInfraError');
    expect(err.message).toBe('infra down');
    expect(err).toBeInstanceOf(EvalInfraError);
    expect(err).toBeInstanceOf(Error);
  });
});
