import { ChangeDetectorRef } from '@angular/core';
import { finalize, Observable, PartialObserver, Subscription } from 'rxjs';

export function subscribeWithChangeDetection<T>(
  source: Observable<T>,
  changeDetector: ChangeDetectorRef,
  observer: PartialObserver<T>
): Subscription {
  return source.pipe(finalize(() => changeDetector.detectChanges())).subscribe({
    next: (value) => {
      try {
        observer.next?.(value);
      } finally {
        changeDetector.detectChanges();
      }
    },
    error: (error: unknown) => {
      try {
        observer.error?.(error);
      } finally {
        changeDetector.detectChanges();
      }
    },
    complete: () => {
      try {
        observer.complete?.();
      } finally {
        changeDetector.detectChanges();
      }
    }
  });
}
