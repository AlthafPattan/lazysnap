import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Output,
  EventEmitter,
  PLATFORM_ID,
  Inject,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { observe } from "@lazysnap/core";
import type {
  LazysnapCleanup,
  LazysnapEntry,
  LazysnapOptions,
  LazysnapState,
} from "@lazysnap/core";

/**
 * Structural directive that lazy-loads an <img> element using @lazysnap/core.
 *
 * Apply to any <img> tag. The directive manages observation, LQIP, blur-up,
 * srcset, and cleanup automatically. Safe to use with Angular Universal (SSR).
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <img
 *   lazysnap
 *   [lazysnapSrc]="'/photos/hero.jpg'"
 *   [lazysnapPlaceholder]="'/photos/hero-lqip.jpg'"
 *   alt="Hero image"
 *   width="1200"
 *   height="800"
 * />
 *
 * <!-- With srcset and event bindings -->
 * <img
 *   lazysnap
 *   [lazysnapSrc]="'/photos/card.jpg'"
 *   [lazysnapSrcset]="'/photos/card-480.jpg 480w, /photos/card-1200.jpg 1200w'"
 *   [lazysnapSizes]="'(max-width: 600px) 100vw, 50vw'"
 *   (lazysnapLoaded)="onImageLoaded($event)"
 *   (lazysnapError)="onImageError($event)"
 *   alt="Card image"
 * />
 * ```
 */
@Directive({
  selector: "img[lazysnap]",
  standalone: true,
  host: {
    "[attr.data-lazysnap-state]": "state",
  },
})
export class LazysnapDirective implements OnInit, OnDestroy {
  /** Full-resolution image URL to load on intersection */
  @Input({ required: true }) lazysnapSrc!: string;

  /** Optional srcset string for responsive images */
  @Input() lazysnapSrcset?: string;

  /** Optional sizes attribute for srcset resolution */
  @Input() lazysnapSizes?: string;

  /** Low-quality image placeholder src or base64 data URI */
  @Input() lazysnapPlaceholder?: string;

  /** Background color shown while loading (fallback when no placeholder) */
  @Input() lazysnapPlaceholderColor?: string;

  /** Blur-up transition duration in milliseconds (0 to disable) */
  @Input() lazysnapTransitionDuration?: number;

  /** IntersectionObserver rootMargin */
  @Input() lazysnapRootMargin?: string;

  /** IntersectionObserver threshold */
  @Input() lazysnapThreshold?: number | number[];

  /** Number of retry attempts on load failure */
  @Input() lazysnapRetries?: number;

  /** Delay in ms between retries */
  @Input() lazysnapRetryDelay?: number;

  /** When true, loads immediately without waiting for intersection */
  @Input() lazysnapEager = false;

  /** Emits the LazysnapEntry when the full-res image finishes loading */
  @Output() lazysnapLoaded = new EventEmitter<LazysnapEntry>();

  /** Emits when the image fails after all retries */
  @Output() lazysnapError = new EventEmitter<{ entry: LazysnapEntry; error: Error }>();

  /** Emits when the element enters the viewport */
  @Output() lazysnapVisible = new EventEmitter<LazysnapEntry>();

  /** Current load state — reflected to [attr.data-lazysnap-state] */
  state: LazysnapState = "idle";

  private cleanup?: LazysnapCleanup;

  constructor(
    private readonly el: ElementRef<HTMLImageElement>,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
    // SSR guard — Angular Universal runs in Node, not the browser
    if (!isPlatformBrowser(this.platformId)) return;

    const img = this.el.nativeElement;

    if (this.lazysnapEager) {
      img.src = this.lazysnapSrc;
      if (this.lazysnapSrcset) img.srcset = this.lazysnapSrcset;
      if (this.lazysnapSizes) img.sizes = this.lazysnapSizes;
      this.state = "loaded";
      return;
    }

    const options: LazysnapOptions = {
      src: this.lazysnapSrc,
      ...(this.lazysnapSrcset && { srcset: this.lazysnapSrcset }),
      ...(this.lazysnapSizes && { sizes: this.lazysnapSizes }),
      ...(this.lazysnapPlaceholder && { placeholder: this.lazysnapPlaceholder }),
      ...(this.lazysnapPlaceholderColor && {
        placeholderColor: this.lazysnapPlaceholderColor,
      }),
      ...(this.lazysnapTransitionDuration !== undefined && {
        transitionDuration: this.lazysnapTransitionDuration,
      }),
      ...(this.lazysnapRootMargin && { rootMargin: this.lazysnapRootMargin }),
      ...(this.lazysnapThreshold !== undefined && {
        threshold: this.lazysnapThreshold,
      }),
      ...(this.lazysnapRetries !== undefined && { retries: this.lazysnapRetries }),
      ...(this.lazysnapRetryDelay !== undefined && {
        retryDelay: this.lazysnapRetryDelay,
      }),
      onLoad: (entry) => {
        this.state = "loaded";
        this.lazysnapLoaded.emit(entry);
      },
      onError: (entry, error) => {
        this.state = "error";
        this.lazysnapError.emit({ entry, error });
      },
      onVisible: (entry) => {
        this.state = "loading";
        this.lazysnapVisible.emit(entry);
      },
    };

    this.cleanup = observe(img, options);
  }

  ngOnDestroy(): void {
    this.cleanup?.();
  }
}
