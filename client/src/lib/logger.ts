
export const logger = {
  log: (...args: any[]) => {
    console.log('[App]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[App Error]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[App Warning]', ...args);
  }
};
