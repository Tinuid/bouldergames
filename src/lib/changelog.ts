// Manuell gepflegter Changelog – unabhängig von den Git-Commits. Einzige Quelle
// der Wahrheit für den "Was ist neu?"-Dialog auf der Startseite (ChangelogDialog).
// Konvention: Bei jedem Version-Bump in package.json gehört ein neuer Eintrag
// OBEN in diese Liste (kurzer deutscher Nutzertext; Zeilenumbrüche via \n werden
// in der Anzeige beibehalten). Siehe CLAUDE.md, Abschnitt "Versionierung".

export interface ChangelogEntry {
  version: string
  // Anzeigedatum im Format TT.MM.JJJJ
  date: string
  text: string
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.11.0',
    date: '14.07.2026',
    text:
      'Sessions können beim Erstellen (und nachträglich in den Einstellungen) öffentlich gemacht werden – sie erscheinen dann auf der Startseite als laufende Session und jeder kann direkt beitreten.\n' +
      'Neuer Changelog: „Was ist neu?" auf der Startseite zeigt die Änderungen der letzten Versionen.',
  },
]
