import "./StatusToggle.css";

export interface StatusToggleProps {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onToggle: () => void;
  disabled?: boolean;
}

/** A single tap cycles between the two states - no dialog/picker needed for
 * a binary status. Used for Job status (active/archived). */
export function StatusToggle({ active, activeLabel, inactiveLabel, onToggle, disabled }: StatusToggleProps) {
  return (
    <button
      type="button"
      className={`status-toggle${active ? " status-toggle--active" : " status-toggle--inactive"}`}
      onClick={onToggle}
      disabled={disabled}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
