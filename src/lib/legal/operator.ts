/**
 * Betreiberangaben – die eine Stelle, in die die persönlichen Daten für Impressum und
 * Datenschutzerklärung eingetragen werden.
 *
 * Inhaber der Website ist die natürliche Person, die dieses Repository veröffentlicht – nicht
 * die frei erfundene Kfz-Werkstatt, deren Name auf der Seite steht. In einem Feld steht nur, was
 * für die betroffene Person zutrifft; was fehlt, erscheint an der betroffenen Stelle als
 * eindeutiger Platzhalter.
 *
 * `telefon` und `ustIdNr` sind freiwillig beziehungsweise nur bei tatsächlicher Voraussetzung
 * erforderlich: sie werden nur gerendert, wenn ein Wert eingetragen ist. Weitere Angaben
 * (Register, Vertretungsberechtigung, Aufsichtsbehörde, § 18 Abs. 2 MStV) sind hier nicht
 * vorgesehen – sie setzen eine echte Voraussetzung voraus, die für dieses Projekt nicht
 * eintritt.
 */

export type BetreiberFeld = 'name' | 'strasse' | 'ort' | 'email' | 'telefon' | 'ustIdNr';

export const BETREIBER: Record<BetreiberFeld, string> = {
  /** Vor- und Nachname. */
  name: 'Danny Köhler-Poetsch',
  /** Straße und Hausnummer. */
  strasse: 'Erich-Zeigner-Allee 89',
  /** Postleitzahl und Ort. */
  ort: '04229 Leipzig',
  /** Erreichbare E-Mail-Adresse. */
  email: 'dakopo-coding@gmx.net',
  /** Optional – erscheint nur mit Wert auf der Seite. */
  telefon: '',
  /** Optional – nur mit Wert, wenn eine USt-IdNr. vergeben ist. */
  ustIdNr: '',
};

/** Wert eines Feldes, oder `null`, wenn das Feld leer geblieben ist. */
export function betreiberAngabe(feld: BetreiberFeld): string | null {
  const wert = BETREIBER[feld]?.trim();
  return wert ? wert : null;
}
