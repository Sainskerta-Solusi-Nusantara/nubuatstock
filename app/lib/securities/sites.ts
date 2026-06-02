/**
 * Pemetaan nama sekuritas → halaman riset/insight resmi mereka.
 * Dipakai agar Nubuat (agregator) bisa menautkan user langsung ke sumber,
 * sebagai perpanjangan tangan — bukan mengklaim konten.
 */
const SITES: { match: RegExp; url: string }[] = [
  { match: /henan/i, url: "https://hpsekuritas.id/insight" },
  { match: /mirae/i, url: "https://sekuritas.miraeasset.co.id/research/marketReport" },
  { match: /indo ?premier|ipot/i, url: "https://www.indopremier.com" },
  { match: /mandiri/i, url: "https://www.mandirisekuritas.co.id" },
  { match: /danareksa|bri danareksa/i, url: "https://www.bridanareksasekuritas.co.id" },
  { match: /bni/i, url: "https://www.bnisekuritas.co.id" },
  { match: /sucor/i, url: "https://www.sucorsekuritas.com/id/research" },
  { match: /mnc/i, url: "https://www.mncsekuritas.id" },
  { match: /phintraco/i, url: "https://www.phintracosekuritas.com" },
  { match: /samuel/i, url: "https://www.samuel.co.id" },
  { match: /kb ?valbury|valbury/i, url: "https://www.kbvalbury.com/research" },
  { match: /rhb/i, url: "https://www.rhbtradesmart.co.id" },
  { match: /ciptadana/i, url: "https://www.ciptadana.com" },
  { match: /kiwoom/i, url: "https://kiwoom.co.id" },
  { match: /panin/i, url: "https://www.pans.co.id" },
  { match: /ajaib/i, url: "https://ajaib.co.id" },
];

/** URL situs sekuritas dari namanya (null kalau tak dikenal). */
export function securitiesSiteUrl(name: string): string | null {
  for (const s of SITES) if (s.match.test(name)) return s.url;
  return null;
}
