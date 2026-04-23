import bg01 from "../assets/backgrounds/background01.jpg";
import bg02 from "../assets/backgrounds/background02.jpg";
import bg03 from "../assets/backgrounds/background03.jpg";
import bg04 from "../assets/backgrounds/background04.jpg";
import bg05 from "../assets/backgrounds/background05.jpg";
import bg06 from "../assets/backgrounds/background06.jpg";
import bg07 from "../assets/backgrounds/background07.jpg";
import bg08 from "../assets/backgrounds/background08.jpg";
import bg09 from "../assets/backgrounds/background09.jpg";
import bg10 from "../assets/backgrounds/background10.jpg";
import bg11 from "../assets/backgrounds/background11.jpg";
import bg12 from "../assets/backgrounds/background12.jpg";
import bg13 from "../assets/backgrounds/background13.jpg";
import bg14 from "../assets/backgrounds/background14.jpg";

export interface BackgroundOption {
  id: string;
  url: string;
}

export const BACKGROUNDS: BackgroundOption[] = [
  { id: "background01", url: bg01 },
  { id: "background02", url: bg02 },
  { id: "background03", url: bg03 },
  { id: "background04", url: bg04 },
  { id: "background05", url: bg05 },
  { id: "background06", url: bg06 },
  { id: "background07", url: bg07 },
  { id: "background08", url: bg08 },
  { id: "background09", url: bg09 },
  { id: "background10", url: bg10 },
  { id: "background11", url: bg11 },
  { id: "background12", url: bg12 },
  { id: "background13", url: bg13 },
  { id: "background14", url: bg14 },
];

export function getBgUrl(id: string | null): string | undefined {
  if (!id) return undefined;
  return BACKGROUNDS.find((b) => b.id === id)?.url;
}
