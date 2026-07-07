(() => {
  'use strict';

  if (window.__GHOLL_ACCEL_V1_LOADED__) return;
  window.__GHOLL_ACCEL_V1_LOADED__ = true;

  const APP = {
    name: 'GHOLL-ACCEL Ultimate',
    version: '1.0.0',
    storageKey: 'ghollAccel.v1.config',
    storageVersion: 2730,
    routePollMs: 900,
    graphMaxPoints: 720
  };

  const DEFAULT_CONFIG = Object.freeze({
    storageVersion: APP.storageVersion,
    active: false,
    panelVisible: true,
    panelMinimized: false,
    miniHudEnabled: true,
    panelLeft: null,
    panelTop: null,

    timeStart: 0,
    timeEnd: 60,
    speedStart: 1,
    speedEnd: 2,
    curveMode: 'exact',
    timerMode: 'playing',

    smoothness: 0.12,
    velocityMode: true,
    velocityForce: 0.055,
    velocityFriction: 0.91,
    snapThreshold: 0.001,
    autoSyncThreshold: 0.55,
    precisionDisplay: 4,
    antiRoundCompensation: false,
    antiRoundForce: 0.0015,
    preservePitch: true,

    rollingWindow: 60,
    graphMode: 'rolling',

    disableOnAds: true,
    disableOnShorts: false,
    disableOnLive: true,
    resetOnSeek: false,
    resetOnNewVideo: false,
    continueAcrossVideos: true,
    loopBehavior: 'continue',

    shortcutsEnabled: true,
    shortcutStep: 0.05,
    showHelp: false
  });

  const PRESETS = Object.freeze({
    precision: {
      title: 'Precision',
      description: 'Hassas ve dengeli artış',
      config: { timeStart: 0, timeEnd: 60, speedStart: 1, speedEnd: 2, curveMode: 'exact', timerMode: 'playing', snapThreshold: 0.0005, velocityForce: 0.03, velocityFriction: 0.95, rollingWindow: 60 }
    },
    turbo: {
      title: 'Turbo',
      description: 'Kısa videoda hızlı ramp',
      config: { timeStart: 0, timeEnd: 5, speedStart: 1, speedEnd: 3, curveMode: 'exact', timerMode: 'playing', snapThreshold: 0.001, velocityForce: 0.085, velocityFriction: 0.85, rollingWindow: 30 }
    },
    focus: {
      title: 'Focus',
      description: 'Ders/podcast için yumuşak artış',
      config: { timeStart: 0, timeEnd: 60, speedStart: 1, speedEnd: 1.5, curveMode: 'softstart', timerMode: 'playing', snapThreshold: 0.0005, velocityForce: 0.02, velocityFriction: 0.96, rollingWindow: 90 }
    },
    study: {
      title: 'Study',
      description: '30 saniyede 2x hedef',
      config: { timeStart: 0, timeEnd: 30, speedStart: 1, speedEnd: 2, curveMode: 'exact', timerMode: 'playing', snapThreshold: 0.001, velocityForce: 0.05, velocityFriction: 0.92, rollingWindow: 60 }
    },
    microscopic: {
      title: 'Microscopic',
      description: 'Çok yavaş ve çok hassas ramp',
      config: { timeStart: 10, timeEnd: 100, speedStart: 1, speedEnd: 1.5, curveMode: 'exact', timerMode: 'playing', snapThreshold: 0.0001, velocityForce: 0.01, velocityFriction: 0.98, rollingWindow: 120 }
    },
    cinematic: {
      title: 'Cinematic',
      description: 'Yumuşak, göze batmayan geçiş',
      config: { timeStart: 5, timeEnd: 45, speedStart: 1, speedEnd: 1.8, curveMode: 'smooth', timerMode: 'playing', snapThreshold: 0.0005, velocityForce: 0.03, velocityFriction: 0.94, rollingWindow: 60 }
    }
  });

  let config = { ...DEFAULT_CONFIG };

  const state = {
    video: null,
    videoAbort: null,
    routeKey: '',
    schedulerToken: 0,
    rafId: null,
    running: false,
    applyingRateInternally: false,

    lastTickMs: 0,
    sessionStartMs: performance.now(),
    videoBaseTime: 0,
    playingElapsed: 0,
    realPlayingElapsed: 0,
    virtualMediaAdvanced: 0,
    lastVideoCurrentTime: 0,
    videoElapsed: 0,
    hasBoundVideo: false,
    lastTargetSpeed: 1,
    currentSpeed: 1,
    lastAppliedRate: 1,
    velocity: 0,
    roundingComp: 0,

    history: [],
    uiLastMs: 0,
    graphLastMs: 0,
    lastStatus: 'Video aranıyor',
    bypassReason: '',
    lastSavedAt: 0,

    drag: {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      originLeft: 0,
      originTop: 0
    }
  };

  const ui = {
    host: null,
    panel: null,
    header: null,
    content: null,
    mini: null,
    canvas: null,
    ctx: null,
    dpr: 1,
    graphW: 0,
    graphH: 0,
    els: Object.create(null)
  };

  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function fmt(value, digits = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return n.toFixed(digits);
  }

  function fmtTime(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  function sanitizeConfig(input) {
    const next = { ...DEFAULT_CONFIG, ...(input || {}) };
    next.storageVersion = APP.storageVersion;

    next.active = Boolean(next.active);
    next.panelVisible = Boolean(next.panelVisible);
    next.panelMinimized = Boolean(next.panelMinimized);
    next.miniHudEnabled = Boolean(next.miniHudEnabled);
    next.shortcutsEnabled = Boolean(next.shortcutsEnabled);
    next.showHelp = Boolean(next.showHelp);

    next.timeStart = clamp(next.timeStart, 0, 999);
    next.timeEnd = clamp(next.timeEnd, 1, 999);
    if (next.timeEnd <= next.timeStart) next.timeEnd = Math.min(999, next.timeStart + 1);

    next.speedStart = clamp(next.speedStart, 0.25, 16);
    next.speedEnd = clamp(next.speedEnd, 0.25, 16);

    next.smoothness = clamp(next.smoothness, 0.01, 1);
    next.velocityMode = Boolean(next.velocityMode);
    next.velocityForce = clamp(next.velocityForce, 0.001, 0.5);
    next.velocityFriction = clamp(next.velocityFriction, 0.1, 0.999);
    next.snapThreshold = clamp(next.snapThreshold, 0, 0.1);
    next.autoSyncThreshold = clamp(next.autoSyncThreshold, 0.05, 4);
    next.precisionDisplay = Math.round(clamp(next.precisionDisplay, 2, 6));
    next.antiRoundCompensation = Boolean(next.antiRoundCompensation);
    next.antiRoundForce = clamp(next.antiRoundForce, 0, 0.02);
    next.preservePitch = Boolean(next.preservePitch);

    next.rollingWindow = clamp(next.rollingWindow, 10, 600);
    if (!['rolling', 'full'].includes(next.graphMode)) next.graphMode = 'rolling';
    if (!['exact', 'smooth', 'softstart'].includes(next.curveMode)) next.curveMode = 'exact';
    if (!['playing', 'real', 'video'].includes(next.timerMode)) next.timerMode = 'playing';
    if (!['continue', 'reset'].includes(next.loopBehavior)) next.loopBehavior = 'continue';

    next.disableOnAds = Boolean(next.disableOnAds);
    next.disableOnShorts = Boolean(next.disableOnShorts);
    next.disableOnLive = Boolean(next.disableOnLive);
    next.resetOnSeek = Boolean(next.resetOnSeek);
    next.resetOnNewVideo = Boolean(next.resetOnNewVideo);
    next.continueAcrossVideos = Boolean(next.continueAcrossVideos);
    next.shortcutStep = clamp(next.shortcutStep, 0.01, 1);

    if (next.panelLeft !== null) next.panelLeft = clamp(next.panelLeft, -5000, 5000);
    if (next.panelTop !== null) next.panelTop = clamp(next.panelTop, -5000, 5000);

    return next;
  }

  function migrateConfig(saved) {
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_CONFIG };
    const migrated = { ...saved };
    if (!migrated.storageVersion) migrated.storageVersion = 2600;
    if (migrated.isActive !== undefined && migrated.active === undefined) migrated.active = migrated.isActive;
    if (migrated.panelVisible === undefined) migrated.panelVisible = true;

    const oldVersion = Number(migrated.storageVersion) || 2600;
    if (oldVersion < 2720) {
      // v1.0 changes the default behavior from per-video reset to session continuity.
      // This matches the intended UX: seek, loop and autoplay-next should keep the ramp alive.
      migrated.resetOnSeek = false;
      migrated.resetOnNewVideo = false;
      migrated.continueAcrossVideos = true;
      migrated.loopBehavior = 'continue';
    }

    return migrated;
  }

  function storageGet(key) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(key, (result) => resolve(result ? result[key] : undefined));
          return;
        }
      } catch (_) {}

      try {
        const raw = localStorage.getItem(key);
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch (_) {
        resolve(undefined);
      }
    });
  }

  function storageSet(key, value) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [key]: value }, () => resolve());
          return;
        }
      } catch (_) {}

      try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
      resolve();
    });
  }

  async function loadConfig() {
    const saved = await storageGet(APP.storageKey);
    config = sanitizeConfig(migrateConfig(saved));
    await storageSet(APP.storageKey, config);
  }

  function saveConfigNow() {
    config = sanitizeConfig(config);
    state.lastSavedAt = performance.now();
    storageSet(APP.storageKey, config);
  }

  function saveConfigDebounced(delay = 180) {
    clearTimeout(saveConfigDebounced._timer);
    saveConfigDebounced._timer = setTimeout(saveConfigNow, delay);
  }

  function query(selector, root = document) {
    return root.querySelector(selector);
  }

  function setText(id, value) {
    const el = ui.els[id];
    if (el) el.textContent = value;
  }

  function setBadge(id, value, tone = '') {
    const el = ui.els[id];
    if (!el) return;
    el.textContent = value;
    el.dataset.tone = tone;
  }

  function getRouteKey() {
    const url = new URL(location.href);
    if (location.pathname.startsWith('/watch')) return `watch:${url.searchParams.get('v') || ''}`;
    if (location.pathname.startsWith('/shorts/')) return `shorts:${location.pathname.split('/')[2] || ''}`;
    if (location.pathname.startsWith('/embed/')) return `embed:${location.pathname.split('/')[2] || ''}`;
    return `${location.pathname}${location.search}`;
  }

  function findVideoElement() {
    return document.querySelector('video.html5-main-video') || document.querySelector('video');
  }

  function isElementVisible(el) {
    if (!el || el.hidden || el.hasAttribute('disabled')) return false;
    const style = window.getComputedStyle(el);
    if (!style || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function detectLiveVideo(video) {
    if (!video) return false;

    // Normal YouTube videos can keep hidden live-badge DOM nodes around.
    // The old extension beta detector treated mere existence as live and forced 1.0x.
    // Real live streams usually expose Infinity duration; DVR/live badges are checked only when visible.
    if (video.duration === Infinity) return true;

    const player = document.getElementById('movie_player');
    if (player && player.classList.contains('ytp-live')) return true;

    const badgeCandidates = Array.from(document.querySelectorAll('.ytp-live-badge, .ytp-live-badge-label, .ytp-live-badge.ytp-button'));
    return badgeCandidates.some((badge) => {
      if (!isElementVisible(badge)) return false;
      const text = (badge.textContent || badge.getAttribute('aria-label') || '').trim().toLowerCase();
      return ['live', 'canlı', 'direct', 'en vivo', 'ao vivo'].some((word) => text.includes(word));
    });
  }

  function detectBypassReason() {
    const video = state.video;
    if (!video) return 'video-yok';

    if (config.disableOnAds) {
      const player = document.getElementById('movie_player');
      if ((player && player.classList.contains('ad-showing')) || document.body.classList.contains('ad-showing') || query('.ad-showing')) {
        return 'reklam';
      }
    }

    if (config.disableOnShorts && location.pathname.startsWith('/shorts/')) return 'shorts';

    if (config.disableOnLive && detectLiveVideo(video)) return 'canlı';

    return '';
  }

  function shouldApplyRate() {
    state.bypassReason = detectBypassReason();
    return config.active && !state.bypassReason && Boolean(state.video);
  }

  function setPlaybackRate(rate) {
    const video = state.video;
    if (!video) return;
    const safeRate = clamp(rate, 0.25, 16);

    try {
      state.applyingRateInternally = true;
      if (Math.abs(video.playbackRate - safeRate) > 0.0001) video.playbackRate = safeRate;
      video.defaultPlaybackRate = safeRate;
      if ('preservesPitch' in video) video.preservesPitch = config.preservePitch;
      if ('mozPreservesPitch' in video) video.mozPreservesPitch = config.preservePitch;
      if ('webkitPreservesPitch' in video) video.webkitPreservesPitch = config.preservePitch;
    } catch (_) {
      state.lastStatus = 'PlaybackRate yazılamadı';
    } finally {
      setTimeout(() => { state.applyingRateInternally = false; }, 0);
    }
  }

  function resetRuntimeStats() {
    state.playingElapsed = 0;
    state.videoElapsed = 0;
    state.realPlayingElapsed = 0;
    state.virtualMediaAdvanced = 0;
    state.currentSpeed = config.active ? config.speedStart : 1;
    state.lastTargetSpeed = config.active ? config.speedStart : 1;
    state.lastAppliedRate = 1;
    state.velocity = 0;
    state.roundingComp = 0;
    state.history = [];
    state.graphLastMs = 0;
    state.uiLastMs = 0;
  }

  function resetRamp(reason = 'reset') {
    const now = performance.now();
    state.sessionStartMs = now;
    state.lastTickMs = now;
    state.videoBaseTime = state.video ? Number(state.video.currentTime) || 0 : 0;
    state.lastVideoCurrentTime = state.videoBaseTime;
    resetRuntimeStats();
    setPlaybackRate(config.active ? config.speedStart : 1);
    state.lastStatus = reason;
    drawGraph(true);
    updateUI(true);
  }

  function panicReset() {
    config.active = false;
    resetRuntimeStats();
    setPlaybackRate(1);
    state.lastStatus = 'Acil 1.0x reset';
    saveConfigNow();
    syncFormFromConfig();
    updateUI(true);
  }

  function calculateElapsed() {
    if (config.timerMode === 'real') return Math.max(0, (performance.now() - state.sessionStartMs) / 1000);
    if (config.timerMode === 'video') return Math.max(0, state.videoElapsed);
    return Math.max(0, state.playingElapsed);
  }

  function calculateProgress(rawProgress) {
    const progress = clamp(rawProgress, 0, 1);
    if (config.curveMode === 'smooth') return Math.sin(progress * Math.PI / 2);
    if (config.curveMode === 'softstart') return progress * progress * (3 - 2 * progress);
    return progress;
  }

  function calculateTargetSpeed() {
    if (!shouldApplyRate()) return 1;
    const elapsed = calculateElapsed();
    const t0 = config.timeStart;
    const t1 = Math.max(config.timeStart + 0.001, config.timeEnd);
    const v0 = config.speedStart;
    const v1 = config.speedEnd;

    if (elapsed <= t0) return clamp(v0, 0.25, 16);
    if (elapsed >= t1) return clamp(v1, 0.25, 16);
    const progress = calculateProgress((elapsed - t0) / (t1 - t0));
    return clamp(v0 + progress * (v1 - v0), 0.25, 16);
  }

  function updateAccumulators(now) {
    if (!state.lastTickMs) state.lastTickMs = now;
    let delta = (now - state.lastTickMs) / 1000;
    if (!Number.isFinite(delta) || delta < 0 || delta > 600) delta = 0;

    const video = state.video;
    const bypass = detectBypassReason();
    state.bypassReason = bypass;

    if (video) {
      const currentTime = Number(video.currentTime) || 0;
      const previousTime = Number(state.lastVideoCurrentTime) || 0;
      const duration = Number(video.duration) || 0;

      if (!video.paused && !video.ended && !bypass) {
        state.playingElapsed += delta;
        state.realPlayingElapsed += delta;
        state.virtualMediaAdvanced += delta * (state.lastAppliedRate || 1);

        // Timer mode "video" is now seek/loop-safe: normal media movement is accumulated,
        // manual seek jumps are ignored unless the user explicitly enabled reset-on-seek.
        let mediaDelta = currentTime - previousTime;
        const looksLikeLoop = config.loopBehavior === 'continue' && duration > 0 && previousTime > duration - 1.5 && currentTime < 1.5;
        if (looksLikeLoop) mediaDelta = Math.max(0, (duration - previousTime) + currentTime);

        const maxExpectedDelta = Math.max(2.5, delta * Math.max(1, Math.abs(video.playbackRate || state.lastAppliedRate || 1)) + 0.85);
        const normalForwardAdvance = mediaDelta >= -0.05 && mediaDelta <= maxExpectedDelta;
        if (normalForwardAdvance) state.videoElapsed += Math.max(0, mediaDelta);
      }

      state.lastVideoCurrentTime = currentTime;
    }

    state.lastTickMs = now;
  }

  function updatePhysics() {
    const target = calculateTargetSpeed();
    state.lastTargetSpeed = target;

    if (!shouldApplyRate()) {
      state.currentSpeed = 1;
      state.velocity = 0;
      state.roundingComp = 0;
      state.lastAppliedRate = 1;
      setPlaybackRate(1);
      return 1;
    }

    const diff = target - state.currentSpeed;
    const epsilon = Math.max(0.00001, Math.abs(state.currentSpeed * 1e-6));

    if (Math.abs(diff) < epsilon || Math.abs(diff) < config.snapThreshold) {
      state.currentSpeed = target;
      state.velocity = 0;
      state.roundingComp = 0;
    } else if (Math.abs(diff) > config.autoSyncThreshold) {
      state.currentSpeed = target;
      state.velocity = 0;
      state.roundingComp = 0;
    } else if (config.velocityMode) {
      state.velocity += diff * config.velocityForce;
      state.velocity *= config.velocityFriction;
      state.currentSpeed += state.velocity;

      const overshotUp = diff > 0 && state.currentSpeed > target;
      const overshotDown = diff < 0 && state.currentSpeed < target;
      if (overshotUp || overshotDown) {
        state.currentSpeed = target;
        state.velocity = 0;
      }
    } else {
      state.currentSpeed += diff * config.smoothness;
    }

    let finalSpeed = state.currentSpeed;
    if (config.antiRoundCompensation && Math.abs(finalSpeed - state.lastAppliedRate) < 0.008) {
      state.roundingComp = clamp(state.roundingComp + config.antiRoundForce, 0, 0.015);
      finalSpeed += state.roundingComp;
    } else {
      state.roundingComp *= 0.92;
    }

    finalSpeed = clamp(finalSpeed, 0.25, 16);
    setPlaybackRate(finalSpeed);
    state.lastAppliedRate = finalSpeed;
    return finalSpeed;
  }

  function schedulerLoop(token) {
    if (!state.running || token !== state.schedulerToken) return;

    const now = performance.now();
    updateAccumulators(now);
    const speed = updatePhysics();

    if (now - state.uiLastMs > 90) {
      state.uiLastMs = now;
      updateUI(false);
    }

    if (now - state.graphLastMs > 180) {
      state.graphLastMs = now;
      pushGraphPoint(speed);
      drawGraph(false);
    }

    if (state.video && state.video.requestVideoFrameCallback && !state.video.paused && !state.video.ended) {
      state.video.requestVideoFrameCallback(() => schedulerLoop(token));
    } else {
      state.rafId = requestAnimationFrame(() => schedulerLoop(token));
    }
  }

  function startScheduler() {
    state.schedulerToken++;
    state.running = true;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    schedulerLoop(state.schedulerToken);
  }

  function stopScheduler() {
    state.running = false;
    state.schedulerToken++;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }

  function shouldResetForNewVideo() {
    return Boolean(config.resetOnNewVideo && !config.continueAcrossVideos);
  }

  function keepRampForNewVideo(reason) {
    const now = performance.now();
    state.lastTickMs = now;
    if (state.video) {
      const current = Number(state.video.currentTime) || 0;
      state.videoBaseTime = current;
      state.lastVideoCurrentTime = current;
    }
    state.currentSpeed = clamp(state.currentSpeed || state.lastAppliedRate || config.speedStart || 1, 0.25, 16);
    state.lastTargetSpeed = calculateTargetSpeed();
    setPlaybackRate(config.active ? (state.lastAppliedRate || state.currentSpeed || state.lastTargetSpeed || 1) : 1);
    state.lastStatus = reason;
    updateUI(true);
  }


  function bindVideo(video, reason = 'video-bound') {
    if (!video || state.video === video) return;

    const firstBind = !state.hasBoundVideo;

    if (state.videoAbort) state.videoAbort.abort();
    state.videoAbort = new AbortController();
    const signal = state.videoAbort.signal;
    state.video = video;
    state.hasBoundVideo = true;
    state.lastVideoCurrentTime = Number(video.currentTime) || 0;
    state.videoBaseTime = state.lastVideoCurrentTime;

    video.addEventListener('play', () => {
      state.lastTickMs = performance.now();
      state.lastStatus = 'Oynuyor';
      startScheduler();
    }, { signal });

    video.addEventListener('pause', () => {
      updateAccumulators(performance.now());
      state.lastStatus = 'Duraklatıldı';
      updateUI(true);
    }, { signal });

    video.addEventListener('seeking', () => {
      updateAccumulators(performance.now());
    }, { signal });

    video.addEventListener('seeked', () => {
      const current = Number(video.currentTime) || 0;
      const duration = Number(video.duration) || 0;
      const looksLikeLoop = video.loop && config.loopBehavior === 'continue' && duration > 0 && state.lastVideoCurrentTime > duration - 1.5 && current < 1.5;
      if (!looksLikeLoop && config.resetOnSeek) {
        resetRamp('Seek sonrası reset');
      } else {
        state.videoBaseTime = current;
        state.lastVideoCurrentTime = current;
        state.lastTickMs = performance.now();
        state.lastStatus = looksLikeLoop ? 'Loop devam' : 'Seek yapıldı, hız devam';
        setPlaybackRate(config.active ? (state.lastAppliedRate || state.currentSpeed || 1) : 1);
        updateUI(true);
      }
    }, { signal });

    video.addEventListener('ended', () => {
      updateAccumulators(performance.now());
      if (video.loop && config.loopBehavior === 'continue') {
        state.lastStatus = 'Loop devam';
        updateUI(true);
        return;
      }
      if (config.continueAcrossVideos || !config.resetOnNewVideo) {
        state.lastStatus = 'Video bitti, sonraki videoda devam';
        updateUI(true);
        return;
      }
      resetRamp('Video bitti');
    }, { signal });

    video.addEventListener('loadedmetadata', () => {
      state.lastVideoCurrentTime = Number(video.currentTime) || 0;
      state.videoBaseTime = state.lastVideoCurrentTime;
      if (!firstBind && shouldResetForNewVideo()) resetRamp('Metadata yenilendi');
      else if (!firstBind) keepRampForNewVideo('Metadata yenilendi, hız devam');
    }, { signal });

    video.addEventListener('durationchange', () => updateUI(true), { signal });

    video.addEventListener('ratechange', () => {
      if (!state.applyingRateInternally && config.active && shouldApplyRate()) {
        setPlaybackRate(state.lastAppliedRate || state.currentSpeed || 1);
      }
    }, { signal });

    if (firstBind || shouldResetForNewVideo()) resetRamp(reason);
    else keepRampForNewVideo('Yeni video, hız devam');
    startScheduler();
  }

  function scanForVideo() {
    const found = findVideoElement();
    if (found && found !== state.video) bindVideo(found, 'Video bağlandı');

    const route = getRouteKey();
    if (route !== state.routeKey) {
      const hadRoute = Boolean(state.routeKey);
      state.routeKey = route;
      if (hadRoute && shouldResetForNewVideo()) resetRamp('Yeni sayfa/video');
      else if (hadRoute) keepRampForNewVideo('Sayfa/video geçişi, hız devam');
      updateUI(true);
    }
  }

  function startRouteWatcher() {
    state.routeKey = getRouteKey();
    scanForVideo();

    const observer = new MutationObserver(() => {
      clearTimeout(startRouteWatcher._timer);
      startRouteWatcher._timer = setTimeout(scanForVideo, 120);
    });

    const target = document.getElementById('movie_player') || document.body;
    if (target) observer.observe(target, { childList: true, subtree: true });

    setInterval(scanForVideo, APP.routePollMs);
    window.addEventListener('yt-navigate-start', () => { state.lastStatus = 'YouTube geçiş başladı'; updateUI(true); });
    window.addEventListener('yt-navigate-finish', () => setTimeout(scanForVideo, 120));
    window.addEventListener('yt-page-data-updated', () => setTimeout(scanForVideo, 120));
  }

  function pushGraphPoint(speed) {
    const elapsed = calculateElapsed();
    const point = {
      elapsed,
      speed,
      target: state.lastTargetSpeed,
      bypass: state.bypassReason
    };
    state.history.push(point);
    if (state.history.length > APP.graphMaxPoints) state.history.shift();
  }

  function prepareCanvas() {
    if (!ui.canvas) return false;
    const rect = ui.canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    const w = Math.max(280, Math.floor(rect.width * dpr));
    const h = Math.max(110, Math.floor(rect.height * dpr));
    if (ui.graphW !== w || ui.graphH !== h || ui.dpr !== dpr) {
      ui.dpr = dpr;
      ui.graphW = w;
      ui.graphH = h;
      ui.canvas.width = w;
      ui.canvas.height = h;
      ui.ctx = ui.canvas.getContext('2d');
    }
    return Boolean(ui.ctx);
  }

  function drawGraph(force) {
    if (!ui.canvas || !prepareCanvas()) return;
    const ctx = ui.ctx;
    const w = ui.graphW;
    const h = ui.graphH;
    const padL = 34 * ui.dpr;
    const padR = 10 * ui.dpr;
    const padT = 12 * ui.dpr;
    const padB = 22 * ui.dpr;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(2, 6, 12, 0.94)';
    ctx.fillRect(0, 0, w, h);

    const maxSpeed = Math.max(2, config.speedStart, config.speedEnd, ...state.history.map(p => Math.max(p.speed, p.target))) + 0.25;
    const nowElapsed = calculateElapsed();
    let startTime = 0;
    let endTime = Math.max(config.timeEnd + 5, nowElapsed + 1, 10);
    if (config.graphMode === 'rolling') {
      endTime = Math.max(config.rollingWindow, nowElapsed);
      startTime = Math.max(0, endTime - config.rollingWindow);
    }
    const span = Math.max(1, endTime - startTime);
    const visible = state.history.filter(p => p.elapsed >= startTime - 0.5 && p.elapsed <= endTime + 0.5);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.11)';
    ctx.lineWidth = 1 * ui.dpr;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${10 * ui.dpr}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH * i / 4);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      const speedLabel = maxSpeed * (1 - i / 4);
      ctx.fillText(`${speedLabel.toFixed(1)}x`, padL - 6 * ui.dpr, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const x = padL + (plotW * i / 4);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, h - padB);
      ctx.stroke();
      const timeLabel = startTime + span * i / 4;
      ctx.fillText(`${Math.round(timeLabel)}s`, x, h - padB + 6 * ui.dpr);
    }
    ctx.restore();

    const xOf = (t) => padL + ((t - startTime) / span) * plotW;
    const yOf = (speed) => padT + (1 - clamp(speed / maxSpeed, 0, 1)) * plotH;

    function drawVerticalMarker(t, color) {
      if (t < startTime || t > endTime) return;
      const x = xOf(t);
      ctx.save();
      ctx.setLineDash([4 * ui.dpr, 6 * ui.dpr]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 * ui.dpr;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, h - padB);
      ctx.stroke();
      ctx.restore();
    }

    drawVerticalMarker(config.timeStart, 'rgba(255, 220, 100, 0.45)');
    drawVerticalMarker(config.timeEnd, 'rgba(255, 120, 120, 0.45)');

    function drawLine(key, color, width, dash) {
      if (visible.length < 2) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width * ui.dpr;
      if (dash) ctx.setLineDash(dash.map(v => v * ui.dpr));
      ctx.beginPath();
      visible.forEach((p, i) => {
        const x = xOf(p.elapsed);
        const y = yOf(p[key]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    }

    drawLine('target', 'rgba(81, 162, 255, 0.95)', 1.3, [5, 5]);
    drawLine('speed', 'rgba(0, 255, 145, 0.98)', 2.2, null);

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = `${10 * ui.dpr}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`speed`, padL + 8 * ui.dpr, padT + 8 * ui.dpr);
    ctx.fillStyle = 'rgba(81,162,255,0.85)';
    ctx.fillText(`target`, padL + 58 * ui.dpr, padT + 8 * ui.dpr);
    ctx.restore();
  }

  function smartProfileForDuration() {
    const video = state.video;
    const duration = video && Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration) return { timeStart: 0, timeEnd: 45, speedStart: 1, speedEnd: 1.8, curveMode: 'softstart' };
    if (duration <= 300) return { timeStart: 0, timeEnd: 8, speedStart: 1.1, speedEnd: 1.75, curveMode: 'smooth' };
    if (duration <= 1200) return { timeStart: 0, timeEnd: 30, speedStart: 1, speedEnd: 2, curveMode: 'exact' };
    if (duration <= 3600) return { timeStart: 10, timeEnd: 90, speedStart: 1, speedEnd: 2.25, curveMode: 'softstart' };
    return { timeStart: 15, timeEnd: 120, speedStart: 1.15, speedEnd: 2.5, curveMode: 'softstart' };
  }

  function updateUI(force) {
    if (!ui.host) return;

    const video = state.video;
    const elapsed = calculateElapsed();
    const saved = Math.max(0, state.virtualMediaAdvanced - state.realPlayingElapsed);
    const avg = state.realPlayingElapsed > 0 ? state.virtualMediaAdvanced / state.realPlayingElapsed : state.currentSpeed;
    const bypass = state.bypassReason || detectBypassReason();
    const activeTone = config.active && !bypass ? 'good' : (bypass ? 'warn' : 'idle');

    setText('speedNow', `${fmt(state.currentSpeed, config.precisionDisplay)}x`);
    setText('targetNow', `${fmt(state.lastTargetSpeed, 3)}x`);
    setText('elapsedNow', fmtTime(elapsed));
    setText('avgNow', `${fmt(avg, 2)}x`);
    setText('savedNow', fmtTime(saved));
    setText('videoNow', video ? (video.paused ? 'pause' : 'play') : 'yok');
    setText('modeNow', config.timerMode === 'playing' ? 'oynarken' : (config.timerMode === 'video' ? 'video zamanı' : 'gerçek zaman'));
    setText('statusText', bypass ? `Bypass: ${bypass}` : state.lastStatus);
    setText('miniSpeed', `${fmt(state.currentSpeed, 3)}x`);
    setText('miniTarget', `${fmt(state.lastTargetSpeed, 2)}x`);
    setText('miniElapsed', fmtTime(elapsed));
    setText('miniSaved', fmtTime(saved));

    setBadge('activeBadge', config.active ? 'ACTIVE' : 'OFF', activeTone);
    setBadge('bypassBadge', bypass ? bypass.toUpperCase() : 'READY', bypass ? 'warn' : 'good');

    const activeBtn = ui.els.activeToggle;
    if (activeBtn) {
      activeBtn.textContent = config.active ? '⚡ Aktif' : '⏸️ Pasif';
      activeBtn.dataset.active = config.active ? 'true' : 'false';
    }

    if (ui.panel) {
      ui.panel.style.display = config.panelVisible ? 'block' : 'none';
      ui.panel.dataset.minimized = config.panelMinimized ? 'true' : 'false';
    }

    if (ui.mini) {
      const shouldShowMini = config.miniHudEnabled && !config.panelVisible;
      ui.mini.style.display = shouldShowMini ? 'grid' : 'none';
    }

    const progress = elapsed <= config.timeStart ? 0 : elapsed >= config.timeEnd ? 1 : (elapsed - config.timeStart) / Math.max(0.001, config.timeEnd - config.timeStart);
    if (ui.els.progressFill) ui.els.progressFill.style.width = `${clamp(progress, 0, 1) * 100}%`;

    if (force) drawGraph(true);
  }

  function syncFormFromConfig() {
    Object.entries(ui.els).forEach(([key, el]) => {
      if (!el || !el.dataset || !el.dataset.config) return;
      const cKey = el.dataset.config;
      if (!(cKey in config)) return;
      if (el.type === 'checkbox') el.checked = Boolean(config[cKey]);
      else el.value = config[cKey];
    });
    if (ui.els.helpBox) ui.els.helpBox.style.display = config.showHelp ? 'block' : 'none';
  }

  function inputRow(label, key, type = 'number', attrs = '') {
    const id = `gholl-accel-input-${key}`;
    if (type === 'checkbox') {
      return `<label class="gholl-accel-check"><input id="${id}" data-config="${key}" type="checkbox"> <span>${label}</span></label>`;
    }
    return `<label class="gholl-accel-field"><span>${label}</span><input id="${id}" data-config="${key}" type="${type}" ${attrs}></label>`;
  }

  function selectRow(label, key, options) {
    const id = `gholl-accel-input-${key}`;
    const opts = options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('');
    return `<label class="gholl-accel-field"><span>${label}</span><select id="${id}" data-config="${key}">${opts}</select></label>`;
  }

  function mountUI() {
    if (document.getElementById('gholl-accel-root')) return;

    const root = document.createElement('div');
    root.id = 'gholl-accel-root';
    root.innerHTML = `
      <section id="gholl-accel-panel" class="gholl-accel-panel" data-minimized="false">
        <header id="gholl-accel-header" class="gholl-accel-header">
          <div class="gholl-accel-title-wrap">
            <div class="gholl-accel-title">GHOLL-ACCEL <b>v1.0</b></div>
            <div class="gholl-accel-subtitle">oturum-devamlı hız ramp motoru</div>
          </div>
          <div class="gholl-accel-badges">
            <span id="gholl-accel-activeBadge" class="gholl-accel-badge" data-tone="idle">OFF</span>
            <span id="gholl-accel-bypassBadge" class="gholl-accel-badge" data-tone="good">READY</span>
          </div>
          <div class="gholl-accel-window-buttons">
            <button id="gholl-accel-panic" title="Acil 1.0x">1x</button>
            <button id="gholl-accel-minimize" title="Küçült">▾</button>
            <button id="gholl-accel-close" title="Paneli gizle">×</button>
          </div>
        </header>

        <main id="gholl-accel-content" class="gholl-accel-content">
          <div class="gholl-accel-hero">
            <div>
              <div class="gholl-accel-speed" id="gholl-accel-speedNow">1.0000x</div>
              <div class="gholl-accel-status" id="gholl-accel-statusText">Hazır</div>
            </div>
            <button id="gholl-accel-activeToggle" class="gholl-accel-primary" data-active="false">⏸️ Pasif</button>
          </div>

          <div class="gholl-accel-progress"><div id="gholl-accel-progressFill"></div></div>

          <div class="gholl-accel-stats">
            <div><span>Hedef</span><b id="gholl-accel-targetNow">1.000x</b></div>
            <div><span>Süre</span><b id="gholl-accel-elapsedNow">0:00</b></div>
            <div><span>Ort.</span><b id="gholl-accel-avgNow">1.00x</b></div>
            <div><span>Kazanç</span><b id="gholl-accel-savedNow">0:00</b></div>
            <div><span>Video</span><b id="gholl-accel-videoNow">yok</b></div>
            <div><span>Mod</span><b id="gholl-accel-modeNow">oynarken</b></div>
          </div>

          <nav class="gholl-accel-tabs">
            <button data-tab="speed" class="active">Hız</button>
            <button data-tab="smart">Akıllı</button>
            <button data-tab="settings">Ayar</button>
          </nav>

          <section class="gholl-accel-tab active" data-tab-panel="speed">
            <div class="gholl-accel-grid2">
              ${inputRow('t0 başlangıç sn', 'timeStart', 'number', 'min="0" max="999" step="1"')}
              ${inputRow('t1 bitiş sn', 'timeEnd', 'number', 'min="1" max="999" step="1"')}
              ${inputRow('v0 başlangıç hız', 'speedStart', 'number', 'min="0.25" max="16" step="0.05"')}
              ${inputRow('v1 hedef hız', 'speedEnd', 'number', 'min="0.25" max="16" step="0.05"')}
              ${inputRow('snap threshold', 'snapThreshold', 'number', 'min="0" max="0.1" step="0.0001"')}
              ${inputRow('rolling window sn', 'rollingWindow', 'number', 'min="10" max="600" step="5"')}
            </div>
            <div class="gholl-accel-grid2">
              ${selectRow('Eğri', 'curveMode', [['exact','Exact'], ['softstart','Softstart'], ['smooth','Smooth']])}
              ${selectRow('Zaman ölçümü', 'timerMode', [['playing','Sadece oynarken'], ['video','Video zamanı'], ['real','Gerçek zaman']])}
            </div>
            <div class="gholl-accel-button-row">
              <button id="gholl-accel-resetRamp">↻ Ramp reset</button>
              <button id="gholl-accel-smartDuration">⚙ Süreye göre ayarla</button>
            </div>
          </section>

          <section class="gholl-accel-tab" data-tab-panel="smart">
            <div class="gholl-accel-presets">
              ${Object.entries(PRESETS).map(([key, item]) => `
                <button data-preset="${key}"><b>${item.title}</b><span>${item.description}</span></button>
              `).join('')}
            </div>
            <canvas id="gholl-accel-graph" class="gholl-accel-graph"></canvas>
          </section>

          <section class="gholl-accel-tab" data-tab-panel="settings">
            <div class="gholl-accel-grid2">
              ${selectRow('Grafik modu', 'graphMode', [['rolling','Rolling'], ['full','Full']])}
              ${selectRow('Loop davranışı', 'loopBehavior', [['continue','Loopta devam'], ['reset','Loopta reset']])}
              ${inputRow('Sonraki videoda hız/ramp devam', 'continueAcrossVideos', 'checkbox')}
            </div>
            <div class="gholl-accel-checks">
              ${inputRow('Reklamlarda 1.0x / bypass', 'disableOnAds', 'checkbox')}
              ${inputRow('Shorts için devre dışı bırak', 'disableOnShorts', 'checkbox')}
              ${inputRow('Canlı yayında devre dışı bırak', 'disableOnLive', 'checkbox')}
              ${inputRow('Seek sonrası ramp resetle', 'resetOnSeek', 'checkbox')}
              ${inputRow('Yeni videoda ramp resetle', 'resetOnNewVideo', 'checkbox')}
              ${inputRow('Mini HUD açık', 'miniHudEnabled', 'checkbox')}
              ${inputRow('Kısayollar açık', 'shortcutsEnabled', 'checkbox')}
              ${inputRow('Ses tonunu koru', 'preservePitch', 'checkbox')}
              ${inputRow('Mikro hız telafisi', 'antiRoundCompensation', 'checkbox')}
            </div>
            <div class="gholl-accel-button-row">
              <button id="gholl-accel-export">Config kopyala</button>
              <button id="gholl-accel-import">Config içe al</button>
              <button id="gholl-accel-resetConfig">Ayarları sıfırla</button>
              <button id="gholl-accel-helpToggle">?</button>
            </div>
            <div id="gholl-accel-helpBox" class="gholl-accel-help">
              <b>Kısayollar</b><br>
              Shift + A: aktif/pasif<br>
              Shift + R: ramp reset<br>
              Shift + S: panel/mini HUD<br>
              Shift + D: panel konum sıfırla<br>
              Shift + X: acil 1.0x<br>
              Shift + ↑/↓: hedef hızı değiştir
            </div>
          </section>
        </main>
      </section>

      <section id="gholl-accel-mini" class="gholl-accel-mini" title="Paneli aç">
        <b id="gholl-accel-miniSpeed">1.000x</b>
        <span>🎯 <em id="gholl-accel-miniTarget">1.00x</em></span>
        <span>⏱ <em id="gholl-accel-miniElapsed">0:00</em></span>
        <span>+<em id="gholl-accel-miniSaved">0:00</em></span>
      </section>
    `;

    document.body.appendChild(root);
    ui.host = root;
    ui.panel = document.getElementById('gholl-accel-panel');
    ui.header = document.getElementById('gholl-accel-header');
    ui.content = document.getElementById('gholl-accel-content');
    ui.mini = document.getElementById('gholl-accel-mini');
    ui.canvas = document.getElementById('gholl-accel-graph');

    const ids = [
      'speedNow','targetNow','elapsedNow','avgNow','savedNow','videoNow','modeNow','statusText','activeBadge','bypassBadge','activeToggle','progressFill','miniSpeed','miniTarget','miniElapsed','miniSaved','helpBox'
    ];
    ids.forEach((id) => { ui.els[id] = document.getElementById(`gholl-accel-${id}`); });

    root.querySelectorAll('[data-config]').forEach((el) => {
      ui.els[`cfg_${el.dataset.config}`] = el;
      el.addEventListener('change', onConfigInput);
      el.addEventListener('input', onConfigInput);
    });

    root.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });

    root.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });

    document.getElementById('gholl-accel-activeToggle').addEventListener('click', toggleActive);
    document.getElementById('gholl-accel-resetRamp').addEventListener('click', () => resetRamp('Manuel ramp reset'));
    document.getElementById('gholl-accel-panic').addEventListener('click', panicReset);
    document.getElementById('gholl-accel-close').addEventListener('click', hidePanel);
    document.getElementById('gholl-accel-minimize').addEventListener('click', toggleMinimize);
    document.getElementById('gholl-accel-smartDuration').addEventListener('click', applySmartDuration);
    document.getElementById('gholl-accel-export').addEventListener('click', exportConfig);
    document.getElementById('gholl-accel-import').addEventListener('click', importConfig);
    document.getElementById('gholl-accel-resetConfig').addEventListener('click', resetConfig);
    document.getElementById('gholl-accel-helpToggle').addEventListener('click', toggleHelp);
    ui.mini.addEventListener('click', showPanel);

    ui.header.addEventListener('pointerdown', onDragStart);
    window.addEventListener('resize', () => {
      clampPanelPosition();
      drawGraph(true);
    });

    applyPanelPosition();
    syncFormFromConfig();
    updateUI(true);
  }

  function onConfigInput(event) {
    const el = event.currentTarget;
    const key = el.dataset.config;
    if (!key) return;

    let value;
    if (el.type === 'checkbox') value = Boolean(el.checked);
    else if (el.tagName === 'SELECT') value = el.value;
    else value = Number(el.value);

    config[key] = value;
    config = sanitizeConfig(config);
    syncFormFromConfig();
    saveConfigDebounced();
    if (['timeStart','timeEnd','speedStart','speedEnd','timerMode','curveMode'].includes(key)) resetRamp('Ayar değişti');
    else updateUI(true);
  }

  function activateTab(name) {
    if (!ui.host) return;
    ui.host.querySelectorAll('[data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
    ui.host.querySelectorAll('[data-tab-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.tabPanel === name));
    if (name === 'smart') setTimeout(() => drawGraph(true), 50);
  }

  function applyPreset(name) {
    const item = PRESETS[name];
    if (!item) return;
    Object.assign(config, item.config);
    config = sanitizeConfig(config);
    syncFormFromConfig();
    saveConfigNow();
    resetRamp(`${item.title} preset`);
  }

  function applySmartDuration() {
    Object.assign(config, smartProfileForDuration());
    config = sanitizeConfig(config);
    syncFormFromConfig();
    saveConfigNow();
    resetRamp('Süreye göre ayarlandı');
  }

  function toggleActive() {
    config.active = !config.active;
    if (!config.active) {
      state.currentSpeed = 1;
      state.velocity = 0;
      setPlaybackRate(1);
    } else {
      resetRamp('Aktif edildi');
    }
    saveConfigNow();
    updateUI(true);
  }

  function showPanel() {
    config.panelVisible = true;
    saveConfigNow();
    updateUI(true);
  }

  function hidePanel() {
    config.panelVisible = false;
    saveConfigNow();
    updateUI(true);
  }

  function toggleMinimize() {
    config.panelMinimized = !config.panelMinimized;
    saveConfigNow();
    updateUI(true);
  }

  function toggleHelp() {
    config.showHelp = !config.showHelp;
    saveConfigNow();
    syncFormFromConfig();
  }

  async function exportConfig() {
    const text = JSON.stringify(config, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      state.lastStatus = 'Config panoya kopyalandı';
    } catch (_) {
      window.prompt('Config JSON:', text);
      state.lastStatus = 'Config gösterildi';
    }
    updateUI(true);
  }

  function importConfig() {
    const raw = window.prompt('Config JSON yapıştır:');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      config = sanitizeConfig(parsed);
      saveConfigNow();
      syncFormFromConfig();
      resetRamp('Config içe alındı');
    } catch (_) {
      state.lastStatus = 'Config JSON hatalı';
      updateUI(true);
    }
  }

  function resetConfig() {
    const ok = window.confirm('GHOLL-ACCEL ayarları sıfırlansın mı?');
    if (!ok) return;
    config = sanitizeConfig({ ...DEFAULT_CONFIG });
    saveConfigNow();
    applyPanelPosition();
    syncFormFromConfig();
    resetRamp('Ayarlar sıfırlandı');
  }

  function applyPanelPosition() {
    if (!ui.panel) return;
    if (config.panelLeft !== null && config.panelTop !== null) {
      ui.panel.style.left = `${config.panelLeft}px`;
      ui.panel.style.top = `${config.panelTop}px`;
      ui.panel.style.right = 'auto';
      ui.panel.style.bottom = 'auto';
      setTimeout(clampPanelPosition, 30);
    } else {
      ui.panel.style.left = 'auto';
      ui.panel.style.top = 'auto';
      ui.panel.style.right = '22px';
      ui.panel.style.bottom = '72px';
    }
  }

  function clampPanelPosition() {
    if (!ui.panel) return;
    const rect = ui.panel.getBoundingClientRect();
    if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return;

    let left = rect.left;
    let top = rect.top;
    const maxLeft = Math.max(0, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(0, window.innerHeight - rect.height - 8);
    left = clamp(left, 8, Math.max(8, maxLeft));
    top = clamp(top, 8, Math.max(8, maxTop));

    ui.panel.style.left = `${left}px`;
    ui.panel.style.top = `${top}px`;
    ui.panel.style.right = 'auto';
    ui.panel.style.bottom = 'auto';
    config.panelLeft = Math.round(left);
    config.panelTop = Math.round(top);
  }

  function resetPanelPosition() {
    config.panelLeft = null;
    config.panelTop = null;
    applyPanelPosition();
    saveConfigNow();
  }

  function onDragStart(event) {
    if (!ui.panel || event.button !== 0) return;
    if (event.target.closest('button')) return;
    event.preventDefault();

    const rect = ui.panel.getBoundingClientRect();
    state.drag.active = true;
    state.drag.pointerId = event.pointerId;
    state.drag.startX = event.clientX;
    state.drag.startY = event.clientY;
    state.drag.originLeft = rect.left;
    state.drag.originTop = rect.top;

    ui.header.setPointerCapture(event.pointerId);
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd, { once: true });
  }

  function onDragMove(event) {
    if (!state.drag.active || !ui.panel) return;
    const dx = event.clientX - state.drag.startX;
    const dy = event.clientY - state.drag.startY;
    ui.panel.style.left = `${state.drag.originLeft + dx}px`;
    ui.panel.style.top = `${state.drag.originTop + dy}px`;
    ui.panel.style.right = 'auto';
    ui.panel.style.bottom = 'auto';
  }

  function onDragEnd() {
    if (!state.drag.active) return;
    state.drag.active = false;
    window.removeEventListener('pointermove', onDragMove);
    clampPanelPosition();
    saveConfigNow();
  }

  function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName ? target.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  function onKeyDown(event) {
    if (!config.shortcutsEnabled || !event.shiftKey || isTypingTarget(event.target)) return;

    const key = event.key.toLowerCase();
    if (key === 'a') {
      event.preventDefault();
      toggleActive();
    } else if (key === 'r') {
      event.preventDefault();
      resetRamp('Kısayol reset');
    } else if (key === 's') {
      event.preventDefault();
      config.panelVisible ? hidePanel() : showPanel();
    } else if (key === 'd') {
      event.preventDefault();
      resetPanelPosition();
    } else if (key === 'x') {
      event.preventDefault();
      panicReset();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      config.speedEnd = clamp(config.speedEnd + config.shortcutStep, 0.25, 16);
      syncFormFromConfig();
      saveConfigNow();
      updateUI(true);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      config.speedEnd = clamp(config.speedEnd - config.shortcutStep, 0.25, 16);
      syncFormFromConfig();
      saveConfigNow();
      updateUI(true);
    }
  }

  function setupMessages() {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return;
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || message.app !== 'GHOLL_ACCEL') return false;

        if (message.type === 'status') {
          sendResponse({
            ok: true,
            active: config.active,
            panelVisible: config.panelVisible,
            speed: state.currentSpeed,
            target: state.lastTargetSpeed,
            status: state.bypassReason ? `Bypass: ${state.bypassReason}` : state.lastStatus,
            version: APP.version
          });
          return true;
        }

        if (message.type === 'toggle-active') {
          toggleActive();
          sendResponse({ ok: true, active: config.active });
          return true;
        }

        if (message.type === 'toggle-panel') {
          config.panelVisible ? hidePanel() : showPanel();
          sendResponse({ ok: true, panelVisible: config.panelVisible });
          return true;
        }

        if (message.type === 'panic') {
          panicReset();
          sendResponse({ ok: true });
          return true;
        }

        if (message.type === 'reset-ramp') {
          resetRamp('Popup reset');
          sendResponse({ ok: true });
          return true;
        }

        return false;
      });
    } catch (_) {}
  }

  async function init() {
    await loadConfig();
    mountUI();
    setupMessages();
    startRouteWatcher();
    startScheduler();
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('visibilitychange', () => {
      updateUI(true);
    });
    scanForVideo();
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
