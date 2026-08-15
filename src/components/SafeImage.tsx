import { useState } from 'react';
import { LucideIcon, ImageOff } from 'lucide-react';

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Icon shown inside the fallback box if the image fails to load or has no src. */
  fallbackIcon?: LucideIcon;
  /** Extra classes for the fallback container (background/gradient etc). */
  fallbackClassName?: string;
  /** Icon size inside the fallback box. */
  fallbackIconSize?: number;
}

/**
 * Drop-in replacement for <img> that never leaves a blank/broken box behind.
 * If the image has no src, or fails to load (network error, dead URL, hotlink
 * block, etc.), it swaps to a branded icon placeholder instead of the
 * browser's default broken-image glyph on a white square.
 *
 * Usage: <SafeImage src={url} alt="..." className="w-full h-full object-cover" fallbackIcon={Wrench} />
 */
export default function SafeImage({
  src,
  alt,
  className = '',
  fallbackIcon: FallbackIcon = ImageOff,
  fallbackClassName = '',
  fallbackIconSize = 28,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const gradient = fallbackClassName || 'bg-gradient-to-br from-navy-800 to-navy-950';
    return (
      <div
        className={`flex items-center justify-center ${gradient} ${className}`}
        role="img"
        aria-label={alt}
      >
        <FallbackIcon size={fallbackIconSize} className="text-gold-400" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}