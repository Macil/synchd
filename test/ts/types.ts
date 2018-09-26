// This file isn't executed. Typescript just checks it for type safety.

import {synchd, synchdFn} from '../..';

async function foo() {
  const x: number = await synchd({}, async () => 5);

  const fn: (a: string) => Promise<number> = synchdFn({}, async (a: string) => 32);
}
