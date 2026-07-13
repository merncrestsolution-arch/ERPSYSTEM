import logoUrl from '../assets/logo.png';
import appIconUrl from '../assets/app-icon.png';

type BrandLogoProps = {
  /** full = wordmark logo; mark = DE monogram icon only */
  variant?: 'full' | 'mark';
  className?: string;
  /** Extra class on the <img> */
  imgClassName?: string;
  alt?: string;
};

/** Dissanayake Enterprises brand mark for web + mobile UI. */
export default function BrandLogo({
  variant = 'full',
  className = '',
  imgClassName = '',
  alt = 'Dissanayake Enterprises',
}: BrandLogoProps) {
  const src = variant === 'mark' ? appIconUrl : logoUrl;
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`object-contain select-none ${imgClassName}`}
        draggable={false}
      />
    </div>
  );
}
