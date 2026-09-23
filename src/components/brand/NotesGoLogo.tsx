'use client';

import React from 'react';

interface NotesGoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

/**
 * NotesGO Official Logomark (Icon only)
 * Modern dynamic geometric emblem: Folding vault document + forward "GO" velocity arrow
 * Forest botanical palette with Mint (#2DD4BF) to Emerald (#4ADE80) glowing gradients.
 */
export function NotesGoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        {/* Background Gradients */}
        <radialGradient
          id="ngBgGlow"
          cx="50%"
          cy="35%"
          r="65%"
          fx="50%"
          fy="30%"
        >
          <stop offset="0%" stopColor="#1E3E2F" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#10231A" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#07130E" stopOpacity="1" />
        </radialGradient>

        {/* Primary Mint-to-Emerald Velocity Gradient */}
        <linearGradient id="ngMintGradient" x1="120" y1="120" x2="390" y2="390" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="50%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#4ADE80" />
        </linearGradient>

        {/* Left Spine Fold Gradient (Deep Vault Texture) */}
        <linearGradient id="ngSpineGradient" x1="120" y1="140" x2="220" y2="380" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        {/* Right Arrow / Forward GO Gradient */}
        <linearGradient id="ngArrowGradient" x1="260" y1="120" x2="400" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="60%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>

        {/* Ambient Drop Glow Filter */}
        <filter id="ngGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="16" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Base Squircle Container */}
      <rect
        x="16"
        y="16"
        width="480"
        height="480"
        rx="116"
        fill="url(#ngBgGlow)"
        stroke="#244134"
        strokeWidth="6"
      />

      {/* Subtle Inner Rim Highlight */}
      <rect
        x="22"
        y="22"
        width="468"
        height="468"
        rx="110"
        fill="none"
        stroke="#2DD4BF"
        strokeWidth="2"
        strokeOpacity="0.18"
      />

      {/* 2. Glow Layer Behind Mark */}
      <g filter="url(#ngGlow)" opacity="0.35">
        <path
          d="M152 144V368L256 264V144L152 144Z"
          fill="#2DD4BF"
        />
        <path
          d="M256 264L360 368V144L256 264Z"
          fill="#4ADE80"
        />
      </g>

      {/* 3. The NotesGO Dynamic Symbol: Geometric "N" + Forward "GO" Winged Arrow */}
      {/* Pillar 1: Left Document Spine (Folded Corner) */}
      <path
        d="M156 168C156 150.327 170.327 136 188 136H216C227.046 136 236 144.954 236 156V356C236 367.046 227.046 376 216 376H188C170.327 376 156 361.673 156 344V168Z"
        fill="url(#ngSpineGradient)"
      />

      {/* Pillar 2: Dynamic Diagonal Bridge forming the "N" and pointing upwards */}
      <path
        d="M228 160L332 308C339.55 318.785 356 313.435 356 300.278V156C356 144.954 347.046 136 336 136H308C296.954 136 288 144.954 288 156V216L228 160Z"
        fill="url(#ngMintGradient)"
      />

      {/* Pillar 3: Fast-Forward Chevron Arrow (The "GO" Velocity Element) */}
      <path
        d="M284 376H324C341.673 376 356 361.673 356 344V260L308 308L284 376Z"
        fill="url(#ngArrowGradient)"
      />

      {/* High-Tech Forward Speed Accent Arrow at Upper Right */}
      <path
        d="M344 140L396 192C403.81 199.81 403.81 212.47 396 220.28L356 260.28V192L344 140Z"
        fill="url(#ngArrowGradient)"
      />

      {/* Floating Sparkle / Knowledge Star */}
      <circle cx="396" cy="140" r="14" fill="#4ADE80" />
      <circle cx="396" cy="140" r="7" fill="#F8FAFC" />
    </svg>
  );
}

/**
 * NotesGO Full Brand Logo with Sora Typography
 */
export function NotesGoLogo({
  size = 36,
  className = '',
  showText = true,
  textClassName = '',
}: NotesGoLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      <NotesGoMark size={size} />

      {showText && (
        <div className="flex items-center">
          <span className={`font-logo font-extrabold tracking-tight text-vault-text ${textClassName || 'text-xl'}`}>
            Notes<span className="bg-gradient-to-r from-vault-primary to-vault-accent bg-clip-text text-transparent">GO</span>
          </span>
        </div>
      )}
    </div>
  );
}
