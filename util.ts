// deno-lint-ignore-file no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, delay - (now - lastCall));
    }
  };
}

export async function* interleave<T, K>(
  iterator1: AsyncIterableIterator<T>,
  iterator2: AsyncIterableIterator<K>,
): AsyncIterableIterator<T | K> {
  const iterators = [iterator1, iterator2];

  const nextPromises = iterators.map((iterator) => iterator.next());

  while (nextPromises.length > 0) {
    // Wait for the first available promise
    const { value, done, index } = await Promise.race(
      nextPromises.map((promise, idx) =>
        promise.then((result) => ({ ...result, index: idx }))
      ),
    );

    if (done) {
      // If an iterator is done, remove it from the iterators array
      nextPromises.splice(index, 1);
    } else {
      // Yield the available value and schedule the next promise from this iterator
      yield value;
      nextPromises[index] = iterators[index].next();
    }
  }
}
