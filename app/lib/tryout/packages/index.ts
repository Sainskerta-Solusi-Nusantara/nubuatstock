import type { TryoutPackage } from "../types";
import { paket01 } from "./paket-01";
import { paket02 } from "./paket-02";
import { paket03 } from "./paket-03";
import { paket04 } from "./paket-04";
import { paket05 } from "./paket-05";
import { paket06 } from "./paket-06";
import { paket07 } from "./paket-07";
import { paket08 } from "./paket-08";
import { paket09 } from "./paket-09";
import { paket10 } from "./paket-10";

/** 10 paket Try Out WMI (soal latihan berbasis silabus). Urut nomor. */
export const TRYOUT_PACKAGES: TryoutPackage[] = [
  paket01,
  paket02,
  paket03,
  paket04,
  paket05,
  paket06,
  paket07,
  paket08,
  paket09,
  paket10,
];

export function getTryoutPackage(slug: string): TryoutPackage | undefined {
  return TRYOUT_PACKAGES.find((p) => p.slug === slug);
}
