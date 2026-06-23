import logoUrl from '../assets/ntr-logo.png';

export default function BrandLogo({ compact = false, className = '' }) {
  return (
    <img
      src={logoUrl}
      alt="NTR Neurotraumas"
      className={`${compact ? 'h-10 w-auto' : 'h-16 w-auto'} object-contain ${className}`}
    />
  );
}
