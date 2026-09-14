(() => {
  'use strict';
  const scenes = [...document.querySelectorAll('.scene')];
  const track = document.querySelector('.track');
  const nav = [...document.querySelectorAll('#journey-nav button')];
  const previous = document.querySelector('#previous'), next = document.querySelector('#next');
  const counter = document.querySelector('#counter'), announcement = document.querySelector('#chapter-announcement');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const total = scenes.length, duration = total - .10;
  const compact = matchMedia('(max-width: 760px), (max-height: 560px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = t => t * t * t * (t * (t * 6 - 15) + 10);
  let active = -1, range = 1, width = innerWidth;
  let target = 0, rendered = 0, frame = 0, previousTime = 0;
  const introStart = performance.now();
  let introProgress = 0, requestedStep = null;
  const layers = [], motionSupported = typeof Element.prototype.animate === 'function';

  // Paused native animations are scrubbed by scroll. Native wheel and touch scrolling stay intact.
  function layer(element, scene, start, span, keyframes) {
    if (!element || !motionSupported) return;
    const animation = element.animate(keyframes, { duration: 1000, fill: 'both', easing: 'cubic-bezier(.19,1,.22,1)' });
    animation.pause(); animation.currentTime = 0;
    layers.push({ animation, scene, start, span, last: -1 });
  }
  function reveal(element, scene, start, span = .34, x = 0, y = 28, scale = .98) {
    layer(element, scene, start, span, [
      { opacity: 0, translate: `${x}px ${y}px`, scale: String(scale), filter: 'blur(2px)' },
      { opacity: 1, translate: '0px 0px', scale: '1', filter: 'blur(0px)' }
    ]);
  }
  scenes.forEach((scene, index) => {
    [...scene.querySelectorAll('.conversation > *')].forEach((element, order) => reveal(element, index, -.36 + order * .046, .38, 0, 24, 1));
    [...scene.querySelectorAll('.visual > article')].forEach((element, order) => reveal(element, index, -.38 + order * .07, .49, 42, 18 + order * 5, .98));
    scene.querySelectorAll('.floating-status, .mini-route').forEach((element, order) => reveal(element, index, -.04 + order * .05, .36, 0, 14, 1));
    scene.querySelectorAll('.quote-item, .day, .finance-row, .pipeline > span').forEach((element, order) => reveal(element, index, -.02 + order * .035, .22, 0, 16, 1));
    scene.querySelectorAll('.selected-label, .approved, .contract-stamp').forEach((element, order) => reveal(element, index, .12 + order * .04, .18, 0, 10, .98));
    scene.querySelectorAll('.destination-card > img, .social-card > img, .itinerary-cover > img').forEach(element => {
      layer(element, index, -.36, 1.25, [{ transform: 'scale(1.07) translateY(1%)' }, { transform: 'scale(1.01) translateY(-.5%)' }]);
    });
  });
  layer(document.querySelector('.signature'), 3, .20, .22, [{ opacity: .4, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)' }]);
  layer(document.querySelector('.demo-cursor'), 0, -.02, .40, [{ opacity: 0, translate: '25px -24px', offset: 0 }, { opacity: 1, translate: '0px 0px', offset: .55 }, { opacity: 1, translate: '0px 0px', offset: .75 }, { opacity: 0, translate: '0px 0px', offset: 1 }]);
  const finale = scenes[total - 1];
  reveal(finale.querySelector('.finale-heading'), total - 1, -.30, .35, 0, 25, .98);
  finale.querySelectorAll('.tools-grid > article').forEach((element, i) => reveal(element, total - 1, -.17 + i * .037, .30, 0, 25, 1));
  reveal(finale.querySelector('.finale-bottom'), total - 1, .15, .24, 0, 18, 1);

  function render(position) {
    const step = Math.min(total - 1, Math.floor(position));
    const phase = position - step;
    const transition = step === total - 1 ? 0 : smooth(clamp((phase - .40) / .60));
    const focusStep = Math.min(total - 1, step + (transition > .5 ? 1 : 0));
    const offset = compact.matches || reduced.matches ? focusStep : step + transition;
    track.style.transform = `translate3d(${-offset * width}px,0,0)`;
    document.body.style.setProperty('--journey', (position / duration).toFixed(4));
    scenes[0].classList.toggle('is-chosen', Math.max(position, introProgress * .29) > .225);
    scenes.forEach((scene, i) => {
      scene.classList.toggle('is-revealed', position > i + .05);
      scene.classList.toggle('is-complete', position > i + .28);
    });
    layers.forEach(item => {
      const local = item.scene === 0 ? Math.max(position, introProgress * .29) : position - item.scene;
      const progress = reduced.matches || compact.matches ? 1 : clamp((local - item.start) / item.span);
      if (Math.abs(progress - item.last) > .0002) { item.animation.currentTime = progress * 1000; item.last = progress; }
    });
    if (focusStep !== active) {
      active = focusStep;
      document.body.classList.toggle('is-finale', active === total - 1);
      if (compact.matches) scenes[active].scrollTop = 0;
      scenes.forEach((scene, i) => { scene.classList.toggle('is-active', i === active); scene.inert = i !== active; scene.setAttribute('aria-hidden', String(i !== active)); });
      nav.forEach((button, i) => {
        if (i === active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
        button.classList.toggle('is-past', i < active);
      });
      counter.innerHTML = `${String(active + 1).padStart(2, '0')} <i>/ ${String(total).padStart(2, '0')}</i>`;
      previous.disabled = active === 0; next.disabled = active === total - 1;
      if (performance.now() - introStart > 1000) announcement.textContent = `Etapa ${active + 1} de ${total}: ${nav[active].textContent.trim()}`;
    }
  }
  function tick(now) {
    frame = 0;
    if (document.hidden) return;
    const delta = Math.min(50, previousTime ? now - previousTime : 16.67);
    previousTime = now; introProgress = clamp((now - introStart) / 1800);
    // Time-based damping keeps motion consistent across 60 Hz and 120 Hz screens.
    rendered = reduced.matches ? target : rendered + (target - rendered) * (1 - Math.exp(-delta / 105));
    if (Math.abs(target - rendered) < .000025) rendered = target;
    render(rendered);
    if (rendered !== target || introProgress < 1) frame = requestAnimationFrame(tick);
    else { previousTime = 0; requestedStep = null; }
  }
  function wake() { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); }
  function onScroll() { target = clamp(scrollY / range * duration, 0, duration); wake(); }
  function measure(preservePosition = false) {
    const logicalPosition = target;
    width = scenes[0].getBoundingClientRect().width;
    const stride = compact.matches ? Math.max(innerHeight * .65, 400) : Math.max(innerHeight * 1.1, innerWidth * .69, 680);
    document.body.style.height = `${Math.round(innerHeight + stride * duration)}px`;
    range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (preservePosition) window.scrollTo({ top: logicalPosition / duration * range, behavior: 'instant' });
    onScroll();
  }
  function goTo(index) {
    index = clamp(index, 0, total - 1); requestedStep = index;
    if (compact.matches) rendered = index;
    window.scrollTo({ top: (index + (index === 0 ? 0 : .395)) / duration * range, behavior: 'instant' }); onScroll();
  }
  document.querySelectorAll('[data-goto]').forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.goto))));
  document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); goTo(0); });
  previous.addEventListener('click', () => goTo((requestedStep ?? active) - 1));
  next.addEventListener('click', () => goTo((requestedStep ?? active) + 1));
  addEventListener('keydown', event => {
    if (compact.matches && (event.key === 'PageDown' || event.key === 'PageUp')) return;
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); goTo((requestedStep ?? active) + 1); }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); goTo((requestedStep ?? active) - 1); }
    if (event.key === 'Home') { event.preventDefault(); goTo(0); }
    if (event.key === 'End') { event.preventDefault(); goTo(total - 1); }
  });
  let touchStart = null;
  addEventListener('touchstart', event => { touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }, { passive: true });
  addEventListener('touchend', event => {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x, dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(active + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', () => measure(true), { passive: true });
  reduced.addEventListener('change', wake);
  compact.addEventListener('change', () => { measure(true); wake(); });
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('motion-paused', document.hidden);
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else { previousTime = 0; onScroll(); }
  });
  addEventListener('pageshow', () => { measure(); wake(); }); document.fonts?.ready.then(() => measure(true));
  measure(); rendered = target;
  const hashIndex = scenes.findIndex(scene => `#${scene.id}` === location.hash);
  if (hashIndex > 0) goTo(hashIndex);
})();
