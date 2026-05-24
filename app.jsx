// Main app — carousel + checklist + archive + sheets glue.
// Persistence (localStorage + optional Firebase) is plumbed in via the
// onPersist callback supplied by index.html.

function App({ initialState, onPersist, syncLabel, user, onLogin, onLogout, fbReady }) {
  // ── State ──────────────────────────────────────────
  const [state, setState] = React.useState(initialState);
  const [activeId, setActiveId] = React.useState(() => {
    const live = initialState.videos.filter(v => !v.archived);
    return live.length ? live[0].id : null;
  });
  const [view, setView] = React.useState('live'); // 'live' | 'archive'
  const [whoStepId, setWhoStepId] = React.useState(null);
  const [videoMenuId, setVideoMenuId] = React.useState(null);

  // Persist on every change
  React.useEffect(() => {
    onPersist(state);
  }, [state, onPersist]);

  // Refs for carousel scroll-snap detection
  const scrollerRef = React.useRef(null);
  const cardRefs = React.useRef({});

  // Active video tracking via scroll position
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const sl = el.scrollLeft + el.clientWidth / 2;
        let best = null, bestDist = Infinity;
        for (const v of liveVideos) {
          const c = cardRefs.current[v.id];
          if (!c) continue;
          const center = c.offsetLeft + c.offsetWidth / 2;
          const d = Math.abs(center - sl);
          if (d < bestDist) { bestDist = d; best = v.id; }
        }
        if (best && best !== activeId) setActiveId(best);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  });

  // ── Derived ────────────────────────────────────────
  const liveVideos = state.videos.filter(v => !v.archived);
  const archivedVideos = state.videos.filter(v => v.archived);
  const active = state.videos.find(v => v.id === activeId) || liveVideos[0];

  // ── Mutations ──────────────────────────────────────
  const updateState = (patch) => setState(s => ({ ...s, ...patch }));
  const updateVideo = (vid, patch) => setState(s => ({ ...s, videos: s.videos.map(v => v.id === vid ? { ...v, ...patch } : v) }));
  const updateVideoFn = (vid, fn) => setState(s => ({ ...s, videos: s.videos.map(v => v.id === vid ? fn(v) : v) }));
  const updateStep = (sid, patch) => setState(s => ({ ...s, steps: s.steps.map(st => st.id === sid ? { ...st, ...patch } : st) }));

  const toggle = (sid) => {
    if (!active) return;
    updateVideoFn(active.id, v => ({ ...v, checked: { ...v.checked, [sid]: !v.checked[sid] } }));
  };
  const addVideo = () => {
    const id = Date.now();
    setState(s => ({ ...s, videos: [...s.videos, { id, name: `Видео ${s.videos.filter(v => !v.archived).length + 1}`, deadline: null, archived: false, checked: {}, createdAt: id }] }));
    setActiveId(id);
    setVideoMenuId(id); // pop menu so user can rename right away
  };

  const archiveVideo = (vid) => {
    updateVideo(vid, { archived: true });
    // Move active to next live
    setTimeout(() => {
      const live = state.videos.filter(v => v.id !== vid && !v.archived);
      if (live.length) setActiveId(live[0].id);
    }, 0);
  };
  const unarchiveVideo = (vid) => updateVideo(vid, { archived: false });
  const deleteVideo = (vid) => setState(s => ({ ...s, videos: s.videos.filter(v => v.id !== vid) }));

  const pickWho = (who) => {
    updateStep(whoStepId, { who });
    setWhoStepId(null);
  };
  const addNewPerformer = (name) => {
    const color = nextPerformerColor(state.whoPalette);
    setState(s => ({
      ...s,
      whoPalette: { ...s.whoPalette, [name]: color },
      steps: s.steps.map(st => st.id === whoStepId ? { ...st, who: name } : st),
    }));
    setWhoStepId(null);
  };

  // ── Render ─────────────────────────────────────────
  if (view === 'archive') {
    return (
      <div style={appStyles.root}>
        <ArchiveView
          videos={archivedVideos}
          steps={state.steps}
          palette={state.whoPalette}
          onUnarchive={(vid) => { unarchiveVideo(vid); }}
          onDelete={deleteVideo}
          onOpen={(vid) => { setActiveId(vid); setView('live'); }}
          onBack={() => setView('live')}
        />
        {videoMenuId && (
          <VideoMenuSheet
            video={state.videos.find(v => v.id === videoMenuId)}
            onClose={() => setVideoMenuId(null)}
            onRename={(name) => updateVideo(videoMenuId, { name })}
            onSetDeadline={(d) => updateVideo(videoMenuId, { deadline: d })}
            onArchive={() => archiveVideo(videoMenuId)}
            onUnarchive={() => unarchiveVideo(videoMenuId)}
            onDelete={() => deleteVideo(videoMenuId)}
            isAllDone={appProgress(state.videos.find(v => v.id === videoMenuId), state.steps).done === state.steps.length}
          />
        )}
      </div>
    );
  }

  const ap = active ? appProgress(active, state.steps) : { done: 0, total: state.steps.length, pct: 0 };
  const isAllDone = active && ap.done === ap.total && ap.total > 0;

  return (
    <div style={appStyles.root}>
      {/* ── Top header ── */}
      <div style={appStyles.top}>
        <div style={appStyles.topRow}>
          <div>
            <div style={appStyles.eyebrow}>МОЙ КАНАЛ</div>
            <div style={appStyles.headTitle}>Что снимаем</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {archivedVideos.length > 0 && (
              <button style={appStyles.iconBtn} onClick={() => setView('archive')} title="Архив">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M3 6h14v3H3V6zM4 9v7a1 1 0 001 1h10a1 1 0 001-1V9" stroke="#6b4423" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M8 12h4" stroke="#6b4423" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                <span style={appStyles.iconBadge}>{archivedVideos.length}</span>
              </button>
            )}
            <button style={appStyles.iconBtn} onClick={addVideo} title="Новое видео">
              <span style={{ fontSize: 22, lineHeight: 1, paddingBottom: 3 }}>＋</span>
            </button>
          </div>
        </div>
        <div style={appStyles.syncLine}>
          <SyncDot label={syncLabel} />
          {user && (
            <button style={appStyles.linkBtn} onClick={onLogout}>
              {user.displayName ? user.displayName.split(' ')[0] : 'вы'} · выйти
            </button>
          )}
        </div>
      </div>

      {/* Prominent sign-in banner — shown when not signed in. Easy to miss
          the tiny link on mobile, so we surface it once with context. */}
      {fbReady && !user && (
        <div style={appStyles.signInBanner}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6b4423', marginBottom: 2 }}>
              Войди чтобы видеть свои видео
            </div>
            <div style={{ fontSize: 11.5, color: '#8b7256', lineHeight: 1.35 }}>
              Данные на компьютере и телефоне синхронизируются через твой Google аккаунт
            </div>
          </div>
          <button style={appStyles.signInBtn} onClick={onLogin}>Войти</button>
        </div>
      )}

      {/* ── Carousel ── */}
      {liveVideos.length === 0 ? (
        <div style={appStyles.empty}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🎬</div>
          <div style={{ fontSize: 16, color: '#6b4423', fontWeight: 600 }}>Нет активных видео</div>
          <div style={{ fontSize: 13, color: '#9a8878', marginTop: 4 }}>Нажми ＋ чтобы начать новое</div>
        </div>
      ) : (
        <>
          <div ref={scrollerRef} style={appStyles.scroller}>
            <div style={{ width: 24, flexShrink: 0 }} />
            {liveVideos.map(v => (
              <VideoCard
                key={v.id}
                v={v}
                steps={state.steps}
                palette={state.whoPalette}
                isActive={v.id === activeId}
                cardRef={el => (cardRefs.current[v.id] = el)}
                onTap={() => {
                  if (v.id === activeId) {
                    setVideoMenuId(v.id);
                  } else {
                    cardRefs.current[v.id]?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }
                }}
                onMenu={() => setVideoMenuId(v.id)}
              />
            ))}
            <div style={{ width: 24, flexShrink: 0 }} />
          </div>

          {/* Pager dots */}
          <div style={appStyles.dots}>
            {liveVideos.map(v => (
              <div key={v.id} style={{ ...appStyles.dot, ...(v.id === activeId ? appStyles.dotActive : null) }} />
            ))}
          </div>
        </>
      )}

      {/* ── Checklist ── */}
      {active && (
        <div style={appStyles.checklist}>
          {isAllDone ? (
            <div style={appStyles.doneBlock}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#6b4423', marginBottom: 4 }}>Ролик выпущен!</div>
              <div style={{ fontSize: 13, color: '#9a8878', marginBottom: 16 }}>Можешь убрать в архив, чтобы не отсвечивал</div>
              <button style={appStyles.archiveBigBtn} onClick={() => archiveVideo(active.id)}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ marginRight: 6 }}>
                  <path d="M3 6h14v3H3V6zM4 9v7a1 1 0 001 1h10a1 1 0 001-1V9" stroke="#fffdf8" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M8 12h4" stroke="#fffdf8" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                Убрать в архив
              </button>
            </div>
          ) : (
            state.phases.map(phase => {
              const inPhase = state.steps.filter(s => s.phase === phase);
              if (inPhase.length === 0) return null;
              const pp = appPhaseProgress(active, state.steps, phase);
              return (
                <div key={phase} style={{ marginBottom: 16 }}>
                  <div style={appStyles.phaseHead}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#7a6048' }}>
                      {APP_PHASE_GLYPH[phase]?.(13, '#7a6048')}
                      {phase}
                    </span>
                    <span style={{ color: '#b0a090', fontWeight: 600 }}>{pp.done}/{pp.total}</span>
                  </div>
                  {inPhase.map(step => (
                    <TaskRow
                      key={step.id}
                      step={step}
                      isDone={!!active.checked[step.id]}
                      palette={state.whoPalette}
                      onToggle={() => toggle(step.id)}
                      onPickWho={() => setWhoStepId(step.id)}
                    />
                  ))}
                </div>
              );
            })
          )}
          <div style={{ height: 60 }} />
        </div>
      )}

      {/* ── Sheets ── */}
      {whoStepId && (
        <WhoPickerSheet
          step={state.steps.find(s => s.id === whoStepId)}
          palette={state.whoPalette}
          onPick={pickWho}
          onAddNew={addNewPerformer}
          onClose={() => setWhoStepId(null)}
        />
      )}
      {videoMenuId && state.videos.find(v => v.id === videoMenuId) && (
        <VideoMenuSheet
          video={state.videos.find(v => v.id === videoMenuId)}
          onClose={() => setVideoMenuId(null)}
          onRename={(name) => updateVideo(videoMenuId, { name })}
          onSetDeadline={(d) => updateVideo(videoMenuId, { deadline: d })}
          onArchive={() => archiveVideo(videoMenuId)}
          onUnarchive={() => unarchiveVideo(videoMenuId)}
          onDelete={() => deleteVideo(videoMenuId)}
          isAllDone={(() => {
            const v = state.videos.find(v => v.id === videoMenuId);
            return v ? appProgress(v, state.steps).done === state.steps.length : false;
          })()}
        />
      )}
    </div>
  );
}

// ── Video card (in carousel) ─────────────────────────
function VideoCard({ v, steps, palette, isActive, onTap, onMenu, cardRef }) {
  const p = appProgress(v, steps);
  const phase = appCurrentPhase(v, steps);
  const next = appNextTask(v, steps);
  const allDone = p.done === p.total;

  return (
    <div
      ref={cardRef}
      onClick={onTap}
      style={{ ...appStyles.card, ...(isActive ? appStyles.cardActive : null) }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={appStyles.cardPhase}>{allDone ? 'ГОТОВО' : phase.toUpperCase()}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {v.deadline && <div style={appStyles.cardDl}>{v.deadline}</div>}
          {isActive && (
            <button
              onClick={(e) => { e.stopPropagation(); onMenu(); }}
              style={appStyles.menuBtn}
              title="Меню"
            >
              <svg width="16" height="4" viewBox="0 0 16 4"><circle cx="2" cy="2" r="1.6" fill="#9a8878"/><circle cx="8" cy="2" r="1.6" fill="#9a8878"/><circle cx="14" cy="2" r="1.6" fill="#9a8878"/></svg>
            </button>
          )}
        </div>
      </div>
      <div style={appStyles.cardName}>{v.name}</div>
      <div style={appStyles.cardBottom}>
        <ProgressRing pct={p.pct} done={p.done} total={p.total} size={54} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {allDone ? (
            <div style={appStyles.cardNextDone}>Готово к архиву ✓</div>
          ) : (
            <>
              <div style={appStyles.cardNextLabel}>Дальше</div>
              <div style={appStyles.cardNextTask}>{next?.task}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Task row ─────────────────────────────────────────
function TaskRow({ step, isDone, palette, onToggle, onPickWho }) {
  const who = appWhoColor(palette, step.who);
  return (
    <div style={{ ...appStyles.taskRow, ...(isDone ? appStyles.taskRowDone : null) }}>
      <button onClick={onToggle} style={appStyles.checkBtn} aria-label="отметить">
        <div style={{ ...appStyles.checkbox, ...(isDone ? appStyles.checkboxDone : null) }}>
          {isDone && (
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5L5 9.5L13 1.5" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </div>
      </button>
      <div onClick={onToggle} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ ...appStyles.taskText, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#b0a090' : '#2a2420' }}>
          {step.task}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onPickWho(); }} style={{ ...appStyles.whoChip, background: who.bg, color: who.tx }}>
        {step.who}
      </button>
    </div>
  );
}

// ── Progress ring ────────────────────────────────────
function ProgressRing({ pct, done, total, size = 54 }) {
  const r = (size - 6) / 2;
  const C = 2 * Math.PI * r;
  const off = C * (1 - pct / 100);
  const allDone = done === total && total > 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#e8dccc" strokeWidth="3" fill="none" />
        <circle cx={size/2} cy={size/2} r={r}
          stroke={allDone ? '#3aa978' : '#c4956a'} strokeWidth="3" fill="none"
          strokeDasharray={C} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .35s' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
        color: allDone ? '#3aa978' : '#6b4423',
      }}>{allDone ? '✓' : `${done}/${total}`}</div>
    </div>
  );
}

// ── Sync indicator ───────────────────────────────────
function SyncDot({ label }) {
  const isOk = /сохранено/i.test(label || '') || /✓/.test(label || '');
  const isErr = /ошибка|⚠/i.test(label || '');
  const color = isErr ? '#d96655' : isOk ? '#3aa978' : '#c4a882';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9a8878', fontSize: 11.5, fontWeight: 500 }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: color }} />
      {label}
    </span>
  );
}

// ── Styles ───────────────────────────────────────────
const appStyles = {
  root: { background: '#f5f0e8', minHeight: '100%', fontFamily: 'inherit', color: '#2a2420', position: 'relative' },

  top: { padding: '8px 20px 6px' },
  topRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  eyebrow: { fontSize: 10.5, letterSpacing: 1.8, color: '#9a8878', fontWeight: 700 },
  headTitle: { fontSize: 26, fontWeight: 800, color: '#2a2420', letterSpacing: -0.5, marginTop: 4 },
  iconBtn: {
    position: 'relative', width: 40, height: 40, borderRadius: 20, border: '1px solid #d8c8b0',
    background: '#fffdf8', color: '#6b4423', cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px',
    borderRadius: 8, background: '#8b5e3c', color: '#fffdf8',
    fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1.5px solid #f5f0e8',
  },
  syncLine: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, minHeight: 18 },
  linkBtn: {
    background: 'transparent', border: 'none', color: '#8b5e3c',
    fontSize: 12, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer',
    padding: 0,
  },
  signInBanner: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '4px 20px 0', padding: '12px 14px',
    background: '#fff7e8', border: '1px solid #e8c890', borderRadius: 14,
  },
  signInBtn: {
    background: '#8b5e3c', color: '#fffdf8', border: 'none', borderRadius: 10,
    padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', flexShrink: 0,
  },

  empty: { textAlign: 'center', padding: '60px 20px' },

  scroller: {
    display: 'flex', gap: 14, overflowX: 'auto', overflowY: 'visible',
    scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
    paddingTop: 14, paddingBottom: 8,
    scrollbarWidth: 'none',
  },
  card: {
    flex: '0 0 280px', scrollSnapAlign: 'center', minWidth: 0,
    background: '#fffdf8', borderRadius: 20, padding: '14px 16px 16px',
    border: '1px solid #e9ddc8',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex', flexDirection: 'column', gap: 11,
    cursor: 'pointer', transition: 'transform .2s, box-shadow .2s, border-color .2s',
    minHeight: 160,
  },
  cardActive: { borderColor: '#c4956a', boxShadow: '0 6px 20px rgba(139,94,60,0.18), 0 0 0 1px #c4956a' },
  cardPhase: { fontSize: 10, letterSpacing: 1.5, color: '#a08868', fontWeight: 700 },
  cardDl: { fontSize: 11, color: '#9a8878', fontWeight: 500, padding: '2px 8px', background: '#f0e8d8', borderRadius: 8 },
  cardName: { fontSize: 19, fontWeight: 700, color: '#2a2420', lineHeight: 1.2, letterSpacing: -0.3 },
  cardBottom: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 },
  cardNextLabel: { fontSize: 10, letterSpacing: 1, color: '#a08868', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 },
  cardNextTask: { fontSize: 13, color: '#5a4838', fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  cardNextDone: { fontSize: 14, fontWeight: 700, color: '#3aa978' },
  menuBtn: {
    background: 'transparent', border: 'none', padding: 6, borderRadius: 6,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: -4,
  },

  dots: { display: 'flex', justifyContent: 'center', gap: 6, padding: '6px 0 12px' },
  dot: { width: 6, height: 6, borderRadius: 3, background: '#e0d3bf', transition: 'all .2s' },
  dotActive: { width: 18, background: '#c4956a' },

  checklist: { padding: '4px 20px 24px', borderTop: '1px solid #ece2d2' },
  phaseHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 11, letterSpacing: 1.5, fontWeight: 700,
    textTransform: 'uppercase', padding: '14px 4px 8px',
  },

  taskRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 12px', marginBottom: 8, borderRadius: 14,
    background: '#fffdf8', border: '1px solid #ece2d2',
    minHeight: 56,
  },
  taskRowDone: { background: '#f0e8da', borderColor: '#e0d3bf' },
  checkBtn: { background: 'transparent', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', margin: -2 },
  checkbox: { width: 26, height: 26, borderRadius: 8, border: '2px solid #c4a882', background: 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { background: '#8b5e3c', borderColor: '#8b5e3c' },
  taskText: { fontSize: 15, lineHeight: 1.35, fontWeight: 500 },
  whoChip: {
    fontSize: 10.5, fontWeight: 600, padding: '6px 9px', borderRadius: 12,
    flexShrink: 0, whiteSpace: 'nowrap', letterSpacing: 0.1,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    minHeight: 28,
  },

  doneBlock: {
    textAlign: 'center', padding: '32px 20px 28px',
    background: '#fff7e8', borderRadius: 18, border: '1px solid #e8c890',
    margin: '12px 0',
  },
  archiveBigBtn: {
    background: '#6b4423', color: '#fffdf8', border: 'none', borderRadius: 12,
    padding: '12px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
  },
};

window.App = App;
