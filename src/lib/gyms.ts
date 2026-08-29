// Die Halle, deren Lageplan die App zeigt.
//
// Aufgelöst wird über den slug, nicht über die uuid: die id wird beim Ausführen der
// Migration zufällig vergeben und ist pro Umgebung (Prod, eigenes Testprojekt)
// verschieden – eine hart im Code stehende uuid wäre also sofort falsch.
//
// Mehr als eine Halle ist im Schema bereits vorgesehen (Tabelle gyms), im UI aber
// nicht: es gibt genau diesen einen Grundriss im Bundle. Eine zweite Halle bräuchte
// zusätzlich einen zweiten Plan in src/lib/areas.ts und eine Auswahl im UI.
export const DEFAULT_GYM_SLUG = 'halle'
