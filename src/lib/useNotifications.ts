import { useEffect, useRef, useState } from 'react';
import {
  type Credentials,
  type NotificationBody,
  deleteNotification,
  receiveNotification,
} from '../api/greenApi';

export type PollStatus = 'idle' | 'polling' | 'error';

/**
 * Long-polls ReceiveNotification while mounted. Every notification is passed to `onNotification`
 * and then removed from the queue with DeleteNotification, as the HTTP API requires.
 */
export function useNotifications(
  creds: Credentials | null,
  onNotification: (body: NotificationBody) => void,
): PollStatus {
  const [status, setStatus] = useState<PollStatus>('idle');
  const handler = useRef(onNotification);
  handler.current = onNotification;

  useEffect(() => {
    if (!creds) return;
    const controller = new AbortController();
    let stopped = false;

    async function loop() {
      let backoff = 1000;
      while (!stopped) {
        try {
          setStatus('polling');
          const notification = await receiveNotification(creds!, 5, controller.signal);
          if (notification) {
            handler.current(notification.body);
            await deleteNotification(creds!, notification.receiptId);
          }
          backoff = 1000;
        } catch (err) {
          if (stopped) return;
          console.error('[green-api-chat] polling failed', err);
          setStatus('error');
          await new Promise((r) => setTimeout(r, backoff));
          backoff = Math.min(backoff * 2, 30000);
        }
      }
    }

    loop();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [creds]);

  return status;
}
