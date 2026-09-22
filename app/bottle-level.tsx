'use client';

import { useId } from 'react';
import { useI18n } from '@/lib/i18n';

/** A schematic inventory gauge. Liquid encodes one open bottle, never the total batch volume. */
export default function BottleLevel({ volume, capacity, index }: { volume: number; capacity: number; index: number }) {
  const { t, format } = useI18n();
  const id = useId().replace(/:/g, '');
  const valid = Number.isFinite(volume) && Number.isFinite(capacity) && capacity > 0 && volume >= 0 && volume <= capacity;
  const ratio = valid ? volume / capacity : 0;
  const level = 210 - ratio * 137;
  const shape = 'M62 26H88V61C88 75 112 76 112 99V201Q112 214 99 214H51Q38 214 38 201V99C38 76 62 75 62 61Z';
  return <figure className="bottle-gauge" aria-label={t('Rest in Flasche {index}', { index })}>
    <svg viewBox="0 0 150 244" role="img" aria-label={valid ? t('{volume} ml von {capacity} ml', { volume: format(volume), capacity: format(capacity) }) : t('Bitte die Mengen prüfen.')}>
      <defs>
        <clipPath id={`${id}-clip`}><path d={shape} /></clipPath>
        <linearGradient id={`${id}-glass`}><stop stopColor="#e0f2ff" stopOpacity=".35" /><stop offset=".2" stopColor="#c9e8ff" stopOpacity=".04" /><stop offset=".7" stopColor="#c9e8ff" stopOpacity=".015" /><stop offset="1" stopColor="#deefff" stopOpacity=".3" /></linearGradient>
        <linearGradient id={`${id}-liquid`} x2="0" y2="1"><stop stopColor="#ff947f" stopOpacity=".9" /><stop offset="1" stopColor="#f85d53" stopOpacity=".5" /></linearGradient>
        <linearGradient id={`${id}-cap`}><stop stopColor="#4b5762" /><stop offset=".4" stopColor="#111a22" /><stop offset=".8" stopColor="#35424e" /><stop offset="1" stopColor="#7b8a98" /></linearGradient>
      </defs>
      <ellipse cx="75" cy="222" rx="40" ry="6" fill="#000" opacity=".5" />
      <path d={shape} fill={`url(#${id}-glass)`} stroke="#b7cee1" strokeOpacity=".6" strokeWidth="1.2" />
      <g clipPath={`url(#${id}-clip)`}>
        <g className="bottle-liquid" style={{ transform: `translateY(${level}px)`, opacity: ratio > 0 ? 1 : 0 }}>
          <rect x="38" y="0" width="74" height="220" fill={`url(#${id}-liquid)`} />
          <path key={`${volume}-${capacity}`} className="liquid-wave" d="M30 0Q52 -5 75 0T120 0" fill="none" stroke="#ffd1ba" strokeWidth="2" />
        </g>
        <path d="M46 102V198M103 99V201" stroke="#deefff" strokeWidth="2.3" strokeOpacity=".25" />
      </g>
      <rect x="59" y="13" width="32" height="19" rx="3" fill={`url(#${id}-cap)`} stroke="#a1b5c5" strokeOpacity=".6" />
      <path d="M60 21H90M63 36H87" stroke="#afc0cc" strokeOpacity=".3" />
      <path d="M97 77H112" stroke="#b8d1e7" strokeOpacity=".65" />
      <text x="75" y="120" fill="#dbe8f4" textAnchor="middle" fontSize="10" letterSpacing="2">BATCH</text>
      <text x="75" y="239" fill="#b4c8d9" textAnchor="middle" fontSize="12">{valid ? `${format(volume)} ml` : '—'}</text>
    </svg>
    <figcaption>{t('Restflasche {index}', { index })}</figcaption>
  </figure>;
}
