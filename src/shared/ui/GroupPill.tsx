import { formatGroupLabel } from "@/entities/group";

export interface GroupPillProps {
  group: { name: string; carNumber: number | null; worker1Name: string; worker2Name: string };
  periodOverride?: { carNumber: number | null; worker1Name: string; worker2Name: string } | null;
  className: string;
  longClassName: string;
}

/** The full group label (car icon+number, name, workers) is often much
 * longer than the old plain-name pill this replaced - rather than
 * truncating or letting it overflow, drop to a smaller font size once the
 * text passes a length threshold, so the whole thing still fits on one
 * line in the same compact pill shape. */
export function GroupPill({ group, periodOverride, className, longClassName }: GroupPillProps) {
  const label = formatGroupLabel(group, periodOverride);
  return <span className={label.length > 18 ? `${className} ${longClassName}` : className}>{label}</span>;
}
