// Sheet/modal components for the app:
//  - WhoPickerSheet:  pick (or create) the performer for a specific task
//  - VideoMenuSheet:  rename / set deadline / archive / unarchive / delete a video
//  - ArchiveView:     list of archived videos with restore action
//  - ConfirmDialog:   simple yes/no confirmation

// ── Shared sheet shell ────────────────────────────────
function Sheet({ children, onClose, topInset = 80 }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(40,30,20,0.36)', zIndex: 200,
        animation: 'sheetFadeIn .15s ease-out',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: topInset,
        background: '#f5f0e8', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
        animation: 'sheetSlideUp .22s cubic-bezier(.2,.7,.3,1)',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d0c0a8', margin: '8px auto 4px', flexShrink: 0 }} />
        {children}
      </div>
    </>
  );
}

// ── Who picker ────────────────────────────────────────
function WhoPickerSheet({ step, palette, onPick, onAddNew, onClose }) {
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState('');
  const names = Object.keys(palette);

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    if (palette[n]) { onPick(n); return; }
    onAddNew(n);
  };

  return (
    <Sheet onClose={onClose} topInset={120}>
      <div style={sheetStyles.head}>
        <div style={sheetStyles.eyebrow}>КТО ДЕЛАЕТ</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={sheetStyles.title}>{step.task}</div>
          <button style={sheetStyles.x} onClick={onClose} aria-label="закрыть">✕</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {names.map(n => {
            const c = palette[n];
            const isCurrent = step.who === n;
            return (
              <button
                key={n}
                onClick={() => onPick(n)}
                style={{
                  ...sheetStyles.whoRow,
                  borderColor: isCurrent ? '#8b5e3c' : '#ece2d2',
                  background: isCurrent ? '#fff7e8' : '#fffdf8',
                }}
              >
                <div style={{ width: 14, height: 14, borderRadius: 7, background: c.dot, flexShrink: 0 }} />
                <div style={{ flex: 1, textAlign: 'left', fontSize: 15.5, fontWeight: 600, color: '#2a2420' }}>{n}</div>
                {isCurrent && (
                  <svg width="18" height="14" viewBox="0 0 14 11" fill="none"><path d="M1 5.5L5 9.5L13 1.5" stroke="#8b5e3c" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Add new */}
        <div style={{ marginTop: 18 }}>
          {adding ? (
            <div style={sheetStyles.addBox}>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setAdding(false); setName(''); } }}
                placeholder="Например: Монтажёр Саша"
                style={sheetStyles.input}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button style={{ ...sheetStyles.btn, ...sheetStyles.btnGhost }} onClick={() => { setAdding(false); setName(''); }}>Отмена</button>
                <button style={{ ...sheetStyles.btn, ...sheetStyles.btnPrimary }} onClick={submit}>Добавить</button>
              </div>
            </div>
          ) : (
            <button style={sheetStyles.addBtn} onClick={() => setAdding(true)}>＋ Добавить исполнителя</button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ── Video options menu (rename / deadline / archive / delete) ──
function VideoMenuSheet({ video, onClose, onRename, onSetDeadline, onArchive, onUnarchive, onDelete, isAllDone }) {
  const [mode, setMode] = React.useState(null); // null | 'rename' | 'deadline'
  const [val, setVal] = React.useState(video.name);
  const [dl, setDl] = React.useState(video.deadline || '');

  const inner = () => {
    if (mode === 'rename') return (
      <div style={sheetStyles.addBox}>
        <div style={sheetStyles.eyebrowSmall}>НАЗВАНИЕ ВИДЕО</div>
        <input autoFocus value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { onRename(val.trim() || video.name); onClose(); } }}
          style={sheetStyles.input}/>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button style={{ ...sheetStyles.btn, ...sheetStyles.btnGhost }} onClick={() => setMode(null)}>Назад</button>
          <button style={{ ...sheetStyles.btn, ...sheetStyles.btnPrimary }} onClick={() => { onRename(val.trim() || video.name); onClose(); }}>Сохранить</button>
        </div>
      </div>
    );
    if (mode === 'deadline') return (
      <div style={sheetStyles.addBox}>
        <div style={sheetStyles.eyebrowSmall}>СРОК ПУБЛИКАЦИИ</div>
        <input autoFocus value={dl} onChange={e => setDl(e.target.value)}
          placeholder="например: 28 мая"
          onKeyDown={e => { if (e.key === 'Enter') { onSetDeadline(dl.trim() || null); onClose(); } }}
          style={sheetStyles.input}/>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button style={{ ...sheetStyles.btn, ...sheetStyles.btnGhost }} onClick={() => setMode(null)}>Назад</button>
          {video.deadline && (
            <button style={{ ...sheetStyles.btn, ...sheetStyles.btnGhost }} onClick={() => { onSetDeadline(null); onClose(); }}>Убрать</button>
          )}
          <button style={{ ...sheetStyles.btn, ...sheetStyles.btnPrimary }} onClick={() => { onSetDeadline(dl.trim() || null); onClose(); }}>Сохранить</button>
        </div>
      </div>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <MenuItem icon="✎" label="Переименовать"            onClick={() => setMode('rename')} />
        <MenuItem icon="🗓"  label={video.deadline ? `Срок: ${video.deadline}` : 'Указать срок'} onClick={() => setMode('deadline')} />
        {video.archived ? (
          <MenuItem icon="↩" label="Вернуть из архива" onClick={() => { onUnarchive(); onClose(); }} />
        ) : (
          <MenuItem icon="🗄" label={isAllDone ? 'Убрать в архив' : 'Убрать в архив (даже если не готово)'} onClick={() => { onArchive(); onClose(); }} />
        )}
        <div style={{ height: 1, background: '#e5ddd0', margin: '4px 0' }} />
        <MenuItem icon="🗑" label="Удалить видео" danger onClick={() => {
          if (confirm(`Удалить «${video.name}»? Это нельзя отменить.`)) { onDelete(); onClose(); }
        }} />
      </div>
    );
  };

  return (
    <Sheet onClose={onClose} topInset={Math.max(200, 480 - 280)}>
      <div style={sheetStyles.head}>
        <div style={sheetStyles.eyebrow}>{video.archived ? 'АРХИВ' : 'ВИДЕО'}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={sheetStyles.title}>{video.name}</div>
          <button style={sheetStyles.x} onClick={onClose}>✕</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 32px' }}>
        {inner()}
      </div>
    </Sheet>
  );
}

function MenuItem({ icon, label, danger, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 14px', background: '#fffdf8',
      border: '1px solid #ece2d2', borderRadius: 12,
      color: danger ? '#b8326b' : '#2a2420',
      fontFamily: 'inherit', fontSize: 15.5, fontWeight: 500,
      cursor: 'pointer', textAlign: 'left',
    }}>
      <span style={{ width: 22, fontSize: 18, display: 'flex', justifyContent: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

// ── Archive view (lives inside the same scroll area, replaces carousel) ──
function ArchiveView({ videos, steps, palette, onUnarchive, onDelete, onOpen, onBack }) {
  return (
    <div style={archStyles.root}>
      <div style={archStyles.head}>
        <button onClick={onBack} style={archStyles.backBtn}>
          <svg width="9" height="14" viewBox="0 0 9 14" fill="none"><path d="M7 1L1 7l6 6" stroke="#8b5e3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          К видео
        </button>
        <div style={archStyles.eyebrow}>АРХИВ</div>
        <div style={archStyles.title}>Выпущенные <span style={{ color: '#a08868', fontWeight: 500 }}>{videos.length}</span></div>
      </div>

      <div style={{ padding: '6px 16px 40px' }}>
        {videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9a8878' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🗄</div>
            <div style={{ fontSize: 15 }}>Архив пуст</div>
            <div style={{ fontSize: 13, marginTop: 6, color: '#b0a090' }}>Когда отметишь все задачи у видео — появится кнопка «Убрать в архив»</div>
          </div>
        ) : videos.map(v => {
          const p = appProgress(v, steps);
          return (
            <div key={v.id} style={archStyles.card}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#2a2420', letterSpacing: -0.2 }}>{v.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3aa978', background: '#d6f1e0', padding: '2px 7px', borderRadius: 6, letterSpacing: 0.4 }}>ВЫПУЩЕНО</span>
                  <span style={{ fontSize: 12, color: '#9a8878' }}>{p.done}/{p.total}</span>
                </div>
              </div>
              <button onClick={() => onUnarchive(v.id)} style={archStyles.restoreBtn}>Вернуть</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────
const sheetStyles = {
  head: { padding: '4px 20px 14px', flexShrink: 0 },
  eyebrow: { fontSize: 10.5, letterSpacing: 1.8, color: '#9a8878', fontWeight: 700, marginBottom: 4 },
  eyebrowSmall: { fontSize: 10, letterSpacing: 1.5, color: '#9a8878', fontWeight: 700, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 700, color: '#2a2420', letterSpacing: -0.3, lineHeight: 1.2, flex: 1, minWidth: 0 },
  x: {
    width: 32, height: 32, borderRadius: 16, border: 'none', background: '#ece2d2',
    color: '#7a6048', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', flexShrink: 0,
  },
  whoRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 14px', borderRadius: 14,
    border: '1.5px solid #ece2d2',
    background: '#fffdf8', cursor: 'pointer', fontFamily: 'inherit',
    minHeight: 56,
  },
  addBtn: {
    width: '100%', padding: '14px', borderRadius: 14, background: 'transparent',
    border: '1.5px dashed #c4a882', color: '#8b5e3c', fontFamily: 'inherit',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  addBox: {
    padding: 14, borderRadius: 14, background: '#fffdf8', border: '1px solid #ece2d2',
  },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid #d0c0a8', background: '#fff',
    fontSize: 16, fontFamily: 'inherit', color: '#2a2420',
    outline: 'none',
  },
  btn: { flex: 1, padding: '12px', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },
  btnPrimary: { background: '#8b5e3c', color: '#fffdf8' },
  btnGhost: { background: '#ece2d2', color: '#5a4838' },
};

const archStyles = {
  root: { background: '#f5f0e8', minHeight: '100%' },
  head: { padding: '8px 20px 14px' },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'transparent', border: 'none', color: '#8b5e3c',
    fontSize: 14, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer',
    padding: '4px 0', marginBottom: 4,
  },
  eyebrow: { fontSize: 10.5, letterSpacing: 1.8, color: '#9a8878', fontWeight: 700, marginTop: 6 },
  title: { fontSize: 28, fontWeight: 800, color: '#2a2420', letterSpacing: -0.5, marginTop: 4 },
  card: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 10,
    borderRadius: 16, background: '#fffdf8', border: '1px solid #ece2d2',
  },
  restoreBtn: {
    background: '#f0e8d8', border: 'none', borderRadius: 10, padding: '8px 14px',
    fontSize: 13, fontWeight: 600, color: '#6b4423', cursor: 'pointer', fontFamily: 'inherit',
    flexShrink: 0,
  },
};

Object.assign(window, { Sheet, WhoPickerSheet, VideoMenuSheet, ArchiveView });
