'use client';

import { useEffect, useState } from 'react';

type YappLogoProps = {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
};

export function YappLogo({ size = 32, className = '', style }: YappLogoProps) {
    const [fontReady, setFontReady] = useState(false);

    useEffect(() => {
        document.fonts.ready.then(() => setFontReady(true));
    }, []);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={className}
            style={{
                ...style,
                opacity: fontReady ? 1 : 0,
                transition: 'opacity 0.15s ease',
            }}
            aria-label="Yapp logo"
            role="img"
        >
            {/* Speech bubble outline — rounded corners, left-aligned angled tail */}
            <path
                d="M 5.5 2 H 18.5 A 3.5 3.5 0 0 1 22 5.5 V 13 A 3.5 3.5 0 0 1 18.5 16.5 H 9.5 L 5.5 21 L 7.5 16.5 H 5.5 A 3.5 3.5 0 0 1 2 13 V 5.5 A 3.5 3.5 0 0 1 5.5 2 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Y in Righteous font — filled, optically centred inside bubble body */}
            <text
                x="12"
                y="13.8"
                fontFamily="'Righteous', cursive"
                fontSize="12.5"
                fill="currentColor"
                textAnchor="middle"
                style={{ letterSpacing: '0.02em' }}
            >
                Y
            </text>
        </svg>
    );
}
