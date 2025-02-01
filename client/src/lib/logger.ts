
export const logger = {
  log: (...args: any[]) => {
    console.log('[App]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[App Error]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[App Warning]', ...args);
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[App Debug]', ...args);
    }
  }
};
