import React from 'react';

function toImageDelivery(src: string, width?: number, height?: number) {
  if (!src.includes('/r2/')) return src;
  const size = width ?? height ?? 800;
  return `/cdn-cgi/imagedelivery/${src}?width=${size}`;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const optimized = toImageDelivery(src, width, height);
  return <img src={optimized} alt={alt} width={width} height={height} className={className} />;
}
