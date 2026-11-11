/**
 * Öffentliche Basis-URL der Seite – Grundlage für `metadataBase` und damit für `og:url`,
 * `og:image` und die Twitter-Bilder.
 *
 * Die Seite ist bewusst nicht indexiert (`noindex`, `robots.txt`); die Basis-URL ist trotzdem
 * gesetzt, damit Metadaten, Canonical-Links und `og:url` eine eindeutige Adresse haben.
 *
 * Die Produktionsadresse ist ein fester Wert, keine Umgebungsvorgabe: sie ist bekannt, und
 * eine fehlende Variable darf nicht länger dazu führen, dass eine öffentliche Seite
 * `localhost` oder – wie nach der ersten Umbenennung – die alte Vercel-Adresse als `og:url`
 * ausliefert.
 * `NEXT_PUBLIC_SITE_URL` überschreibt den Wert für Preview-Deployments und lokale Builds und ist
 * eine *Variable*, kein Secret: `NEXT_PUBLIC_*` wird zur Buildzeit in den öffentlichen Build
 * einliniert. GitHub-Actions-Variable und Vercel-Config-Variable müssen denselben Wert tragen –
 * oder gar keinen, dann greift der Wert unten.
 */
export const PRODUKTIONS_URL = 'https://autoservice-demontage.vercel.app';

function basisUrl(): string {
  const gesetzt = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  // Ohne diesen Schrägstrich-Filter enden `og:url` und Canonical sonst mit `//`.
  return (gesetzt || PRODUKTIONS_URL).replace(/\/+$/, '');
}

export const SITE_URL = basisUrl();

// Ziel des Demo-Hinweises: die Portfoliowebsite. Feste externe Adresse, keine Umgebungsvariable.
export const PORTFOLIO_URL = 'https://dakopo.vercel.app/';
