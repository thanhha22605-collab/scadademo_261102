import type { ImgHTMLAttributes } from 'react';

type StaticImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
};

export default function StaticImage({
  priority,
  alt = '',
  ...props
}: StaticImageProps) {
  return (
    // GitHub Pages serves the pre-sized local map asset directly.
    // oxlint-disable-next-line next/no-img-element
    <img
      {...props}
      alt={alt}
      loading={priority ? 'eager' : props.loading}
      fetchPriority={priority ? 'high' : props.fetchPriority}
    />
  );
}
