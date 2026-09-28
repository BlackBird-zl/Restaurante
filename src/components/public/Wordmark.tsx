import s from './public.module.css';

/** Typographic wordmark (text + SVG arch rule). Never rasterized, never generated as an image. */
export function Wordmark({ name }: { name: string }) {
  return (
    <span className={s.wordmark}>
      <svg className={s.wordmarkRule} width="22" height="22" viewBox="0 0 22 22" aria-hidden focusable="false">
        <path d="M3 19V9.5a8 8 0 0 1 16 0V19" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7.5 19v-8.5a3.5 3.5 0 0 1 7 0V19" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1 19.5h20" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span className={s.wordmarkText}>{name.toUpperCase()}</span>
    </span>
  );
}
