/* TravelPro commercial experience · GSAP 3.14.2 + ScrollTrigger.
 * The background film is authored and rendered with HyperFrames.
 * Navigation remains usable without animation or a playing video. */
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const viewport = $('.results-window');
  const track = $('.results-track');
  const cards = $$('.result-card');
  const chapters = $$('[data-step]');
  const previous = $('#previous');
  const next = $('#next');
  const counter = $('#step-counter');
  const announcement = $('#step-announcement');
  const film = $('.hero-film');
  const motionButton = $('#motion-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const labels = cards.map((card) => card.querySelector('h2').innerText.replace(/\n/g, ' '));
  const motion = window.gsap;
  let active = 0;
  let scene = null;
  let intro = null;
  let navigation = null;
  let manuallyPaused = false;
  let heroVisible = true;
  let hasIntroduced = false;
  let announcementTimer;
  let scrollTimer;
  let galleryEntrance = null;
  let heroLoop = null;
  let heroScrollEffects = [];
  let motionOptIn = false;
  let filmPlayPending = false;

  const overflow = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
  const animationsPaused = () => manuallyPaused || (reducedMotion.matches && !motionOptIn);

  function buildHeroLoop(desktop) {
    const spread = desktop ? 29 : 18;
    const loop = motion.timeline({ paused: true, repeat: -1 });
    loop.fromTo('.campaign-float', { y: 0, rotation: -0.6 }, { y: -18, rotation: 1.2, duration: 3.6, ease: 'sine.inOut' }, 0)
      .to('.campaign-float', { y: 0, rotation: -0.6, duration: 3.6, ease: 'sine.inOut' }, 3.6)
      .fromTo('.companion-feed', { x: 7, y: 7, rotation: -5, opacity: 0.85 }, { x: -spread, y: 12, rotation: -12, opacity: 1, duration: 1.8, ease: 'power2.inOut' }, 0.2)
      .to('.companion-feed', { x: 7, y: 7, rotation: -5, opacity: 0.85, duration: 2.3, ease: 'power2.inOut' }, 4.9)
      .fromTo('.companion-story', { x: -6, y: 7, rotation: 4, opacity: 0.85 }, { x: spread, y: -15, rotation: 11, opacity: 1, duration: 2.1, ease: 'power3.inOut' }, 0.65)
      .to('.companion-story', { x: -6, y: 7, rotation: 4, opacity: 0.85, duration: 2.4, ease: 'power3.inOut' }, 4.8)
      .fromTo('.campaign-sheen', { xPercent: -110, opacity: 0 }, { xPercent: 100, opacity: 0.55, duration: 2, ease: 'none' }, 1.2)
      .to('.campaign-sheen', { opacity: 0, duration: 0.3 }, 3.2)
      .set('.campaign-sheen', { xPercent: -110 }, 6.9);

    $$('.route-signal').forEach((path, i) => {
      const length = path.getTotalLength();
      const start = 0.45 + i * 1.75;
      const channel = $$('.channel-row > span')[i];
      motion.set(path, { strokeDasharray: `14 ${length + 30}`, opacity: 0 });
      loop.fromTo(path, { strokeDashoffset: 17, opacity: 0 }, { opacity: 1, duration: 0.18 }, start)
        .to(path, { strokeDashoffset: -length - 14, duration: 1.35, ease: 'none' }, start)
        .to(path, { opacity: 0, duration: 0.18 }, start + 1.25)
        .to(channel, { backgroundColor: 'rgba(255, 112, 56, 0.2)', color: '#ffffff', duration: 0.3, ease: 'power1.out' }, start + 0.85)
        .to(channel.querySelector('svg'), { scale: 1.25, filter: 'drop-shadow(0 0 7px rgba(255, 140, 72, 0.75))', duration: 0.35, ease: 'back.out(1.3)' }, start + 0.9)
        .to(channel, { backgroundColor: 'rgba(255, 112, 56, 0)', color: '#e5e9e4', duration: 0.65, ease: 'power1.inOut' }, start + 1.25)
        .to(channel.querySelector('svg'), { scale: 1, filter: 'drop-shadow(0 0 0px rgba(255, 140, 72, 0))', duration: 0.7, ease: 'power2.out' }, start + 1.3);
    });
    return loop;
  }

  function setActive(index, speak = false) {
    index = Math.max(0, Math.min(cards.length - 1, index));
    const changed = active !== index;
    active = index;
    chapters.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    cards.forEach((card, i) => card.classList.toggle('is-current', i === index));
    previous.disabled = index === 0;
    next.disabled = index === cards.length - 1;
    counter.innerHTML = `${String(index + 1).padStart(2, '0')} <span>/ 05</span>`;
    if (changed && motion && !animationsPaused()) {
      const deliverable = cards[index].querySelector('.deliverable');
      motion.killTweensOf(deliverable);
      motion.fromTo(deliverable, { y: 13, rotationX: 2 }, { y: 0, rotationX: 0, duration: 0.95, ease: 'power3.out', overwrite: true });
    }
    if (changed || speak) {
      clearTimeout(announcementTimer);
      announcementTimer = setTimeout(() => {
        announcement.textContent = `${index + 1} de ${cards.length}. ${labels[index]}`;
      }, 180);
    }
  }

  function cancelNavigation() {
    navigation?.kill();
    navigation = null;
  }

  function scrollPage(target, onComplete) {
    cancelNavigation();
    if (motion && !animationsPaused()) {
      const position = { y: window.scrollY };
      navigation = motion.to(position, {
        y: target, duration: 1.05, ease: 'power3.inOut',
        onUpdate: () => window.scrollTo(0, position.y),
        onComplete: () => { navigation = null; onComplete?.(); }
      });
    } else {
      window.scrollTo(0, target);
      scene?.update();
      scene?.getTween()?.progress?.(1);
      onComplete?.();
    }
  }

  function goTo(index, focusResults = false) {
    index = Math.max(0, Math.min(cards.length - 1, index));
    cancelNavigation();
    if (scene) {
      const target = scene.start + (scene.end - scene.start) * index / (cards.length - 1);
      scrollPage(target, () => setActive(index, true));
    } else {
      const left = Math.min(overflow(), cards[index].offsetLeft - cards[0].offsetLeft);
      viewport.scrollTo({ left, behavior: animationsPaused() ? 'instant' : 'smooth' });
      setActive(index, true);
      if (focusResults) $('.results-stage').scrollIntoView({ block: 'start', behavior: animationsPaused() ? 'instant' : 'smooth' });
    }
  }

  chapters.forEach((button) => button.addEventListener('click', () => goTo(Number(button.dataset.step))));
  previous.addEventListener('click', () => goTo(active - 1));
  next.addEventListener('click', () => goTo(active + 1));
  $$('.experience-link, .explore-cue, .skip').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    goTo(0, true);
    if (link.classList.contains('skip')) $('#resultados').focus({ preventScroll: true });
  }));
  $('.brand').addEventListener('click', (event) => {
    event.preventDefault();
    scrollPage(0, () => setActive(0));
  });

  window.addEventListener('wheel', cancelNavigation, { passive: true });
  window.addEventListener('touchstart', cancelNavigation, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (event.key === 'Home') scrollPage(0, () => setActive(0));
      else goTo(cards.length - 1, true);
    } else if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(event.key)) cancelNavigation();
  });

  viewport.addEventListener('scroll', () => {
    if (scene) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const max = overflow();
      if (max < 2) return;
      const x = viewport.scrollLeft;
      let nearest = 0;
      let distance = Infinity;
      cards.forEach((card, i) => {
        const d = Math.abs(Math.min(max, card.offsetLeft - cards[0].offsetLeft) - x);
        if (d < distance) { nearest = i; distance = d; }
      });
      // Several cards can share the last available position on wide screens.
      // Keep an explicitly chosen card if it is already in that visible group.
      const selectedX = Math.min(max, cards[active].offsetLeft - cards[0].offsetLeft);
      if (Math.abs(selectedX - x) > 4) setActive(nearest);
    }, 100);
  }, { passive: true });

  async function syncMotion() {
    const paused = animationsPaused();
    const running = !paused && !document.hidden && heroVisible;
    document.body.classList.toggle('motion-paused', paused);
    document.body.classList.toggle('motion-opt-in', motionOptIn);
    document.body.dataset.heroMotion = running ? 'playing' : 'paused';
    motionButton.setAttribute('aria-pressed', String(paused));
    const label = reducedMotion.matches && !motionOptIn ? 'Ativar animação' : paused ? 'Retomar animação' : 'Pausar animação';
    motionButton.setAttribute('aria-label', label);
    motionButton.querySelector('span').textContent = label;
    motionButton.disabled = false;
    heroLoop?.paused(!running);
    heroScrollEffects.forEach((effect) => {
      if (paused) effect.scrollTrigger?.disable(false);
      else effect.scrollTrigger?.enable(false, false);
    });
    if (!running || navigator.connection?.saveData) {
      film.pause();
      return;
    }
    if (!film.getAttribute('src')) film.src = film.dataset.src;
    if (!film.paused || filmPlayPending) return;
    filmPlayPending = true;
    try {
      await film.play();
      if (animationsPaused() || document.hidden || !heroVisible) film.pause();
      else film.classList.add('is-ready');
    } catch { /* The GSAP composition keeps moving if video autoplay is unavailable. */ }
    finally { filmPlayPending = false; }
  }
  film.addEventListener('error', () => film.classList.remove('is-ready'));
  motionButton.addEventListener('click', () => {
    if (reducedMotion.matches && !motionOptIn) { motionOptIn = true; manuallyPaused = false; }
    else manuallyPaused = !manuallyPaused;
    if (manuallyPaused) {
      intro?.progress(1);
      galleryEntrance?.progress(1);
      if (motion) {
        motion.killTweensOf($$('.deliverable'));
        motion.set($$('.deliverable'), { y: 0, rotationX: 0 });
      }
      scene?.getTween()?.progress?.(1);
    }
    if (scene) scene.scrubDuration(manuallyPaused ? 0 : 0.7);
    syncMotion();
  });
  document.addEventListener('visibilitychange', syncMotion);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting && entry.intersectionRatio > 0.1;
      syncMotion();
    }, { threshold: [0, 0.1] }).observe($('.hero'));
  }

  if (motion && window.ScrollTrigger) {
    motion.registerPlugin(window.ScrollTrigger);
    const media = motion.matchMedia();
    media.add({ desktop: '(min-width: 901px) and (min-height: 620px)', reduce: '(prefers-reduced-motion: reduce)', all: 'all' }, (context) => {
      const { desktop, reduce } = context.conditions;
      heroLoop = buildHeroLoop(desktop);
      viewport.scrollLeft = 0;
      setActive(0);
      if (!reduce && !manuallyPaused && !hasIntroduced) {
        hasIntroduced = true;
        intro = motion.timeline({ defaults: { ease: 'power3.out' } });
        intro.from('.title-line > span', { yPercent: 108, rotation: 1, duration: 1.3, stagger: 0.14 }, 0.12)
          .from('.hero-subtitle, .explore-cue', { opacity: 0, y: 18, duration: 1, stagger: 0.15 }, 0.7)
          .from('.campaign-poster', { opacity: 0, y: 40, rotationY: -9, rotationZ: 1, scale: 0.97, duration: 1.55 }, 0.45)
          .from('.campaign-motion', { opacity: 0, duration: 1.1 }, 0.35)
          .from('.route-base', { strokeDashoffset: 500, duration: 1.5, ease: 'power2.inOut' }, 1.0)
          .from('.channel-row > span, .distribution > p', { opacity: 0, y: 9, duration: 0.85, stagger: 0.09 }, 1.6);
      }
      if (desktop && !reduce) {
        document.body.classList.add('is-animated');
        galleryEntrance = motion.from(cards, {
          opacity: 0, y: 34, rotationX: 3, duration: 1.15, stagger: 0.09, ease: 'power3.out',
          scrollTrigger: { trigger: '.results-stage', start: 'top 88%', once: true }
        });
        const timeline = motion.timeline({
          scrollTrigger: {
            trigger: '.results-stage', start: () => `top ${$('.site-header').offsetHeight}px`,
            end: () => `+=${Math.max(1200, overflow() * 1.35)}`,
            pin: true, scrub: manuallyPaused ? true : 0.7,
            anticipatePin: 1, invalidateOnRefresh: true
          }
        });
        timeline.to(track, { x: () => -overflow(), ease: 'none', duration: 1 });
        timeline.eventCallback('onUpdate', () => setActive(Math.round(timeline.progress() * (cards.length - 1))));
        scene = timeline.scrollTrigger;
        heroScrollEffects.push(motion.to('.hero-background', {
          scale: 1.04, yPercent: 2, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.7 }
        }));
        heroScrollEffects.push(motion.to('.campaign-stage', {
          y: -22, rotation: 1, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.7 }
        }));
      }
      syncMotion();
      return () => {
        cancelNavigation();
        document.body.classList.remove('is-animated');
        scene = null;
        heroLoop = null;
        heroScrollEffects = [];
      };
    });
    document.fonts.ready.then(() => window.ScrollTrigger.refresh());
    window.addEventListener('load', () => window.ScrollTrigger.refresh(), { once: true });
  } else {
    syncMotion();
    reducedMotion.addEventListener('change', syncMotion);
  }
})();
