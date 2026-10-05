import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { askAccountAssistant } from '../services/accountAssistant';
import { useDockMascot } from '../contexts/DockMascotContext';
import { useFinance } from '../contexts/FinanceContext';
import { detectDockNav, emitDockControl } from '../utils/dockNav';
import {
  isDataCancel,
  isDataConfirm,
  isLearnPhrase,
  loadDockMemory,
  memoryForPrompt,
  rememberDockFact,
} from '../utils/dockMemory';
import { useAuth } from '../contexts/AuthContext';
import { DOCK_INTRO, speakDock, stopDockSpeak, warmDockVoices } from '../utils/dockSpeak';
import { collapseRepeats, mergeHeard, nowInSaoPaulo } from '../utils/dockSpeechText';
import {
  isWebSpeechAvailable,
  micPermissionState,
  registerWebSpeech,
  unregisterWebSpeech,
  startWebSpeech,
  takeWebSpeech,
  unlockWebMic,
} from '../utils/webSpeech';

const SILENCE_MS = 1100;
const MIN_CONFIDENCE = 0.55;
const FILLER = /^(a|e|o|u|ah|eh|uh|hm+|hum+|ahn|aham|ne|ta|tipo|entao|pois|sim|nao|ok|ei|ui|ih|oh|ha|he|hi|mm+)$/;
const HISTORY_KEY = '@tudocerto_dock_voice_history';

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasWake(text) {
  const t = fold(text);
  if (!t) return false;
  if (/\b(dock|dok|doque|doc)\b/.test(t)) return true;
  if (/\b(e+\s*a+i+|ae+|eae|eai|oi+|ola+|fala|hey|ei+|bora comecar|opa)\s+(dock|dok|doque|doc)\b/.test(t)) return true;
  return false;
}

function isNoiseTranscript(text, confidence, allowConfirm) {
  const t = fold(text);
  if (!t) return true;
  if (allowConfirm && /^(sim|s|ok|nao|não|cancela|cancelar|confirmo|pode)$/i.test(t)) return false;
  if (hasWake(t)) return false;
  if (confidence > 0 && confidence < MIN_CONFIDENCE) return true;
  const words = t.split(' ').filter(Boolean);
  if (!words.length) return true;
  if (words.length === 1 && (FILLER.test(words[0]) || words[0].length < 3)) return true;
  if (words.length <= 2 && words.every((w) => w.length <= 2)) return true;
  if (words.every((w) => FILLER.test(w))) return true;
  const compact = t.replace(/\s/g, '');
  if (compact.length < 3) return true;
  if (/^(.)\1{4,}$/.test(compact)) return true;
  return false;
}

function stripWake(text) {
  return String(text || '')
    .replace(/^(e+\s*a[ií]+|ae+|eae|eai|oi+|ol[aá]+|fala|hey|ei+|bora come[cç]ar|opa)[\s,]*/i, '')
    .replace(/^(dock|dok|doque|doc)[\s,]*/i, '')
    .trim();
}

function localClockReply(msg) {
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
  const reloadAll = finance?.reloadAll;
  const modeRef = useRef('wake');
  const busyRef = useRef(false);
  const speakingRef = useRef(false);
  const armedRef = useRef(false);
  const armingRef = useRef(false);
  const bufferRef = useRef('');
  const silenceTimerRef = useRef(0);
  const historyRef = useRef([]);
  const lastSpokenRef = useRef('');
  const ignoreUntilRef = useRef(0);
  const lastNavRef = useRef({ key: '', at: 0 });
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
          if (Array.isArray(parsed)) historyRef.current = parsed.slice(-16);
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

  const persistHistory = useCallback((role, content) => {
    const text = collapseRepeats(content).slice(0, 400);
    if (!text) return;
    const next = [...historyRef.current, { role, content: text }].slice(-16);
    historyRef.current = next;
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setStatus = useCallback((patch) => {
    setVoiceStatus?.(patch);
  }, [setVoiceStatus]);

  const talk = useCallback((text) => {
    const full = String(text || '').trim();
    if (!full) return;
    lastSpokenRef.current = fold(full);
    ignoreUntilRef.current = Date.now() + Math.max(2800, full.length * 90);
    speakDock(full, {
      speakingRef,
      onStart: () => {
        ignoreUntilRef.current = Date.now() + 8000;
        setStatus({ speaking: true, caption: '' });
      },
      onEnd: () => {
        ignoreUntilRef.current = Date.now() + 1800;
        setStatus({ speaking: false, caption: '' });
      },
    });
  }, [setStatus]);

  const sleepDock = useCallback(() => {
    modeRef.current = 'wake';
    bufferRef.current = '';
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
    const spoken = lastSpokenRef.current;
    if (spoken && (t === spoken || t.includes(spoken) || spoken.includes(t))) {
      if (Date.now() < ignoreUntilRef.current + 2200) return true;
    }
    if (Date.now() < ignoreUntilRef.current && /\b(abrindo|fechando|pronto ja esta|ja esta na tela|para voce|pra voce|pra vc)\b/.test(t)) {
      return true;
    }
    const navKey = lastNavRef.current.key;
    if (navKey && Date.now() - lastNavRef.current.at < 5000) {
      if (navKey.includes('calculator') && /\bcalculador/.test(t)) return true;
      if (/\b(abrindo|fechando)\b/.test(t)) return true;
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
    emitDockControl(nav.target, mode, { dir: nav.dir });
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
    const message = collapseRepeats(stripWake(raw));
    if (!message) return;
    if (isSelfEcho(message) || isSelfEcho(raw)) return;
    if (SLEEP_RE.test(fold(message)) || SLEEP_RE.test(fold(raw))) {
      sleepDock();
      return;
    }
    if (busyRef.current) return;
    if (pendingActionRef.current && isDataCancel(message)) {
      pendingActionRef.current = null;
      persistHistory('user', message);
      persistHistory('assistant', 'Ok, não alterei nada.');
      setStatus({ confirmPrompt: '', busy: false });
      talk('Ok, não alterei nada.');
      return;
    }
    const nav = detectDockNav(message) || detectDockNav(raw);
    if (nav?.target && !pendingActionRef.current) {
      persistHistory('user', message);
      applyNav(nav);
      return;
    }
    busyRef.current = true;
    setStatus({
      mode: 'command',
      stage: true,
      listening: true,
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
      const confirming = !!(pendingActionRef.current && isDataConfirm(message));
      const result = await askAccountAssistant({
        message,
        history: historyRef.current.slice(0, -1),
        pendingAction: pendingActionRef.current,
        confirm: confirming,
        preferredName: firstName,
        voiceTone: tone,
        memory: memoryRef.current,
      });
      pendingActionRef.current = result.ok ? (result.pendingAction || null) : pendingActionRef.current;
      const reply = result.ok ? result.reply : result.error;
      const waitingConfirm = !!(result.ok && result.pendingAction);
      const ui = result.ok ? result.uiAction : null;
      if (ui?.target) {
        applyNav({
          target: ui.target,
          action: String(ui.type || ui.action || '').toLowerCase() === 'close'
            ? 'close'
            : (String(ui.type || '').toLowerCase() === 'scroll' ? 'scroll' : 'open'),
          dir: ui.dir,
          label: '',
        });
        return;
      }
      if (reply) {
        persistHistory('assistant', reply);
        talk(reply);
      }
      setStatus({ confirmPrompt: waitingConfirm ? reply : '' });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tc:dock-voice-turn', {
          detail: { user: message, intent: result.intent },
        }));
      }
      if (result.ok && /^create_/.test(String(result.intent || '')) && !result.pendingAction) {
        await reloadAll?.();
      }
    } finally {
      busyRef.current = false;
      modeRef.current = 'command';
      setStatus({ mode: 'command', listening: true, busy: false, armed: true });
    }
  }, [firstName, tone, reloadAll, setStatus, sleepDock, talk, persistHistory, isSelfEcho, applyNav]);

  const finishUtterance = useCallback((raw) => {
    const heard = collapseRepeats(String(raw || '').trim());
    if (!heard || isNoiseTranscript(heard, 1, !!pendingActionRef.current)) return;
    if (isSelfEcho(heard)) return;
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

  const noteSpeech = useCallback((heard) => {
    if (speakingRef.current || busyRef.current) return;
    if (Date.now() < ignoreUntilRef.current) return;
    const text = String(heard || '').trim();
    if (!text || isNoiseTranscript(text, 1, !!pendingActionRef.current) || isSelfEcho(text)) return;
    const prev = String(bufferRef.current || '').trim();
    const merged = mergeHeard(prev, text);
    bufferRef.current = merged;
    if (modeRef.current === 'wake' && hasWake(merged)) {
      window.clearTimeout(silenceTimerRef.current);
      bufferRef.current = '';
      finishRef.current(merged);
      return;
    }
    setStatus({
      lastHeard: '',
      interim: '',
      listening: true,
      armed: true,
    });
    window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(() => {
      const pending = bufferRef.current;
      bufferRef.current = '';
      finishRef.current(pending);
    }, SILENCE_MS);
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
        if (speakingRef.current || Date.now() < ignoreUntilRef.current) return;
        let piece = '';
        let confidence = 0;
        for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
          const alt = ev.results[i][0];
          piece += ` ${alt?.transcript || ''}`;
          const c = Number(alt?.confidence || 0);
          if (c > confidence) confidence = c;
        }
        const heard = String(piece || '').trim();
        if (!heard || isNoiseTranscript(heard, confidence)) return;
        noteSpeechRef.current(heard);
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
