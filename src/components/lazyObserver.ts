// Shared IntersectionObserver singleton for lazy thumbnail loading.
// One-shot: once a thumbnail enters the viewport (+ margin), the callback fires
// and the element is unobserved. This avoids creating hundreds of individual observers.

const callbacks = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = callbacks.get(entry.target);
            if (cb) {
              cb();
              observer!.unobserve(entry.target);
              callbacks.delete(entry.target);
            }
          }
        }
      },
      // Preload ~4 screens ahead in the horizontal scroll direction
      { rootMargin: '0px 400px' },
    );
  }
  return observer;
}

export function observeThumbnail(el: Element, onVisible: () => void): void {
  callbacks.set(el, onVisible);
  getObserver().observe(el);
}

export function unobserveThumbnail(el: Element): void {
  callbacks.delete(el);
  getObserver().unobserve(el);
}
