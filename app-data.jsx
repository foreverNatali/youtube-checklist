// Default data + helpers
const DEFAULT_STEPS = [
  { id: 1,  phase: 'Подготовка',   task: 'Придумать сценарий',                                  who: 'Gemini + Claude' },
  { id: 2,  phase: 'Производство', task: 'Снять видео',                                         who: 'Ты' },
  { id: 3,  phase: 'Производство', task: 'Смонтировать видео',                                  who: 'Ты' },
  { id: 12, phase: 'Производство', task: 'Нарезать шортс',                                      who: 'Ты' },
  { id: 13, phase: 'Производство', task: 'Озвучить на английском (дубляж)',                     who: 'Ты' },
  { id: 4,  phase: 'Публикация',   task: 'Загрузить ролик на YouTube',                          who: 'Ты' },
  { id: 5,  phase: 'Публикация',   task: 'Выгрузить субтитры через YouTube',                    who: 'Ты' },
  { id: 6,  phase: 'Публикация',   task: 'Перевести субтитры и описание на английский',         who: 'Gemini' },
  { id: 7,  phase: 'Публикация',   task: 'Описание на русском и английском + заголовки',        who: 'Gemini' },
  { id: 8,  phase: 'Оформление',   task: 'Сделать обложку для YouTube',                         who: 'ChatGPT' },
  { id: 14, phase: 'Оформление',   task: 'Сделать обложку на английском языке',                who: 'ChatGPT' },
  { id: 9,  phase: 'Продвижение',  task: 'Написать пост в Сообщество YouTube',                  who: 'Gemini / ChatGPT' },
  { id: 10, phase: 'Продвижение',  task: 'Выложить пост в Telegram со ссылкой',                 who: 'ChatGPT' },
  { id: 11, phase: 'Продвижение',  task: 'Сделать обложку для Telegram',                        who: 'ChatGPT' },
];

const DEFAULT_PHASES = ['Подготовка', 'Производство', 'Публикация', 'Оформление', 'Продвижение'];

const DEFAULT_WHO_PALETTE = {
  'Ты':               { bg: '#fce7f0', tx: '#b8326b', dot: '#e8579a' },
  'Gemini':           { bg: '#dde9ff', tx: '#2a5fc8', dot: '#5b8ef0' },
  'ChatGPT':          { bg: '#d6f1e0', tx: '#1f7050', dot: '#3aa978' },
  'Gemini + Claude':  { bg: '#efeaff', tx: '#6d4ed9', dot: '#8b6cf2' },
  'Gemini / ChatGPT': { bg: '#fbf0c3', tx: '#9b6914', dot: '#d4a93a' },
};

const PERFORMER_COLOR_POOL = [
  { bg: '#e0e9ff', tx: '#3b4d99', dot: '#6b85d6' },
  { bg: '#ffe2e7', tx: '#a83454', dot: '#e36a85' },
  { bg: '#dff2d9', tx: '#3d7530', dot: '#7ab560' },
  { bg: '#fff0d6', tx: '#a06420', dot: '#d99540' },
  { bg: '#e6e1f5', tx: '#5c4a99', dot: '#8b78c4' },
  { bg: '#dcefef', tx: '#266866', dot: '#4ea4a0' },
  { bg: '#f3e0ef', tx: '#8c3877', dot: '#c168a9' },
];

function nextPerformerColor(palette) {
  const used = new Set(Object.values(palette).map(p => p.dot));
  for (const c of PERFORMER_COLOR_POOL) if (!used.has(c.dot)) return c;
  return PERFORMER_COLOR_POOL[Object.keys(palette).length % PERFORMER_COLOR_POOL.length];
}

const APP_PHASE_GLYPH = {
  'Подготовка':   (size=14, c='currentColor') => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M2 11l8.5-8.5 1.5 1.5L3.5 12.5 1.5 13l.5-2z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  'Производство': (size=14, c='currentColor') => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3.5" width="9" height="7" rx="1" stroke={c} strokeWidth="1.4"/><path d="M10.5 6.5l2.5-1.5v4l-2.5-1.5" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  'Публикация':   (size=14, c='currentColor') => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M7 1.5v8M4 4.5l3-3 3 3M2.5 11.5h9" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'Оформление':   (size=14, c='currentColor') => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={c} strokeWidth="1.4"/><circle cx="4.8" cy="5.5" r="0.9" fill={c}/><circle cx="9.2" cy="5.5" r="0.9" fill={c}/><circle cx="9.5" cy="9" r="0.9" fill={c}/></svg>,
  'Продвижение':  (size=14, c='currentColor') => <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M2 5v4l5 2.5V2.5L2 5z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/><path d="M9 4v6" stroke={c} strokeWidth="1.4" strokeLinecap="round"/><path d="M11 6c.7.3 1 .8 1 1s-.3.7-1 1" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

function appProgress(video, steps) {
  let done = 0;
  for (const s of steps) if (video.checked[s.id]) done++;
  return { done, total: steps.length, pct: steps.length ? Math.round(done / steps.length * 100) : 0 };
}
function appPhaseProgress(video, steps, phase) {
  const inPhase = steps.filter(s => s.phase === phase);
  const done = inPhase.filter(s => video.checked[s.id]).length;
  return { done, total: inPhase.length };
}
function appNextTask(video, steps) {
  for (const s of steps) if (!video.checked[s.id]) return s;
  return null;
}
function appCurrentPhase(video, steps) {
  const n = appNextTask(video, steps);
  return n ? n.phase : 'Готово';
}
function appWhoColor(palette, who) {
  return palette[who] || { bg: '#eceae0', tx: '#5a5236', dot: '#9a8868' };
}

function appInitialState() {
  return {
    steps: DEFAULT_STEPS.map(s => ({ ...s })),
    whoPalette: { ...DEFAULT_WHO_PALETTE },
    phases: [...DEFAULT_PHASES],
    videos: [{ id: 1, name: 'Видео 1', deadline: null, archived: false, checked: {}, createdAt: Date.now() }],
  };
}

function appMigrate(raw) {
  if (Array.isArray(raw)) {
    return {
      ...appInitialState(),
      videos: raw.map(v => ({
        id: v.id, name: v.name || 'Видео', deadline: v.deadline || null,
        archived: !!v.archived, checked: v.checked || {}, createdAt: v.createdAt || v.id,
      })),
    };
  }
  if (raw && typeof raw === 'object') {
    const base = appInitialState();
    return {
      steps: Array.isArray(raw.steps) && raw.steps.length ? raw.steps : base.steps,
      whoPalette: raw.whoPalette && Object.keys(raw.whoPalette).length ? { ...base.whoPalette, ...raw.whoPalette } : base.whoPalette,
      phases: Array.isArray(raw.phases) && raw.phases.length ? raw.phases : base.phases,
      videos: Array.isArray(raw.videos) && raw.videos.length
        ? raw.videos.map(v => ({ archived: false, ...v }))
        : base.videos,
    };
  }
  return appInitialState();
}

Object.assign(window, {
  DEFAULT_STEPS, DEFAULT_PHASES, DEFAULT_WHO_PALETTE, APP_PHASE_GLYPH,
  nextPerformerColor,
  appProgress, appPhaseProgress, appNextTask, appCurrentPhase, appWhoColor,
  appInitialState, appMigrate,
});
