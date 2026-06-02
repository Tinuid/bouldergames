/* boulder-app.jsx — stateful container: data model, scoring, the Challenge
   screen, navigation, and mounting two themed phones onto the design canvas. */

const { BCHome, BCCreate, BCJoin, I, HOLD, HOLD_LABEL, HOLD_LIST, Stepper } = window.BCScreens;
const { useState: uState, useEffect: uEffect, useRef: uRef } = React;

/* ───────────────────────── scoring ───────────────────────── */
/* result cell shape: { status: 'flash'|'top'|'nicht'|null, misses: int } */
function cellOf(ch, pid, bid) { return (ch.results[pid] || {})[bid] || { status: null, misses: 0 }; }

function boulderPoints(ch, pid, b) {
  const r = ch.rules, cell = cellOf(ch, pid, b.id);
  const f = r.mode === 'multiplier' ? (b.grade || 1) : 1;
  const m = cell.misses || 0;
  let pts = 0;
  if (cell.status === 'flash') pts = f * r.flash;
  else if (cell.status === 'top') pts = f * r.top - m * r.miss;
  else if (cell.status === 'nicht') pts = -m * r.miss;
  if (r.neg === 'topNeverNegative' && (cell.status === 'top' || cell.status === 'flash')) pts = Math.max(0, pts);
  if (r.neg === 'missesOnly' && cell.status === 'nicht') pts = -m * r.miss;
  return pts;
}

function computePlayer(ch, pid) {
  let score = 0, tops = 0, flashes = 0;
  ch.boulders.forEach(b => {
    const cell = cellOf(ch, pid, b.id);
    score += boulderPoints(ch, pid, b);
    if (cell.status === 'flash') { tops++; flashes++; }
    else if (cell.status === 'top') { tops++; }
  });
  return { score, tops, flashes };
}

function leaderboard(ch) {
  return ch.players
    .map(p => ({ ...p, ...computePlayer(ch, p.id) }))
    .sort((a, b) => b.score - a.score || b.tops - a.tops || b.flashes - a.flashes);
}

function rulesItems(r) {
  const items = [];
  if (r.mode === 'multiplier') items.push({ k: 'mode', el: <span className="bc-rule-mult">×Grad</span> });
  items.push({ k: 'flash', el: <span><span className="bc-r-ic is-flash"><I.bolt/></span>{r.flash} Flash</span> });
  items.push({ k: 'top', el: <span><span className="bc-r-ic is-top"><I.check/></span>{r.top} Top</span> });
  items.push({ k: 'miss', el: <span>−{r.miss}/Fehlsuch</span> });
  const negLabel = { topNeverNegative: 'Top nie negativ', strict: 'Strikt', missesOnly: 'Nur Fehlversuche' }[r.neg];
  items.push({ k: 'neg', el: <span className="bc-rule-neg">{negLabel}</span> });
  return items;
}

/* ───────────────────────── add / edit boulder sheet ───────────────────────── */
function AddBoulderSheet({ open, onClose, onSave, onDelete, initial }) {
  const editing = !!initial;
  const [grade, setGrade] = uState(null);   // 1..7 or null (optional)
  const [color, setColor] = uState('blau');
  uEffect(() => { if (open) { setGrade(initial ? initial.grade : null); setColor(initial ? initial.color : 'blau'); } }, [open, initial]);
  if (!open) return null;
  return (
    <div className="bc-sheet-scrim" onClick={onClose}>
      <div className="bc-sheet" onClick={e => e.stopPropagation()}>
        <div className="bc-sheet-grip" />
        <div className="bc-sheet-title">{editing ? 'Boulder bearbeiten' : 'Boulder hinzufügen'}</div>

        <div className="bc-sheet-sub">Schwierigkeit / Wertung <span className="bc-opt">(optional)</span></div>
        <div className="bc-grade-row">
          {[1,2,3,4,5,6,7].map(n => (
            <button key={n} type="button"
              className={'bc-grade-btn' + (grade === n ? ' is-active' : '')}
              onClick={() => setGrade(grade === n ? null : n)}>{n}</button>
          ))}
        </div>

        <div className="bc-sheet-sub">Farbe</div>
        <div className="bc-color-grid">
          {HOLD_LIST.map(c => (
            <button key={c.id} type="button"
              className={'bc-color-dot' + (color === c.id ? ' is-active' : '')}
              style={{ '--hold': c.bg }} onClick={() => setColor(c.id)} aria-label={c.label} title={c.label}>
              <span className="bc-color-fill" />
            </button>
          ))}
        </div>

        <div className="bc-sheet-sub">Foto <span className="bc-opt">(optional)</span></div>
        <div className="bc-photo-row">
          <button type="button" className="bc-photo-btn"><span className="bc-photo-ic"><I.cam/></span>Foto aufnehmen</button>
          <button type="button" className="bc-photo-btn"><span className="bc-photo-ic"><I.pic/></span>Aus Galerie</button>
        </div>

        <div className="bc-sheet-actions">
          <button className="bc-btn is-ghost" onClick={onClose}>Abbrechen</button>
          <button className="bc-btn is-primary" onClick={() => onSave({ grade, color })}>{editing ? 'Speichern' : 'Hinzufügen'}</button>
        </div>
        {editing && <button className="bc-sheet-delete" onClick={onDelete}>Boulder löschen</button>}
      </div>
    </div>
  );
}

/* ───────────────────────── CHALLENGE ───────────────────────── */
function BCChallenge({ ch, youId, onBack, onDelete, onResult, onMiss, onAddBoulder, onEditBoulder, onDeleteBoulder, bumpId }) {
  const board = leaderboard(ch);
  const [sheet, setSheet] = uState(false);     // false | 'add' | boulderId (edit)
  const [copied, setCopied] = uState(false);
  const medals = ['1', '2', '3'];
  const editingBoulder = typeof sheet === 'string' ? ch.boulders.find(b => b.id === sheet) : null;

  return (
    <div className="bc-scroll bc-challenge">
      <div className="bc-topbar">
        <button className="bc-back" onClick={onBack}><I.chevL/>Übersicht</button>
        <button className="bc-danger" onClick={onDelete}>Löschen</button>
      </div>
      <h1 className="bc-screen-title">{ch.name}</h1>

      <div className="bc-codebar">
        <button className="bc-code" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
          {copied ? 'Kopiert ✓' : ch.code}
        </button>
        <button className="bc-share"><I.share/>Teilen</button>
      </div>

      <div className="bc-rules">
        {rulesItems(ch.rules).map((it, i) => (
          <React.Fragment key={it.k}>
            {i > 0 && <span className="bc-rule-dot">·</span>}
            {it.el}
          </React.Fragment>
        ))}
      </div>

      <section className="bc-board">
        <div className="bc-board-head">Leaderboard</div>
        <div className="bc-board-rows">
          {board.map((p, i) => (
            <div key={p.id} className={'bc-board-row' + (p.id === youId ? ' is-you' : '') + (bumpId === p.id ? ' is-bump' : '')}>
              <span className={'bc-rank rank-' + (i + 1)}>{i < 3 ? medals[i] : i + 1}</span>
              <div className="bc-p">
                <div className="bc-pname">{p.name}{p.id === youId && <span className="bc-you-tag">du</span>}</div>
                <div className="bc-pmeta">{p.tops} Tops · {p.flashes} Flashes</div>
              </div>
              <span className="bc-score">{p.score}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bc-boulders-sec">
        <div className="bc-boulders-head">
          <span>Boulder ({ch.boulders.length})</span>
          <button className="bc-addboulder-mini" onClick={() => setSheet('add')}><I.plus/>Hinzufügen</button>
        </div>
        <div className="bc-boulders">
          {ch.boulders.map((b, i) => {
            const cell = cellOf(ch, youId, b.id);
            const st = cell.status;
            const tops = ch.players.filter(pl => ['top', 'flash'].includes(cellOf(ch, pl.id, b.id).status)).length;
            const pts = boulderPoints(ch, youId, b);
            const showMiss = st === 'top' || st === 'nicht';
            return (
              <div key={b.id} className="bc-boulder">
                <div className="bc-boulder-top">
                  <span className="bc-bnum">{i + 1}</span>
                  <div className="bc-binfo">
                    <div className="bc-bgrade">{b.grade ? 'Grad ' + b.grade : 'Boulder'}</div>
                    <div className="bc-bcolor"><span className="bc-bcolor-dot" style={{ '--hold': HOLD[b.color] }} />{HOLD_LABEL[b.color]}</div>
                  </div>
                  <div className="bc-bright">
                    {tops > 0 && <span className="bc-btops">{tops} Tops</span>}
                    <button className="bc-bedit" onClick={() => setSheet(b.id)} aria-label="Boulder bearbeiten"><I.edit/></button>
                  </div>
                </div>
                <div className="bc-bactions">
                  <button className={'bc-baction is-flash' + (st === 'flash' ? ' is-active' : '')} onClick={() => onResult(b.id, st === 'flash' ? null : 'flash')}><I.bolt/>Flash</button>
                  <button className={'bc-baction is-top' + (st === 'top' ? ' is-active' : '')} onClick={() => onResult(b.id, st === 'top' ? null : 'top')}><I.check/>Top</button>
                  <button className={'bc-baction is-nicht' + (st === 'nicht' ? ' is-active' : '')} onClick={() => onResult(b.id, st === 'nicht' ? null : 'nicht')}><I.x/>Nicht</button>
                </div>
                {showMiss && (
                  <div className="bc-bmiss">
                    <span className="bc-bmiss-label">Fehlversuche</span>
                    <div className="bc-stepper-mini">
                      <button className="bc-step-mini" onClick={() => onMiss(b.id, -1)} disabled={cell.misses <= 0} aria-label="weniger"><I.minus/></button>
                      <span className="bc-step-mini-val">{cell.misses}</span>
                      <button className="bc-step-mini" onClick={() => onMiss(b.id, 1)} aria-label="mehr"><I.plus/></button>
                    </div>
                  </div>
                )}
                {st && (
                  <div className="bc-bpts">Punkte: <span className={pts < 0 ? 'is-neg' : 'is-pos'}>{pts}</span></div>
                )}
              </div>
            );
          })}
          <button className="bc-addboulder" onClick={() => setSheet('add')}><I.plus/>Boulder hinzufügen</button>
        </div>
      </section>

      <AddBoulderSheet
        open={!!sheet}
        initial={editingBoulder}
        onClose={() => setSheet(false)}
        onSave={(b) => { if (editingBoulder) onEditBoulder(editingBoulder.id, b); else onAddBoulder(b); setSheet(false); }}
        onDelete={() => { if (editingBoulder) onDeleteBoulder(editingBoulder.id); setSheet(false); }}
      />
    </div>
  );
}

/* ───────────────────────── seed data ───────────────────────── */
function seedState() {
  const youId = 'jo';
  return {
    youId,
    recent: { id: 'av', name: 'Alle Vierer', code: 'GKW8GT', alias: 'Lucas' },
    challenges: [
      {
        id: 'nw', name: 'Neue Wand', code: '5ZUKMJ', date: '02.06.2026',
        rules: { mode: 'multiplier', flash: 6, top: 5, miss: 1, neg: 'topNeverNegative' },
        players: [ { id: 'lucas', name: 'Lucas' }, { id: 'jo', name: 'Jo' } ],
        boulders: [ { id: 'b1', grade: 4, color: 'rot' } ],
        results: { lucas: { b1: { status: 'flash', misses: 0 } }, jo: {} },
      },
    ],
  };
}

let CODES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randCode() { let s = ''; for (let i = 0; i < 6; i++) s += CODES[Math.floor(Math.random() * CODES.length)]; return s; }
function today() { const d = new Date(2026, 5, 2); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; }

/* ───────────────────────── Phone (stateful router) ───────────────────────── */
function Phone({ variant }) {
  const [state, setState] = uState(seedState);
  const [screen, setScreen] = uState('home');        // home | create | join | challenge
  const [activeId, setActiveId] = uState(null);
  const [bumpId, setBumpId] = uState(null);
  const scrollRef = uRef(null);

  const youId = state.youId;
  const active = state.challenges.find(c => c.id === activeId);

  const go = (s) => { setScreen(s); if (scrollRef.current) scrollRef.current.scrollTop = 0; };

  const open = (id) => {
    let ch = state.challenges.find(c => c.id === id);
    if (!ch && state.recent && state.recent.id === id) {
      // promote recent into a real challenge
      ch = {
        id, name: state.recent.name, code: state.recent.code, date: today(),
        rules: { mode: 'classic', flash: 30, top: 25, miss: 5, neg: 'topNeverNegative' },
        players: [ { id: 'lucas', name: 'Lucas' }, { id: youId, name: 'Jo' } ],
        boulders: [ { id: 'g1', grade: 4, color: 'gruen' }, { id: 'g2', grade: 5, color: 'blau' } ],
        results: { lucas: { g1: { status: 'top', misses: 1 }, g2: { status: 'flash', misses: 0 } }, [youId]: { g1: { status: 'flash', misses: 0 } } },
      };
      setState(s => ({ ...s, challenges: [ch, ...s.challenges] }));
    }
    setActiveId(id); go('challenge');
  };

  const createChallenge = ({ name, alias, mode, flash, top, miss, neg }) => {
    const id = 'c' + Date.now();
    const ch = {
      id, name, code: randCode(), date: today(),
      rules: { mode, flash, top, miss, neg },
      players: [ { id: youId, name: alias } ],
      boulders: [], results: { [youId]: {} },
    };
    setState(s => ({ ...s, challenges: [ch, ...s.challenges] }));
    setActiveId(id); go('challenge');
  };

  const joinChallenge = ({ code, alias }) => {
    const id = 'j' + Date.now();
    const ch = {
      id, name: 'Session ' + code, code, date: today(),
      rules: { mode: 'multiplier', flash: 6, top: 5, miss: 1, neg: 'topNeverNegative' },
      players: [ { id: 'host', name: 'Host' }, { id: youId, name: alias } ],
      boulders: [ { id: 'jb1', grade: 5, color: 'gelb' }, { id: 'jb2', grade: 6, color: 'schwarz' } ],
      results: { host: { jb1: { status: 'flash', misses: 0 }, jb2: { status: 'top', misses: 2 } }, [youId]: {} },
    };
    setState(s => ({ ...s, challenges: [ch, ...s.challenges] }));
    setActiveId(id); go('challenge');
  };

  const setResult = (boulderId, status) => {
    setState(s => {
      const challenges = s.challenges.map(c => {
        if (c.id !== activeId) return c;
        const cur = (c.results[youId] || {})[boulderId] || { status: null, misses: 0 };
        const cell = status === null
          ? { status: null, misses: cur.misses || 0 }
          : { status, misses: status === 'flash' ? 0 : (cur.misses || 0) };
        const res = { ...c.results, [youId]: { ...(c.results[youId] || {}), [boulderId]: cell } };
        return { ...c, results: res };
      });
      return { ...s, challenges };
    });
    setBumpId(youId); setTimeout(() => setBumpId(null), 650);
  };

  const setMiss = (boulderId, delta) => {
    setState(s => {
      const challenges = s.challenges.map(c => {
        if (c.id !== activeId) return c;
        const cur = (c.results[youId] || {})[boulderId] || { status: null, misses: 0 };
        const cell = { ...cur, misses: Math.max(0, (cur.misses || 0) + delta) };
        const res = { ...c.results, [youId]: { ...(c.results[youId] || {}), [boulderId]: cell } };
        return { ...c, results: res };
      });
      return { ...s, challenges };
    });
    setBumpId(youId); setTimeout(() => setBumpId(null), 650);
  };

  const addBoulder = ({ grade, color }) => {
    setState(s => {
      const challenges = s.challenges.map(c => {
        if (c.id !== activeId) return c;
        const bid = 'b' + Date.now();
        return { ...c, boulders: [...c.boulders, { id: bid, grade, color }] };
      });
      return { ...s, challenges };
    });
  };

  const editBoulder = (boulderId, { grade, color }) => {
    setState(s => {
      const challenges = s.challenges.map(c => {
        if (c.id !== activeId) return c;
        return { ...c, boulders: c.boulders.map(b => b.id === boulderId ? { ...b, grade, color } : b) };
      });
      return { ...s, challenges };
    });
  };

  const deleteBoulder = (boulderId) => {
    setState(s => {
      const challenges = s.challenges.map(c => {
        if (c.id !== activeId) return c;
        const results = {};
        Object.keys(c.results).forEach(pid => {
          results[pid] = { ...c.results[pid] }; delete results[pid][boulderId];
        });
        return { ...c, boulders: c.boulders.filter(b => b.id !== boulderId), results };
      });
      return { ...s, challenges };
    });
  };

  const deleteChallenge = () => {
    setState(s => ({ ...s, challenges: s.challenges.filter(c => c.id !== activeId) }));
    setActiveId(null); go('home');
  };

  const dismissRecent = () => setState(s => ({ ...s, recent: null }));

  return (
    <IOSDevice dark={variant === 'volt'} width={384} height={832}>
      <div className={'bc theme-' + variant} ref={scrollRef} style={{ height: '100%', overflowY: 'auto' }}>
        {screen === 'home' && <BCHome data={state} onCreate={() => go('create')} onJoin={() => go('join')} onOpen={open} onDismissRecent={dismissRecent} />}
        {screen === 'create' && <BCCreate onBack={() => go('home')} onSubmit={createChallenge} />}
        {screen === 'join' && <BCJoin onBack={() => go('home')} onJoin={joinChallenge} />}
        {screen === 'challenge' && active && <BCChallenge ch={active} youId={youId} bumpId={bumpId} onBack={() => go('home')} onDelete={deleteChallenge} onResult={setResult} onMiss={setMiss} onAddBoulder={addBoulder} onEditBoulder={editBoulder} onDeleteBoulder={deleteBoulder} />}
      </div>
    </IOSDevice>
  );
}

window.BoulderPhone = Phone;
