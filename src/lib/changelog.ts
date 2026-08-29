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
    version: '1.14.1',
    date: '29.08.2026',
    text:
      'Beim Hineinzoomen in die Karte werden die Punkte jetzt deutlich kleiner, und Boulder, die zu dicht beieinander liegen, rücken auseinander – so lässt sich jeder einzeln antippen, auch wenn sie fast an derselben Stelle hängen.\n' +
      'Und beim Setzen eines Boulders wird der Bereich zuverlässiger erkannt: bisher fiel ein Boulder direkt an der Wand oft aus dem Bereichsfilter heraus.',
  },
  {
    // 1.13.0 und 1.14.0 sind zusammen ausgeliefert worden (die Hallenkarte und ihre
    // Anbindung an die Challenges), darum hier bewusst EIN Eintrag statt zweier.
    version: '1.14.0',
    date: '29.08.2026',
    text:
      'Neu: die Hallenkarte. Über „Hallenkarte" auf der Startseite siehst du den Lageplan von Fingerfood mit allen Bouldern als farbige Punkte – die Zahl darauf ist der Grad.\n' +
      'Zoomen und Verschieben mit zwei Fingern. Tippst du einen Boulder an, kannst du ihn für dich als „Erledigt" oder „Projekt" markieren – das sieht nur dein Gerät.\n' +
      'Gefiltert wird nach Grad, Bereich, Farbe und deinen Marken, auch mehreres gleichzeitig.\n' +
      'Karte und Challenges hängen zusammen: Über „Auswählen" tippst du mehrere Boulder an und startest daraus eine neue Challenge oder legst sie in eine laufende. Beim Hinzufügen eines Boulders kannst du entsprechend wählen – selbst anlegen oder vom Lageplan holen, dann kommen Grad, Farbe und Foto mit.\n' +
      'Umgekehrt zeigt jeder übernommene Boulder in der Challenge eine kleine Karte; ein Tipp darauf springt zu seiner Stelle in der Halle. Das ganze Bild gibt es über „Auf der Karte zeigen" im Menü oben rechts.\n' +
      'Boulder auf der Karte setzen, ändern und abschrauben ist passwortgeschützt.\n' +
      'Außerdem lässt sich die App selbst nicht mehr versehentlich verzoomen – die Zwei-Finger-Geste gehört jetzt der Karte.',
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
