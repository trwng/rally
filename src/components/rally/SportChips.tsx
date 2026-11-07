import { SPORTS, type SportKey } from "@/lib/rally-data";

interface Props {
  value: SportKey | "all";
  onChange: (v: SportKey | "all") => void;
  sports?: SportKey[];
}

export function SportChips({ value, onChange, sports }: Props) {
  const list = sports ? SPORTS.filter((s) => sports.includes(s.key)) : SPORTS;
  return (
    <div className="-mx-4 overflow-x-auto no-scrollbar">
      <div className="flex gap-1.5 px-4 pb-0.5">
        <Chip active={value === "all"} onClick={() => onChange("all")}>
          All
        </Chip>
        {list.map((s) => (
          <Chip
            key={s.key}
            active={value === s.key}
            onClick={() => onChange(s.key)}
          >
            <span className="mr-1 text-[13px]">{s.emoji}</span>
            {s.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors tap-scale border ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-background text-foreground border-border hover:border-foreground/30"
      }`}
    >
      {children}
    </button>
  );
}
