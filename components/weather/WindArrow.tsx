"use client";

import { windArrowRotation } from "@/lib/utils/wind";

interface WindArrowProps {
  degrees: number;
  className?: string;
  size?: number;
}

/** Windpijl: kop wijst naar waar wind vandaan komt (meteorologische richting). */
export function WindArrow({ degrees, className, size = 40 }: WindArrowProps) {
  const rotation = windArrowRotation(degrees);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: "transform 0.7s ease",
      }}
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.2"
      />
      <circle cx="24" cy="24" r="2.5" fill="currentColor" opacity="0.5" />
      <path
        d="M24 8 L18 22 L22 22 L22 34 L26 34 L26 22 L30 22 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
