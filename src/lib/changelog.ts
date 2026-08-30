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
    version: '1.20.1',
    date: '30.08.2026',
    text: 'Die Farbe eines Boulders steht wieder unter dem Grad – die neue Position daneben hat sich nicht bewährt.',
  },
  {
    version: '1.20.0',
    date: '30.08.2026',
    text:
      'Fehlversuche zählst du jetzt direkt am Knopf „Versuch“ hoch – der Stand steht im Knopf selbst, die extra Zeile darunter ist weg.\n' +
      'Zum Korrigieren erscheint links davon ein Minus, sobald der erste Versuch gezählt ist.\n' +
      'Kosten Fehlversuche in deiner Session keine Punkte, gibt es den Knopf gar nicht mehr – dann bleiben Flash und Top.\n' +
      'Die Farbe eines Boulders steht jetzt neben dem Grad statt darunter.\n' +
      'Der Leaderboard-Streifen zeigt nur noch, wer führt.',
  },
  {
    version: '1.19.0',
    date: '30.08.2026',
    text:
      'Die Rangliste zeigt jetzt eine durchgehende Liste von Platz 1 bis zum letzten – das Treppchen ist entfallen.\n' +
      'Die ersten drei Plätze tragen dafür eine kleine Medaille mit ihrer Platzziffer.\n' +
      'Deine eigene Platzierung bleibt beim Scrollen immer unten eingeblendet, auch wenn du vorne stehst.\n' +
      'Auf der Hallenkarte gibt es das Feld „Kennzeichnung“ nicht mehr.',
  },
  {
    version: '1.18.0',
    date: '30.08.2026',
    text:
      'Boulder, die du vom Lageplan in eine Challenge übernommen hast, markiert die Hallenkarte jetzt automatisch als „erledigt“, sobald du sie flashst oder toppst.\n' +
      'Das gilt auch rückwirkend: Beim nächsten Öffnen einer Challenge werden deine bisherigen Erfolge nachgetragen.\n' +
      'Entfernst du eine Marke danach von Hand auf der Karte, bleibt sie weg – sie wird nicht erneut gesetzt.',
  },
  {
    version: '1.17.0',
    date: '30.08.2026',
    text:
      'Die Mini-Karte neben einem Boulder zeigt den Punkt jetzt in der Farbe des Boulders – damit findest du ihn in der Halle schneller wieder.\n' +
      'Springst du aus einem Spieler-Vergleich zu einem Boulder, bringt dich der Zurück-Button wieder in genau diesen Vergleich statt in die Ranglisten-Liste.\n' +
      'Der Streifen oben in der Challenge heißt jetzt „Leaderboard“.',
  },
  {
    version: '1.16.0',
    date: '30.08.2026',
    text:
      'Oben in der Challenge steht jetzt nur noch dein eigener Stand: dein Platz, deine Punkte und wer gerade führt. Die Boulder-Liste beginnt dadurch deutlich weiter oben.\n' +
      'Ein Tipp darauf öffnet die komplette Rangliste – mit Treppchen für die ersten drei und deinem Platz fest am unteren Rand, damit er beim Scrollen nicht verschwindet.\n' +
      'Bei Punktgleichstand teilen sich beide jetzt denselben Platz (1, 2, 2, 4 …), so wie schon in der Rangliste eines einzelnen Boulders.',
  },
  {
    version: '1.15.0',
    date: '29.08.2026',
    text:
      'Der Filter auf der Hallenkarte ist jetzt von Anfang an sichtbar und deutlich kompakter – alle Möglichkeiten stehen auf einen Blick da, ohne Scrollen. Über den Pfeil oben rechts blendest du ihn weg.\n' +
      'Bei den Marken wählst du nur noch eines: Alle, Offen, Erledigt oder Projekte.\n' +
      'Der Bereichsfilter ist vorerst entfallen – die Karte zeigt ohnehin, wo etwas hängt.',
  },
  {
    version: '1.14.2',
    date: '29.08.2026',
    text: 'Die Hallenkarte lässt sich jetzt über ihren Rand hinausschieben – auch ein Boulder ganz außen am Plan lässt sich damit in die Bildmitte holen, statt am Rand hängenzubleiben.',
  },
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
    text: 'Boulder umsortieren: Der Host kann in den Session-Einstellungen über „Boulder-Reihenfolge ändern" die Boulder per Ziehen am Griff neu anordnen. Erst „Speichern" übernimmt die neue Nummerierung für alle.',
  },
  {
    version: '1.11.0',
    date: '14.07.2026',
    text:
      'Sessions können beim Erstellen (und nachträglich in den Einstellungen) öffentlich gemacht werden – sie erscheinen dann auf der Startseite als laufende Session und jeder kann direkt beitreten.\n' +
      'Neuer Changelog: „Was ist neu?" auf der Startseite zeigt die Änderungen der letzten Versionen.',
  },
]
