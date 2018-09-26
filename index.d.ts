export function synchd<R>(scopeKey: object, fn: () => Promise<R>): Promise<R>;

export function synchdFn<F extends (...args: any[]) => Promise<any>>(scopeKey: object, fn: F): F;
