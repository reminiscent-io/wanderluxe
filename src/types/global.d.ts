
interface Window {
  gtag: {
    (
      command: 'event',
      action: string,
      params: {
        event_category?: string;
        event_label?: string;
        value?: number;
        [key: string]: unknown;
      }
    ): void;
    (command: 'js', date: Date): void;
    (command: 'config', measurementId: string, params?: Record<string, unknown>): void;
    (command: 'consent', state: 'default' | 'update', params: Record<string, unknown>): void;
  };
}
