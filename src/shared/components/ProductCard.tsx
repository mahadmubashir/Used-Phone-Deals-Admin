import * as React from 'react';
import { cn } from '../lib/cn';
import { formatPrice } from '../lib/format';
import { ConditionBadge } from './badges';
import { StarRating } from './primitives';
import type { CatalogueListing } from '../types';

/**
 * Buyer-facing product card.
 *
 * Deliberately has no supplier props at all — there is no route by which a
 * supplier name could be rendered here, which is the point.
 *
 * `LinkComponent` and `ImageComponent` are injected so the Next.js portal can
 * pass next/link + next/image while the admin SPA passes plain anchors.
 */

export type LinkLike = React.ComponentType<
  { href: string; className?: string; children: React.ReactNode } & Record<string, unknown>
>;

export type ImageLike = React.ComponentType<
  {
    src: string;
    alt: string;
    className?: string;
    sizes?: string;
    fill?: boolean;
    priority?: boolean;
  } & Record<string, unknown>
>;

const DefaultLink: LinkLike = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

const DefaultImage: ImageLike = ({ src, alt, className, fill, sizes, priority, ...rest }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} className={className} loading={priority ? 'eager' : 'lazy'} {...rest} />
);

export interface ProductCardProps {
  listing: CatalogueListing;
  href?: string;
  LinkComponent?: LinkLike;
  ImageComponent?: ImageLike;
  /** Rendered in the top-right corner — typically a wishlist heart. */
  actionSlot?: React.ReactNode;
  /** Shown under the price when the listing is out of stock. */
  notifySlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  priority?: boolean;
  className?: string;
}

export function ProductCard({
  listing,
  href,
  LinkComponent = DefaultLink,
  ImageComponent = DefaultImage,
  actionSlot,
  notifySlot,
  footerSlot,
  priority,
  className,
}: ProductCardProps) {
  const url = href ?? `/product/${listing.slug}`;
  const cover = listing.images[0];
  const outOfStock = !listing.inStock;

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <LinkComponent href={url} className="block h-full w-full" tabIndex={-1} aria-hidden="true">
          {cover ? (
            <ImageComponent
              src={cover.url}
              alt={cover.alt}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw"
              className={cn(
                'h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]',
                outOfStock && 'opacity-50',
              )}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
          )}
        </LinkComponent>

        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white">
            Out of Stock
          </span>
        )}

        {actionSlot && <div className="absolute right-2 top-2">{actionSlot}</div>}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          {listing.bestAvailableGrade && (
            <ConditionBadge grade={listing.bestAvailableGrade} size="sm" />
          )}
        </div>

        <h3 className="text-sm font-medium leading-snug text-slate-900">
          <LinkComponent
            href={url}
            className="after:absolute after:inset-0 after:content-[''] hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            {listing.title}
          </LinkComponent>
        </h3>

        {listing.reviewCount > 0 ? (
          <StarRating rating={listing.rating} count={listing.reviewCount} size="sm" />
        ) : (
          <span className="text-xs text-slate-400">No reviews yet</span>
        )}

        <div className="mt-auto pt-2">
          <p className="text-lg font-semibold text-slate-900">{formatPrice(listing.pricePence)}</p>
          <p className="text-[11px] text-slate-500">VAT included · Free tracked delivery</p>
        </div>

        {outOfStock && notifySlot && <div className="relative z-10 pt-2">{notifySlot}</div>}
        {footerSlot && <div className="relative z-10 pt-2">{footerSlot}</div>}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-square animate-pulse bg-slate-100" />
      <div className="space-y-2.5 p-4">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-6 w-24 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
