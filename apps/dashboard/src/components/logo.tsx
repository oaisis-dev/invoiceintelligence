interface LogoProps {
  className?: string;
}

export function LogoIcon({ className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 72"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id="ii-icon-mask" x="-2" y="0" width="56" height="76" maskUnits="userSpaceOnUse">
          <g>
            <rect x="-2" width="56" height="76" fill="#fff" />
            <path d="M26,24c2,12,6,16,18,18-12,2-16,6-18,18-2-12-6-16-18-18,12-2,16-6,18-18Z" />
          </g>
        </mask>
      </defs>
      <g mask="url(#ii-icon-mask)">
        <path
          d="M2,10c0-3.866,3.134-7,7-7h21l18,18v41c0,3.866-3.134,7-7,7H9c-3.866,0-7-3.134-7-7V10Z"
          fill="#27653d"
        />
        <path d="M30,3v12c0,3.314,2.686,6,6,6h12L30,3Z" fill="#1e5030" />
      </g>
    </svg>
  );
}

export function LogoLockup({ className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 212.656 75.557"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask
          id="ii-lockup-mask"
          x="0"
          y="0"
          width="320"
          height="82"
          maskUnits="userSpaceOnUse"
        >
          <g>
            <rect width="320" height="82" fill="#fff" />
            <path d="M28,26c2,12,6,16,18,18-12,2-16,6-18,18-2-12-6-16-18-18,12-2,16-6,18-18Z" />
          </g>
        </mask>
      </defs>
      <g mask="url(#ii-lockup-mask)">
        <path
          d="M4,10c0-3.866,3.134-7,7-7h23l18,18v45c0,3.866-3.134,7-7,7H11c-3.866,0-7-3.134-7-7V10Z"
          fill="#27653d"
        />
        <path d="M34,3v12c0,3.314,2.686,6,6,6h12L34,3Z" fill="#1e5030" />
      </g>
      <text
        transform="translate(68 36)"
        fill="#27653d"
        fontFamily="Helvetica-Bold, Helvetica"
        fontSize="28"
        fontWeight="700"
        letterSpacing="-.028em"
      >
        <tspan x="0" y="0">
          Invoice
        </tspan>
      </text>
      <text
        transform="translate(68 60)"
        fill="#27653d"
        fontFamily="Helvetica-Light, Helvetica"
        fontSize="28"
        fontWeight="300"
        letterSpacing="-.017em"
        opacity=".65"
      >
        <tspan x="0" y="0">
          Intelligence
        </tspan>
      </text>
    </svg>
  );
}
