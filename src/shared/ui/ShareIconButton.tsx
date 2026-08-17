import type { ButtonHTMLAttributes } from "react";
import "./ShareIconButton.css";

export interface ShareIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

/** Icon-only share action - filled circular button, used everywhere the
 * app offers sharing so it stays small, consistent, and easy to spot. */
export function ShareIconButton({ className = "", type = "button", ...rest }: ShareIconButtonProps) {
  return (
    <button type={type} aria-label="გაზიარება" title="გაზიარება" className={`share-icon-button ${className}`.trim()} {...rest}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12" />
        <path d="M7 8l5-5 5 5" />
        <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
    </button>
  );
}
