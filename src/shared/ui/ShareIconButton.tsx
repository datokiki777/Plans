import type { ButtonHTMLAttributes } from "react";
import "./ShareIconButton.css";

export interface ShareIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

/** Compact icon-only share action (Material "share" glyph) - used
 * everywhere the app offers sharing, so it stays small and consistent
 * instead of a full text-label button. */
export function ShareIconButton({ className = "", type = "button", ...rest }: ShareIconButtonProps) {
  return (
    <button type={type} aria-label="გაზიარება" title="გაზიარება" className={`share-icon-button ${className}`.trim()} {...rest}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L7.04 9.81C6.5 9.31 5.79 9 5 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
      </svg>
    </button>
  );
}
