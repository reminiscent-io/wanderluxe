// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { withRetry } from './retry';

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
});
