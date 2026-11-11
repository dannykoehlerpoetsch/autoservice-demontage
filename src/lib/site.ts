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
 * einliniert. Vollständig mit `https://` angegeben oder als nackte Domain – beides wird
 * verarbeitet; kaputte Angaben fallen auf die Produktionsadresse zurück statt den Build zu
 * verhindern. GitHub-Actions-Variable und Vercel-Config-Variable sollten denselben Wert tragen –
 * oder gar keinen, dann greift der Wert unten.
 */
export const PRODUKTIONS_URL = 'https://autoservice-demontage.vercel.app';

/**
 * Die Basis-URL, so wie sie aus der Umgebung zu holen ist – fehlerfrei.
 *
 * Drei Dinge korrigiert diese Funktion, weil sie in der Praxis alle schon vorkamen:
 *
 * 1. Die Variable kann fehlen oder leer sein – dann gilt die Produktionsadresse.
 * 2. Die Variable kann ohne Schema dastehen (`autoservice-demontage.vercel.app` – so trägt sie
 *    die GitHub-Actions-Variable). `new URL()` wirft darüber mit `ERR_INVALID_URL`, und ein
 *    Build, der nur eine Adresse zusammenbaut, darf nicht an ihr scheitern: `https://` wird
 *    ergänzt.
 * 3. Die Variable kann Pfade oder einen Schrägstrich am Ende tragen. Für `og:url` und Canonical
 *    ist nur die Herkunft (Schema, Rechner, Port) brauchbar – alles andere würde die
 *    Canonical-Links mit einem doppelten Pfadteil bauen lassen.
 *
 * Ungültiges führt zurück auf die Produktionsadresse, nie auf `localhost` oder eine alte Adresse.
 */
function basisUrl(): string {
  const gesetzt = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!gesetzt) {
    return new URL(PRODUKTIONS_URL).origin;
  }

  const mitSchema = /^[a-z][a-z\d+.-]*:\/\//i.test(gesetzt) ? gesetzt : `https://${gesetzt}`;

  try {
    return new URL(mitSchema).origin;
  } catch {
    return new URL(PRODUKTIONS_URL).origin;
  }
}

export const SITE_URL = basisUrl();

// Ziel des Demo-Hinweises: die Portfoliowebsite. Feste externe Adresse, keine Umgebungsvariable.
export const PORTFOLIO_URL = 'https://dakopo.vercel.app/';
