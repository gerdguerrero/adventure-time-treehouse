/** Install recovery before attempting graphics initialization, which can throw synchronously. */
export function startRenderer<T>(create: () => T, retry: Pick<GlobalEventHandlers, 'onclick'>, reload: () => void, fail: (message: string) => void): T {
  retry.onclick = reload;
  try { return create(); }
  catch (error) {
    fail('This browser could not start WebGL. Try a browser with hardware acceleration enabled.');
    throw error;
  }
}
