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
    version: '1.14.0',
    date: '29.08.2026',
    text:
      'Karte und Challenges wachsen zusammen: Auf der Hallenkarte kannst du jetzt über „Auswählen" mehrere Boulder antippen und daraus direkt eine neue Challenge starten oder sie zu einer laufenden hinzufügen.\n' +
      'Umgekehrt zeigt dir eine Challenge über „Auf der Karte zeigen" (Menü oben rechts), wo ihre Boulder in der Halle hängen.\n' +
      'Beim Hinzufügen eines Boulders kannst du wählen: selbst anlegen oder vom Lageplan holen – Grad, Farbe und Foto kommen dann mit.\n' +
      'Jeder übernommene Boulder zeigt in der Challenge eine kleine Karte – ein Tipp darauf springt zur Stelle in der Halle.\n' +
      'Außerdem lässt sich die App selbst nicht mehr versehentlich verzoomen – die Zwei-Finger-Geste gehört jetzt der Karte.',
  },
  {
    version: '1.13.0',
    date: '29.08.2026',
    text:
      'Neu: die Hallenkarte. Über „Hallenkarte" auf der Startseite siehst du den Lageplan der Halle mit allen Bouldern als farbige Punkte – die Zahl darauf ist der Grad.\n' +
      'Zoomen und Verschieben mit zwei Fingern, Boulder antippen und für dich als „Erledigt" oder „Projekt" markieren. Diese Marken sieht nur dein Gerät.\n' +
      'Gefiltert wird nach Grad, Bereich, Farbe und deinen Marken – auch mehreres gleichzeitig.\n' +
      'Boulder auf der Karte setzen, ändern und abschrauben ist passwortgeschützt.',
  },
  {
    version: '1.12.0',
    date: '14.07.2026',
    text:
      'Boulder umsortieren: Der Host kann in den Session-Einstellungen über „Boulder-Reihenfolge ändern" die Boulder per Ziehen am Griff neu anordnen. Erst „Speichern" übernimmt die neue Nummerierung für alle.',
  },
  {
    version: '1.11.0',
    date: '14.07.2026',
    text:
      'Sessions können beim Erstellen (und nachträglich in den Einstellungen) öffentlich gemacht werden – sie erscheinen dann auf der Startseite als laufende Session und jeder kann direkt beitreten.\n' +
      'Neuer Changelog: „Was ist neu?" auf der Startseite zeigt die Änderungen der letzten Versionen.',
  },
]
