'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ipc } from '@/presentation/lib/ipc';
import { SHOP_ADMIN_LICENSE } from '@/shared/admin-routes';

function ipcErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Request failed';
}

function isLicenseError(message: string): boolean {
  return message.includes('OPERATOR_LICENSE_EXPIRED');
}

/** Load admin IPC data with license/auth error handling (avoids infinite spinners). */
export function useIpcData<T>(channel: string, ...args: unknown[]) {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const argsKey = JSON.stringify(args);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    ipc<T>(channel, ...args)
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = ipcErrorMessage(err);
        setError(message);
        if (isLicenseError(message)) {
          router.replace(SHOP_ADMIN_LICENSE);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [channel, router, argsKey]);

  return { data, error, loading };
}
