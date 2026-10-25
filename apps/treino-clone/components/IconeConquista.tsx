import { CalendarCheck, Dumbbell, Flame, Footprints, Shield, Star, Trophy, Undo2, type LucideIcon } from "lucide-react";
import type { Conquista } from "@/lib/gamificacao";

const ICONES: Record<Conquista["icone"], LucideIcon> = {
  flame: Flame,
  dumbbell: Dumbbell,
  calendar: CalendarCheck,
  shield: Shield,
  undo: Undo2,
  footprints: Footprints,
  trophy: Trophy,
  star: Star,
};

export function IconeConquista({ icone, size }: { icone: Conquista["icone"]; size: number }) {
  const Icone = ICONES[icone];
  return <Icone aria-hidden="true" size={size} />;
}
