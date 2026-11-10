/**
 * Öffentliche Basis-URL der Seite – Grundlage für `metadataBase` und damit für `og:url`.
 *
 * Die Seite ist bewusst nicht indexiert (`noindex`, `robots.txt`); die Basis-URL ist trotzdem
 * gesetzt, damit die Metadaten vollständig bleiben.
 *
 * Bezogen wird sie aus `NEXT_PUBLIC_SITE_URL` (GitHub-Actions-Variable und Vercel-Config-Variable
 * – beides *Variablen*, keine Secrets, weil der Wert zur Buildzeit in den öffentlichen Build
 * einfliesst). Zielwert für beide ist `https://autoservice-demontage.vercel.app`. Diese Adresse
 * ist ein Ziel, kein aktueller Zustand: Solange das Vercel-Projekt nicht umbenannt ist, zeigt die
 * Variable auf die bisherige Adresse, und ohne Variable läuft die App mit dem Fallback unten.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Ziel des Demo-Hinweises: die Portfoliowebsite. Feste externe Adresse, keine Umgebungsvariable.
export const PORTFOLIO_URL = 'https://dakopo.vercel.app/';
