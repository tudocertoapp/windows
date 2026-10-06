import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { askAccountAssistant } from '../services/accountAssistant';
import { useDockMascot } from '../contexts/DockMascotContext';
import { useFinance } from '../contexts/FinanceContext';
import { detectDockNav, emitDockControl } from '../utils/dockNav';
import { claimsDockSaved, detectDockWrite, executeDockWrite, isDockWritePhrase, pendingWriteSummary } from '../utils/dockWrite';
import {
  abortsPendingWrite,
  confirmsPendingWrite,
  isDataCancel,
  isDataConfirm,
  isLearnPhrase,
  loadDockMemory,
  memoryForPrompt,
  rememberDockFact,
} from '../utils/dockMemory';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../contexts/MenuContext';
import { DOCK_INTRO, speakDock, stopDockSpeak, warmDockVoices } from '../utils/dockSpeak';
import { getDockDailyRead } from '../utils/quotes';
import { collapseRepeats, mergeHeard, nowInSaoPaulo, relocateName } from '../utils/dockSpeechText';
import {
  isWebSpeechAvailable,
  micPermissionState,
  registerWebSpeech,
  unregisterWebSpeech,
  startWebSpeech,
  takeWebSpeech,
  unlockWebMic,
} from '../utils/webSpeech';
import { isMicQuiet } from '../utils/dockAudioPulse';

const SILENCE_MS = 700;
const FINAL_SILENCE_MS = 280;
const MAX_HOLD_MS = 2200;
const MIN_CONFIDENCE = 0.42;
const FILLER = /^(a|e|o|u|ah|eh|uh|hm+|hum+|ahn|aham|ne|ta|tipo|entao|pois|sim|nao|ok|ei|ui|ih|oh|ha|he|hi|mm+|uhum|ia|ehh|hmm+)$/;
const HISTORY_KEY = '@tudocerto_dock_voice_history';
const PENDING_KEY = '@tudocerto_dock_pending';
const ACTIONS_KEY = '@tudocerto_dock_actions';

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DOCK_NAME = 'dock|dok|doque|doke|dogue|doc|dog|duck|doug|doki|docque';
const WAKE_OPEN = 'abre|abra|abrir|chama|chame|acorda|acordar|liga|ligar|ativa|ativar';

function hasWake(text) {
  const t = fold(text);
  if (!t) return false;
  if (new RegExp(`\\b(${DOCK_NAME})\\b`).test(t)) return true;
  if (new RegExp(`\\b(${WAKE_OPEN})\\s+(o\\s+)?(toque|tok|toc)\\b`).test(t)) return true;
  return false;
}

function isNoiseTranscript(text, confidence, allowConfirm) {
  const t = fold(text);
  if (!t) return true;
  if (allowConfirm && (isDataConfirm(t) || isDataCancel(t))) return false;
  if (hasWake(t)) return false;
  if (confidence > 0 && confidence < MIN_CONFIDENCE) return true;
  const words = t.split(' ').filter(Boolean);
  if (!words.length) return true;
  if (words.length === 1 && (FILLER.test(words[0]) || words[0].length < 3)) return true;
  if (words.length <= 2 && words.every((w) => w.length <= 2)) return true;
  if (words.every((w) => FILLER.test(w))) return true;
  const compact = t.replace(/\s/g, '');
  if (compact.length < 4) return true;
  if (/^(.)\1{3,}$/.test(compact)) return true;
  if (words.length >= 2 && words.filter((w) => w.length <= 2).length / words.length > 0.7) return true;
  return false;
}

function stripWake(text) {
  return String(text || '')
    .replace(/^(e+\s*a[ií]+|ae+|eae|eai|oi+|ol[aá]+|fala|hey|ei+|bora come[cç]ar|opa)[\s,]*/i, '')
    .replace(new RegExp(`^(${WAKE_OPEN})\\s+(o\\s+)?(?=${DOCK_NAME}|toque|tok|toc)\\b`, 'i'), '')
    .replace(new RegExp(`^(${DOCK_NAME}|toque|tok|toc)[\\s,]*`, 'i'), '')
    .trim();
}

function overlapRatio(a, b) {
  const wa = fold(a).split(' ').filter((w) => w.length > 1);
  const wb = new Set(fold(b).split(' ').filter((w) => w.length > 1));
  if (!wa.length || !wb.size) return 0;
  let hit = 0;
  wa.forEach((w) => {
    if (wb.has(w)) hit += 1;
  });
  return hit / wa.length;
}

function isDockOwnLine(text) {
  const t = fold(text);
  if (!t) return true;
  return /^(pode falar|pronto ja esta na tela|pronto|fechei|rolando a pagina|indo para o topo|ok me chame de novo|ok nao alterei nada|combinado pode me chamar de dock)$/.test(t);
}

function localClockReply(msg) {
  const daily = getDockDailyRead(msg);
  if (daily) return daily;
  const t = fold(msg);
  const { date, time } = nowInSaoPaulo();
  if (/\b(que horas|hora agora|horario agora|que horas sao)\b/.test(t)) return `Agora são ${time}.`;
  if (/\b(que dia|data de hoje|qual a data|qual o dia)\b/.test(t)) return `Hoje é ${date}.`;
  if (/\b(data e hora|hora e data)\b/.test(t)) return `Hoje é ${date}. São ${time}.`;
  return null;
}

const SLEEP_RE = /\b(tchau|ate logo|parar|pode parar|para de (ouvir|escutar)|desliga|encerrar)\b/;

export function DockVoiceWake() {
  const { tone, firstName, setVoiceStatus } = useDockMascot();
  const { user } = useAuth();
  const finance = useFinance();
  const { dockControl } = useMenu();
  const financeRef = useRef(finance);
  financeRef.current = finance;
  const dockControlRef = useRef(dockControl);
  dockControlRef.current = dockControl;
  const pushDockUi = (target, mode, extra = {}) => {
    emitDockControl(target, mode, extra);
    try { dockControlRef.current?.(target, mode, extra); } catch (_) {}
  };
  const modeRef = useRef('wake');
  const busyRef = useRef(false);
  const speakingRef = useRef(false);
  const armedRef = useRef(false);
  const armingRef = useRef(false);
  const bufferRef = useRef('');
  const silenceTimerRef = useRef(0);
  const vadTimerRef = useRef(0);
  const lastVoiceAtRef = useRef(0);
  const lastNewSpeechAtRef = useRef(0);
  const historyRef = useRef([]);
  const lastSpokenRef = useRef('');
  const ignoreUntilRef = useRef(0);
  const lastNavRef = useRef({ key: '', at: 0 });
  const lastCmdRef = useRef({ key: '', at: 0 });
  const lastTalkRef = useRef({ key: '', at: 0 });
  const nameUsedRef = useRef(false);
  const pendingActionRef = useRef(null);
  const memoryRef = useRef([]);
  const userIdRef = useRef('guest');
  userIdRef.current = user?.id || 'guest';

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) historyRef.current = parsed.slice(-24);
        } catch (_) {}
      })
      .catch(() => {});
    AsyncStorage.getItem(PENDING_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.tool) pendingActionRef.current = parsed;
        } catch (_) {}
      })
      .catch(() => {});
    AsyncStorage.getItem(ACTIONS_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const lines = parsed.slice(-24).map((x) => `FEITO: ${x.t || x}`).filter(Boolean);
            memoryRef.current = [...(memoryRef.current || []), ...lines].slice(-48);
          }
        } catch (_) {}
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    loadDockMemory(user?.id)
      .then((store) => {
        if (alive) memoryRef.current = memoryForPrompt(store);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [user?.id]);

  const persistHistory = useCallback((role, content, extra = {}) => {
    const text = collapseRepeats(content).slice(0, 400);
    if (!text) return;
    const item = { role, content: text };
    if (extra.intent) item.intent = extra.intent;
    if (extra.done) item.content = `FEITO. ${text}`;
    const next = [...historyRef.current, item].slice(-24);
    historyRef.current = next;
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const persistPending = useCallback((pending) => {
    pendingActionRef.current = pending || null;
    AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending || null)).catch(() => {});
  }, []);

  const persistAction = useCallback((line) => {
    const text = String(line || '').trim();
    if (!text) return;
    AsyncStorage.getItem(ACTIONS_KEY).then((raw) => {
      let list = [];
      try { list = JSON.parse(raw) || []; } catch (_) { list = []; }
      const next = [...list, { t: text, at: new Date().toISOString() }].slice(-40);
      AsyncStorage.setItem(ACTIONS_KEY, JSON.stringify(next)).catch(() => {});
      memoryRef.current = [...(memoryRef.current || []), `FEITO: ${text}`].slice(-48);
    }).catch(() => {});
  }, []);

  const setStatus = useCallback((patch) => {
    setVoiceStatus?.(patch);
  }, [setVoiceStatus]);

  const talk = useCallback((text) => {
    const placed = relocateName(collapseRepeats(String(text || '').trim()), firstName, nameUsedRef.current);
    const full = placed;
    if (!full) return;
    if (/\b/i.test(firstName || '') && new RegExp(`^${String(firstName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(full)) {
      nameUsedRef.current = true;
    }
    const key = fold(full);
    const now = Date.now();
    if (key && key === lastTalkRef.current.key && now - lastTalkRef.current.at < 5000) return;
    lastTalkRef.current = { key, at: now };
    lastSpokenRef.current = key;
    ignoreUntilRef.current = now + Math.max(900, Math.min(6500, full.length * 70));
    speakDock(full, {
      speakingRef,
      onStart: () => {
        speakingRef.current = true;
        ignoreUntilRef.current = Date.now() + Math.max(900, Math.min(6500, full.length * 70));
        setStatus({ speaking: true, caption: '', listening: true, armed: true });
      },
      onEnd: () => {
        ignoreUntilRef.current = Date.now() + 700;
        setStatus({ speaking: false, caption: '', listening: true, armed: true });
      },
    });
  }, [firstName, setStatus]);

  const sleepDock = useCallback(() => {
    modeRef.current = 'wake';
    bufferRef.current = '';
    nameUsedRef.current = false;
    const bye = 'Ok. Me chame de novo.';
    speakDock(bye, {
      speakingRef,
      onStart: () => setStatus({ speaking: true, caption: '', stage: true, mode: 'wake' }),
      onEnd: () => setStatus({
        mode: 'wake',
        stage: false,
        listening: true,
        lastHeard: '',
        interim: '',
        caption: '',
        confirmPrompt: '',
        speaking: false,
        busy: false,
        armed: true,
      }),
    });
  }, [setStatus]);

  const isSelfEcho = useCallback((raw) => {
    const t = fold(raw);
    if (!t) return true;
    if (isDockOwnLine(t)) return true;
    const spoken = lastSpokenRef.current;
    const echoWindow = speakingRef.current || Date.now() < ignoreUntilRef.current + 900;
    if (spoken && echoWindow) {
      if (t === spoken || spoken.includes(t) || t.includes(spoken)) return true;
      if (overlapRatio(t, spoken) >= 0.4) return true;
    }
    const navKey = lastNavRef.current.key;
    if (navKey && Date.now() - lastNavRef.current.at < 4000) {
      if (navKey.includes('calculator') && /\bcalculador/.test(t)) return true;
      if (/\b(abrindo|fechando|pronto ja esta)\b/.test(t)) return true;
    }
    return false;
  }, []);

  const applyNav = useCallback((nav) => {
    const key = `${nav.action || 'open'}:${nav.target}`;
    const now = Date.now();
    const dup = lastNavRef.current.key === key && now - lastNavRef.current.at < 5000;
    lastNavRef.current = { key, at: now };
    if (nav.action !== 'close') {
      setStatus({
        stage: false,
        speaking: false,
        busy: false,
        confirmPrompt: '',
        lastHeard: '',
        interim: '',
        mode: 'command',
        listening: true,
        armed: true,
      });
    }
    const mode = nav.action === 'close' ? 'close' : (nav.action === 'scroll' ? 'scroll' : 'open');
    pushDockUi(nav.target, mode, { dir: nav.dir });
    if (dup) return;
    const line = nav.action === 'close'
      ? 'Fechei.'
      : nav.action === 'scroll'
        ? (nav.dir === 'up' ? 'Indo para o topo.' : 'Rolando a página.')
        : 'Pronto. Já está na tela.';
    persistHistory('assistant', line);
    talk(line);
  }, [persistHistory, setStatus, talk]);

  const runCommand = useCallback(async (raw) => {
    if (hasWake(raw) && stripWake(raw).length <= 3) {
      modeRef.current = 'command';
      setStatus({
        mode: 'command',
        stage: true,
        listening: true,
        busy: false,
        armed: true,
      });
      talk(DOCK_INTRO());
      return;
    }
    const message = collapseRepeats(stripWake(raw));
    if (!message) return;
    const cmdKey = fold(message);
    const now = Date.now();
    if (cmdKey === lastCmdRef.current.key && now - lastCmdRef.current.at < 2200) return;
    lastCmdRef.current = { key: cmdKey, at: now };
    if (SLEEP_RE.test(fold(message)) || SLEEP_RE.test(fold(raw))) {
      sleepDock();
      return;
    }
    if (busyRef.current) return;
    if (pendingActionRef.current && abortsPendingWrite(message, pendingActionRef.current.tool)) {
      pendingActionRef.current = null;
      persistPending(null);
      persistHistory('user', message);
      persistHistory('assistant', 'Ok, não alterei nada.');
      setStatus({ confirmPrompt: '', busy: false });
      talk('Ok, não alterei nada.');
      return;
    }
    const nav = detectDockNav(message) || detectDockNav(raw);
    if (nav?.target && !pendingActionRef.current && !isDockWritePhrase(message) && !detectDockWrite(message, { clients: financeRef.current?.clients, agendaEvents: financeRef.current?.agendaEvents })) {
      persistHistory('user', message);
      applyNav(nav);
      return;
    }
    if (pendingActionRef.current && confirmsPendingWrite(message, pendingActionRef.current.tool)) {
      busyRef.current = true;
      setStatus({
        mode: 'command',
        stage: true,
        listening: false,
        lastHeard: '',
        interim: '',
        confirmPrompt: '',
        busy: true,
        armed: true,
      });
      persistHistory('user', message);
      try {
        const done = await executeDockWrite(pendingActionRef.current, financeRef.current);
        persistPending(null);
        if (done.ok) {
          persistAction(done.message);
          persistHistory('assistant', done.message, { intent: done.intent, done: true });
          talk(done.message);
          if (done.uiAction?.target) {
            pushDockUi(done.uiAction.target, 'open', {
              openForm: !!done.uiAction.openForm || done.uiAction.type === 'form' || !!done.uiAction.editingEvent,
              initialData: done.uiAction.initialData,
              date: done.uiAction.date,
              form: done.uiAction.form || done.uiAction.initialData,
              editingEvent: done.uiAction.editingEvent,
            });
          }
        } else {
          persistHistory('assistant', done.error || 'Não consegui gravar.');
          talk(done.error || 'Não consegui gravar na agenda.');
        }
      } finally {
        busyRef.current = false;
        modeRef.current = 'command';
        setStatus({ mode: 'command', listening: true, busy: false, armed: true, confirmPrompt: '' });
      }
      return;
    }
    busyRef.current = true;
    setStatus({
      mode: 'command',
      stage: true,
      listening: false,
      lastHeard: '',
      interim: '',
      confirmPrompt: '',
      busy: true,
      armed: true,
    });
    try {
      const instant = localClockReply(message);
      if (instant) {
        persistHistory('user', message);
        persistHistory('assistant', instant);
        talk(instant);
        return;
      }
      persistHistory('user', message);
      if (isLearnPhrase(message)) {
        const store = await rememberDockFact(userIdRef.current, message, 'correction');
        memoryRef.current = memoryForPrompt(store);
      }
      const localWrite = detectDockWrite(message, { clients: financeRef.current?.clients, agendaEvents: financeRef.current?.agendaEvents });
      const result = await askAccountAssistant({
        message,
        history: historyRef.current.slice(0, -1),
        pendingAction: pendingActionRef.current,
        confirm: false,
        preferredName: firstName,
        voiceTone: tone,
        memory: memoryRef.current,
      });
      const pending = localWrite?.tool
        ? localWrite
        : (result.ok && result.pendingAction?.tool ? result.pendingAction : null);
      if (pending?.tool === 'need_params') {
        persistPending(null);
        const ask = pending.message || pending.args?.message || pendingWriteSummary(pending.tool, pending.args);
        persistHistory('assistant', ask, { intent: 'need_params' });
        talk(ask);
        setStatus({ confirmPrompt: '' });
        return;
      }
      if (pending?.tool === 'create_appointment' || pending?.tool === 'update_appointment') {
        persistPending(null);
        const done = await executeDockWrite(pending, financeRef.current);
        persistHistory('assistant', done.message, { intent: pending.tool });
        talk(done.ok ? done.message : (done.error || done.message));
        if (done.ok) persistAction(done.message);
        if (done.ok && done.uiAction?.target) {
          pushDockUi(done.uiAction.target, 'open', {
            openForm: true,
            initialData: done.uiAction.initialData,
            date: done.uiAction.date,
            form: done.uiAction.initialData,
            editingEvent: done.uiAction.editingEvent,
          });
        }
        return;
      }
      if (pending?.tool) {
        persistPending(pending);
        const ask = pendingWriteSummary(pending.tool, pending.args);
        persistHistory('assistant', ask, { intent: pending.tool });
        talk(ask);
        setStatus({ confirmPrompt: ask });
        return;
      }
      const reply = result.ok ? result.reply : result.error;
      if (reply && claimsDockSaved(reply)) {
        const fallback = localWrite?.tool ? localWrite : detectDockWrite(message, { clients: financeRef.current?.clients, agendaEvents: financeRef.current?.agendaEvents });
        if (fallback?.tool === 'create_appointment' || fallback?.tool === 'create_client') {
          persistPending(null);
          const done = await executeDockWrite(fallback, financeRef.current);
          persistHistory('assistant', done.message, { intent: fallback.tool });
          talk(done.ok ? done.message : (done.error || 'Ainda não gravei isso. Repita o nome, o dia e a hora.'));
          if (done.ok) persistAction(done.message);
          if (done.ok && done.uiAction?.target) {
            pushDockUi(done.uiAction.target, 'open', {
              openForm: true,
              initialData: done.uiAction.initialData,
              date: done.uiAction.date,
              form: done.uiAction.initialData,
              editingEvent: done.uiAction.editingEvent,
            });
          }
          return;
        }
        persistHistory('assistant', 'Ainda não gravei isso. Diga o nome, o dia e a hora para eu agendar de verdade.');
        talk('Ainda não gravei isso. Diga o nome, o dia e a hora para eu agendar de verdade.');
        return;
      }
      if (reply) {
        persistHistory('assistant', reply, { intent: result.intent });
        talk(reply);
      }
      setStatus({ confirmPrompt: '' });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tc:dock-voice-turn', {
          detail: { user: message, intent: result.intent },
        }));
      }
      const ui = result.ok ? result.uiAction : null;
      if (ui?.target && !/^create_/.test(String(result.intent || ''))) {
        const action = String(ui.type || ui.action || '').toLowerCase() === 'close'
          ? 'close'
          : (String(ui.type || '').toLowerCase() === 'scroll' ? 'scroll' : 'open');
        pushDockUi(ui.target, action, { dir: ui.dir });
      }
    } finally {
      busyRef.current = false;
      modeRef.current = 'command';
      setStatus({ mode: 'command', listening: true, busy: false, armed: true });
    }
  }, [firstName, tone, setStatus, sleepDock, talk, persistHistory, persistPending, persistAction, isSelfEcho, applyNav]);

  const finishUtterance = useCallback((raw) => {
    const heard = collapseRepeats(String(raw || '').trim());
    if (!heard) return;
    if (hasWake(heard) && stripWake(heard).length <= 3) {
      modeRef.current = 'command';
      setStatus({
        mode: 'command',
        stage: true,
        listening: true,
        lastHeard: '',
        interim: '',
        busy: false,
        armed: true,
      });
      talk(DOCK_INTRO());
      return;
    }
    if (isNoiseTranscript(heard, 1, !!pendingActionRef.current)) return;
    if (isDockOwnLine(heard) || isSelfEcho(heard)) return;
    bufferRef.current = '';
    if (modeRef.current === 'wake') {
      if (!hasWake(heard)) return;
      const rest = stripWake(heard);
      modeRef.current = 'command';
      setStatus({
        mode: 'command',
        stage: true,
        listening: true,
        lastHeard: '',
        interim: '',
        busy: false,
        armed: true,
      });
      if (rest.length > 3) runCommand(heard);
      else talk(DOCK_INTRO());
      return;
    }
    runCommand(heard);
  }, [firstName, runCommand, setStatus, talk, isSelfEcho]);

  const talkRef = useRef(talk);
  talkRef.current = talk;
  const firstNameRef = useRef(firstName);
  firstNameRef.current = firstName;
  const finishRef = useRef(finishUtterance);
  finishRef.current = finishUtterance;

  const noteSpeech = useCallback((heard, isFinal = false) => {
    const text = String(heard || '').trim();
    if (!text) return;
    const allowConfirm = !!pendingActionRef.current;
    const woke = hasWake(text);
    if (!woke && (isNoiseTranscript(text, 1, allowConfirm) || isSelfEcho(text))) return;

    if (speakingRef.current) {
      const t = fold(text);
      if (!woke && (isSelfEcho(text) || overlapRatio(t, lastSpokenRef.current) >= 0.32)) return;
      const words = t.split(' ').filter(Boolean);
      const canCut = woke || words.length >= 2 || t.length >= 8
        || (allowConfirm && (isDataConfirm(t) || isDataCancel(t)));
      if (!canCut) return;
      stopDockSpeak();
      speakingRef.current = false;
      setStatus({ speaking: false, listening: true, armed: true });
    }

    if (busyRef.current) return;
    const prev = String(bufferRef.current || '').trim();
    const merged = mergeHeard(prev, text);
    const same = fold(merged) === fold(prev) || (prev && overlapRatio(merged, prev) >= 0.88);
    if (!same) {
      bufferRef.current = merged;
      lastNewSpeechAtRef.current = Date.now();
    } else if (!bufferRef.current) {
      bufferRef.current = merged;
    }
    lastVoiceAtRef.current = Date.now();

    if (hasWake(merged) && stripWake(merged).length <= 3) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = 0;
      bufferRef.current = '';
      finishRef.current(merged);
      return;
    }

    if (modeRef.current === 'wake' && hasWake(merged)) {
      modeRef.current = 'command';
      setStatus({
        mode: 'command',
        stage: true,
        listening: true,
        armed: true,
      });
    } else {
      setStatus({
        lastHeard: '',
        interim: '',
        listening: true,
        armed: true,
      });
    }

    const wait = isFinal ? FINAL_SILENCE_MS : SILENCE_MS;
    if (same && silenceTimerRef.current && !isFinal) return;
    window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(() => {
      if (!isMicQuiet() && !isFinal) {
        silenceTimerRef.current = window.setTimeout(() => {
          const pending = bufferRef.current;
          bufferRef.current = '';
          silenceTimerRef.current = 0;
          finishRef.current(pending);
        }, 220);
        return;
      }
      const pending = bufferRef.current;
      bufferRef.current = '';
      silenceTimerRef.current = 0;
      finishRef.current(pending);
    }, wait);
  }, [setStatus, isSelfEcho]);

  const noteSpeechRef = useRef(noteSpeech);
  noteSpeechRef.current = noteSpeech;

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    warmDockVoices();
    if (!isWebSpeechAvailable()) {
      setStatus({
        armed: false,
        listening: false,
        error: 'Este navegador não reconhece voz. Use Chrome ou Edge.',
      });
      return undefined;
    }

    registerWebSpeech('wake', {
      onResult: (ev) => {
        let piece = '';
        let confidence = 0;
        let anyFinal = false;
        for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
          const alt = ev.results[i][0];
          piece += ` ${alt?.transcript || ''}`;
          const c = Number(alt?.confidence || 0);
          if (c > confidence) confidence = c;
          if (ev.results[i].isFinal) anyFinal = true;
        }
        const heard = String(piece || '').trim();
        if (!heard) return;
        if (hasWake(heard)) {
          noteSpeechRef.current(heard, anyFinal);
          return;
        }
        if (isNoiseTranscript(heard, confidence, !!pendingActionRef.current)) return;
        if (!anyFinal && confidence > 0 && confidence < 0.45) return;
        noteSpeechRef.current(heard, anyFinal);
      },
      onError: (e) => {
        const code = String(e?.error || '');
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          armedRef.current = false;
          setStatus({
            mode: 'wake',
            listening: false,
            armed: false,
            error: 'Permita o microfone para o Dock ouvir você.',
          });
        }
      },
      onEnd: () => {},
    });

    const flushIfSilent = () => {
      if (busyRef.current || speakingRef.current) return;
      const pending = String(bufferRef.current || '').trim();
      if (!pending) return;
      const now = Date.now();
      if (!lastVoiceAtRef.current) lastVoiceAtRef.current = lastNewSpeechAtRef.current || now;
      if (!isMicQuiet(false)) {
        lastVoiceAtRef.current = now;
        return;
      }
      const silentFor = now - lastVoiceAtRef.current;
      const heldFor = now - (lastNewSpeechAtRef.current || now);
      if (silentFor < SILENCE_MS && heldFor < MAX_HOLD_MS) return;
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = 0;
      bufferRef.current = '';
      finishRef.current(pending);
    };
    window.clearInterval(vadTimerRef.current);
    vadTimerRef.current = window.setInterval(flushIfSilent, 90);

    const arm = async (openStage) => {
      if (armedRef.current && !openStage) return true;
      if (armingRef.current && !openStage) return false;
      armingRef.current = true;
      try {
        await unlockWebMic();
        startWebSpeech('wake');
        armedRef.current = true;
        try {
          window.localStorage.setItem('@tudocerto_dock_voice', 'on');
        } catch (_) {}
        if (modeRef.current === 'off') modeRef.current = 'wake';
        setStatus({
          armed: true,
          listening: true,
          error: '',
          mode: modeRef.current === 'command' ? 'command' : 'wake',
        });
        if (openStage) {
          modeRef.current = 'command';
          setStatus({ mode: 'command', stage: true, listening: true, armed: true });
          talkRef.current(DOCK_INTRO());
        }
        return true;
      } catch (_) {
        armedRef.current = false;
        setStatus({
          armed: false,
          listening: false,
          error: 'Permita o microfone para o Dock te ouvir.',
        });
        return false;
      } finally {
        armingRef.current = false;
      }
    };

    const silentArm = () => {
      if (armedRef.current) return;
      arm(false);
    };

    const onArm = (ev) => arm(!!ev?.detail?.openStage);
    const onResume = () => {
      if (!armedRef.current) return;
      try {
        takeWebSpeech('wake');
        setStatus({ listening: true, armed: true });
      } catch (_) {}
    };
    const onClose = () => {
      modeRef.current = 'wake';
      bufferRef.current = '';
      nameUsedRef.current = false;
      window.clearTimeout(silenceTimerRef.current);
      stopDockSpeak();
      setStatus({
        mode: 'wake',
        stage: false,
        speaking: false,
        busy: false,
        caption: '',
        interim: '',
        listening: true,
        armed: true,
      });
      try {
        takeWebSpeech('wake');
      } catch (_) {}
    };
    const onVisible = () => {
      if (document.hidden || !armedRef.current) return;
      try {
        takeWebSpeech('wake');
      } catch (_) {}
    };

    window.addEventListener('tc:dock-arm', onArm);
    window.addEventListener('tc:dock-wake-resume', onResume);
    window.addEventListener('tc:dock-stage-close', onClose);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pointerdown', silentArm, true);
    window.addEventListener('keydown', silentArm, true);

    arm(false);
    micPermissionState().then((state) => {
      if (state === 'granted') arm(false);
    }).catch(() => {});

    return () => {
      modeRef.current = 'off';
      window.clearTimeout(silenceTimerRef.current);
      window.clearInterval(vadTimerRef.current);
      window.removeEventListener('tc:dock-arm', onArm);
      window.removeEventListener('tc:dock-wake-resume', onResume);
      window.removeEventListener('tc:dock-stage-close', onClose);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', silentArm, true);
      window.removeEventListener('keydown', silentArm, true);
      unregisterWebSpeech('wake');
      stopDockSpeak();
    };
  }, [setStatus]);

  return null;
}
