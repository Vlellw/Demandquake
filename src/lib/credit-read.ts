/** Bound credit reads even when a transport or auth middleware never settles. */
export async function boundedCreditRead<T>(read: (signal: AbortSignal) => Promise<T>, parent?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => controller.abort();
  parent?.addEventListener('abort', cancel, { once: true });
  if (parent?.aborted) cancel();
  try {
    return await Promise.race([
      read(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new TypeError('Failed to fetch'));
        }, 15_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', cancel);
  }
}