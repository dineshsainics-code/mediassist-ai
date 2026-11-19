import React, { useState } from 'react';
import { Building2, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  fallbackVariant?: 'doctor' | 'hospital';
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  fallbackVariant = 'hospital',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    if (fallbackVariant === 'doctor') {
      return (
        <div
          role="img"
          aria-label={alt}
          className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100/80 text-blue-800 select-none ${className}`}
        >
          <Stethoscope className="w-6 h-6 text-blue-700 mb-1.5" aria-hidden="true" />
          {fallbackLabel && (
            <span className="font-display text-base font-bold tracking-tight text-slate-800">
              {fallbackLabel}
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative flex flex-col justify-between bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 text-white p-6 select-none overflow-hidden ${className}`}
      >
        <div className="flex items-center justify-between text-blue-100/90">
          <span className="inline-flex items-center gap-2 text-xs font-medium">
            <Building2 className="w-4 h-4 text-blue-200" aria-hidden="true" />
            <span>Patient Assistance Campus</span>
          </span>
          <ShieldCheck className="w-5 h-5 text-blue-200/80" aria-hidden="true" />
        </div>

        <div className="my-auto py-4 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl border border-white/15 bg-white/10 flex items-center justify-center">
            <HeartPulse className="w-10 h-10 text-blue-100" aria-hidden="true" />
          </div>
        </div>

        <div className="pb-14">
          {fallbackLabel && (
            <p className="font-display text-base font-semibold text-white/95">
              {fallbackLabel}
            </p>
          )}
          <p className="text-xs text-blue-100/80 mt-0.5">
            6 Clinical Specialties · Outpatient &amp; 24/7 Emergency Navigation
          </p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
