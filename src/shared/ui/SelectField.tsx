import { useState } from "react";
import { Dialog } from "./Dialog";
import "./SelectField.css";

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  /** Set false for required fields (e.g. status) where clearing to "" isn't a valid state. */
  allowClear?: boolean;
}

/** In-app replacement for a native <select>. On Android, a native <select>
 * opens the OS's own picker overlay, which looks and feels out of place
 * next to the rest of the app's custom dialogs. This renders as a styled
 * field that opens the same Dialog primitive used everywhere else in the
 * app, with each option as a tappable row. */
export function SelectField({
  value,
  options,
  onChange,
  placeholder = "— აირჩიე —",
  title,
  disabled,
  allowClear = true
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <button type="button" className="select-field" onClick={() => setOpen(true)} disabled={disabled}>
        <span className={current ? "" : "select-field__placeholder"}>{current?.label ?? placeholder}</span>
        <span className="select-field__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title ?? placeholder}>
        <div className="select-field__options">
          {allowClear && (
            <button
              type="button"
              className={`select-field__option${value === "" ? " select-field__option--selected" : ""}`}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`select-field__option${value === opt.value ? " select-field__option--selected" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Dialog>
    </>
  );
}
