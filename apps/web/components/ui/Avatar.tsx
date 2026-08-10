const PALETTE = ["#4f7cff", "#a6ff3f", "#ff8a5c", "#38c7ff", "#ff5c9e", "#8a7bff"];

function hashColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name }: { name: string }) {
  const bg = hashColor(name);
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-base-950"
      style={{ backgroundColor: bg }}
    >
      {initials(name)}
    </div>
  );
}
