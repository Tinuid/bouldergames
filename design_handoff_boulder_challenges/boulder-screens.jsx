/* boulder-screens.jsx — presentational screens for the Boulder Challenges prototype.
   Theme-agnostic: all visuals come from CSS variables / classes defined per theme
   in the host HTML. Components read data + callbacks via props. */

const { useState, useRef, useEffect } = React;

/* ───────────────────────── icons (line, currentColor) ───────────────────────── */
const I = {
  bolt: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" stroke="none"/></svg>),
  check: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="m4 12 5 6L20 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  x: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>),
  chevL: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  chevR: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>),
  minus: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>),
  edit: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="M14.5 5.5 18.5 9.5M4 20l4-1L19 8a2 2 0 0 0 0-2.8L18.8 5A2 2 0 0 0 16 5L5 16l-1 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  share: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="M12 15V4m0 0L8 8m4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>),
  up: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="m6 14 6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  down: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="m6 10 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  users: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-2.2-4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  cam: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8"/></svg>),
  pic: (p) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" {...p}><rect x="3.5" y="5" width="17" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.8"/><circle cx="8.5" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.6"/><path d="m5 17 4.5-4 3 2.5L16 11l3 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
};

/* hold colours — the gym's preset palette (13, incl. two two-tone holds) */
const HOLD_LIST = [
  { id: 'blau',         label: 'Blau',          bg: '#2F6BEB' },
  { id: 'gruenblau',    label: 'Grün-Blau',     bg: 'linear-gradient(135deg,#27B24A 0 50%,#2F6BEB 50% 100%)' },
  { id: 'gelb',         label: 'Gelb',          bg: '#E6B017' },
  { id: 'schwarz',      label: 'Schwarz',       bg: '#1B2130' },
  { id: 'rot',          label: 'Rot',           bg: '#E5484D' },
  { id: 'weiss',        label: 'Weiß',          bg: '#F4F2EC' },
  { id: 'mint',         label: 'Mint',          bg: '#57E0A1' },
  { id: 'lila',         label: 'Lila',          bg: '#A855F7' },
  { id: 'orange',       label: 'Orange',        bg: '#F97316' },
  { id: 'grau',         label: 'Grau',          bg: '#9AA1AC' },
  { id: 'hellblau',     label: 'Hellblau',      bg: '#84CDF5' },
  { id: 'orangeschwarz',label: 'Orange-Schwarz',bg: 'linear-gradient(135deg,#F97316 0 50%,#1B2130 50% 100%)' },
  { id: 'gruen',        label: 'Grün',          bg: '#27B24A' },
];
const HOLD = Object.fromEntries(HOLD_LIST.map(c => [c.id, c.bg]));
const HOLD_LABEL = Object.fromEntries(HOLD_LIST.map(c => [c.id, c.label]));

/* ───────────────────────── small shared bits ───────────────────────── */
function Segmented({ value, onChange, options }) {
  return (
    <div className="bc-seg" role="tablist">
      {options.map(o => (
        <button key={o.value} type="button" role="tab"
          className={'bc-seg-opt' + (value === o.value ? ' is-active' : '')}
          onClick={() => onChange(o.value)}>
          <span className="bc-seg-top">{o.label}</span>
          {o.sub && <span className="bc-seg-sub">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, onChange, min = 0, max = 99 }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="bc-stepper">
      <button type="button" className="bc-step-btn" onClick={() => set(value - 1)} aria-label="weniger"><I.down/></button>
      <span className="bc-step-val">{value}</span>
      <button type="button" className="bc-step-btn" onClick={() => set(value + 1)} aria-label="mehr"><I.up/></button>
    </div>
  );
}

/* ───────────────────────── HOME ───────────────────────── */
function BCHome({ data, onCreate, onJoin, onOpen, onDismissRecent }) {
  return (
    <div className="bc-scroll bc-home">
      <header className="bc-hero">
        <h1 className="bc-wordmark">Boulder<br/><span className="bc-accent-word">Challenges</span></h1>
        <p className="bc-tagline">Tracke Flashes, Tops &amp; Versuche mit deiner Crew — in Echtzeit.</p>
      </header>

      <div className="bc-cta-stack">
        <button className="bc-btn is-primary" onClick={onCreate}>
          <span className="bc-btn-ic"><I.plus/></span>Neue Challenge erstellen
        </button>
        <button className="bc-btn is-secondary" onClick={onJoin}>
          <span className="bc-btn-ic"><I.users/></span>Challenge beitreten
        </button>
      </div>

      {data.recent && (
        <section className="bc-block">
          <div className="bc-section-label">Zuletzt gespielt</div>
          <button className="bc-recent" onClick={() => onOpen(data.recent.id)}>
            <div className="bc-recent-main">
              <div className="bc-recent-name">{data.recent.name}</div>
              <div className="bc-recent-meta">Code {data.recent.code} · als {data.recent.alias}</div>
            </div>
            <span className="bc-recent-dismiss" onClick={(e) => { e.stopPropagation(); onDismissRecent(); }} aria-label="entfernen"><I.x/></span>
          </button>
        </section>
      )}

      <section className="bc-block">
        <div className="bc-section-label">Alle Challenges</div>
        <div className="bc-list">
          {data.challenges.map(c => (
            <button key={c.id} className="bc-list-row" onClick={() => onOpen(c.id)}>
              <div className="bc-lr-main">
                <div className="bc-lr-name">{c.name}</div>
                <div className="bc-lr-meta">Code {c.code} · {c.date}</div>
              </div>
              <div className="bc-lr-right">
                <span className="bc-lr-count">{c.players.length} {c.players.length === 1 ? 'Spieler' : 'Spieler'}</span>
                <span className="bc-lr-chev"><I.chevR/></span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────── CREATE ───────────────────────── */
function BCCreate({ onBack, onSubmit }) {
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [mode, setMode] = useState('classic');
  const [flash, setFlash] = useState(30);
  const [top, setTop] = useState(25);
  const [miss, setMiss] = useState(5);
  const [neg, setNeg] = useState('topNeverNegative');

  const negOpts = [
    { value: 'topNeverNegative', label: 'Top nie negativ', sub: 'Empfohlen' },
    { value: 'strict', label: 'Strikt', sub: 'Kann negativ' },
    { value: 'missesOnly', label: 'Nur Fehlversuche', sub: 'Kann negativ' },
  ];

  return (
    <div className="bc-scroll bc-create">
      <div className="bc-topbar">
        <button className="bc-back" onClick={onBack}><I.chevL/>Zurück</button>
      </div>
      <h1 className="bc-screen-title">Neue Challenge</h1>

      <div className="bc-field">
        <label className="bc-label">Name der Challenge</label>
        <input className="bc-input" placeholder="z.B. Alle Vierer abklettern" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="bc-field">
        <label className="bc-label">Dein Name</label>
        <input className="bc-input" placeholder="z.B. Alex" value={alias} onChange={e => setAlias(e.target.value)} />
      </div>

      <div className="bc-panel">
        <div className="bc-panel-title">Spielmodus</div>
        <Segmented value={mode} onChange={setMode} options={[
          { value: 'classic', label: 'Klassisch', sub: 'Feste Punkte' },
          { value: 'multiplier', label: 'Multiplikator', sub: 'Grad × Punkte' },
        ]} />
        <p className="bc-hint">
          {mode === 'classic'
            ? 'Feste Punkte pro Boulder; der Schwierigkeitsgrad dient nur zur Info.'
            : 'Punkte werden mit dem Schwierigkeitsgrad multipliziert — harte Boulder zählen mehr.'}
        </p>
      </div>

      <div className="bc-panel">
        <div className="bc-panel-title">Punkteregeln</div>
        <div className="bc-rule-row"><span className="bc-rule-ic is-flash"><I.bolt/></span><span className="bc-rule-name">Punkte für Flash</span><Stepper value={flash} onChange={setFlash}/></div>
        <div className="bc-rule-row"><span className="bc-rule-ic is-top"><I.check/></span><span className="bc-rule-name">Punkte für Top</span><Stepper value={top} onChange={setTop}/></div>
        <div className="bc-rule-row"><span className="bc-rule-ic is-miss"><I.x/></span><span className="bc-rule-name">Kosten pro Fehlversuch</span><Stepper value={miss} onChange={setMiss}/></div>
      </div>

      <div className="bc-panel">
        <div className="bc-panel-title">Minuspunkte</div>
        <div className="bc-chips">
          {negOpts.map(o => (
            <button key={o.value} type="button" className={'bc-chip' + (neg === o.value ? ' is-active' : '')} onClick={() => setNeg(o.value)}>
              <span className="bc-chip-top">{o.label}</span>
              <span className="bc-chip-sub">{o.sub}</span>
            </button>
          ))}
        </div>
        <p className="bc-hint">Nur Fehlversuche kosten, und ein Top gibt nie Minuspunkte. „Nicht geschafft" bleibt negativ.</p>
      </div>

      <div className="bc-footer-cta">
        <button className="bc-btn is-primary" disabled={!name.trim() || !alias.trim()}
          onClick={() => onSubmit({ name: name.trim() || 'Neue Challenge', alias: alias.trim() || 'Du', mode, flash, top, miss, neg })}>
          Challenge erstellen
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── JOIN ───────────────────────── */
function BCJoin({ onBack, onJoin }) {
  const [code, setCode] = useState('');
  const [alias, setAlias] = useState('');
  const valid = code.trim().length >= 4 && alias.trim().length >= 1;
  return (
    <div className="bc-scroll bc-join">
      <div className="bc-topbar"><button className="bc-back" onClick={onBack}><I.chevL/>Zurück</button></div>
      <h1 className="bc-screen-title">Challenge beitreten</h1>
      <p className="bc-join-lead">Gib den 6-stelligen Code ein, den du von deiner Crew bekommen hast.</p>

      <div className="bc-field">
        <label className="bc-label">Challenge-Code</label>
        <input className="bc-input bc-code-input" placeholder="z.B. 5ZUKMJ" maxLength={6}
          value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
      </div>
      <div className="bc-field">
        <label className="bc-label">Dein Name</label>
        <input className="bc-input" placeholder="z.B. Alex" value={alias} onChange={e => setAlias(e.target.value)} />
      </div>

      <div className="bc-footer-cta">
        <button className="bc-btn is-primary" disabled={!valid} onClick={() => onJoin({ code, alias })}>Beitreten</button>
      </div>
    </div>
  );
}

window.BCScreens = { BCHome, BCCreate, BCJoin, I, HOLD, HOLD_LABEL, HOLD_LIST, Segmented, Stepper };
