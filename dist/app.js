(() => {
  'use strict';
  const scenes = [...document.querySelectorAll('.scene')];
  const track = document.querySelector('.track');
  const nav = [...document.querySelectorAll('#journey-nav button')];
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const counter = document.querySelector('#counter');
  const announcement = document.querySelector('#chapter-announcement');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const total = scenes.length;
  const duration = total - 0.12;
  let active = -1;
  let scheduled = false;
  let range = 1;
  let width = window.innerWidth;
  let startedAt = performance.now();
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const smoothstep = t => t * t * (3 - 2 * t);

  function update() {
    scheduled = false;
    const position = clamp(window.scrollY / range * duration, 0, duration);
    const step = Math.min(total - 1, Math.floor(position));
    const phase = position - step;
    // Most of each scroll interval belongs to the scene; its final part moves the stage.
    const transition = step === total - 1 ? 0 : smoothstep(clamp((phase - 0.60) / 0.40, 0, 1));
    const offset = reduced.matches ? step : step + transition;
    track.style.transform = `translate3d(${-offset * width}px, 0, 0)`;
    const focusedStep = transition > 0.52 ? Math.min(step + 1, total - 1) : step;
    scenes[0].classList.toggle('is-chosen', position > 0.15);
    scenes.forEach((scene, i) => {
      scene.classList.toggle('is-revealed', position > i + 0.12);
      scene.classList.toggle('is-complete', position > i + 0.38);
      const entry = clamp((position - i + 0.24) / 0.42, 0, 1);
      scene.style.setProperty('--entry', reduced.matches ? 1 : smoothstep(entry));
    });
    if (active !== focusedStep) {
      active = focusedStep;
      scenes.forEach((scene, i) => {
        scene.classList.toggle('is-active', i === active);
        scene.inert = i !== active;
        scene.setAttribute('aria-hidden', String(i !== active));
      });
      nav.forEach((button, i) => {
        if (i === active) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
        button.classList.toggle('is-past', i < active);
      });
      counter.innerHTML = `${String(active + 1).padStart(2, '0')} <i>/ 07</i>`;
      previous.disabled = active === 0;
      next.disabled = active === total - 1;
      if (performance.now() - startedAt > 500) {
        announcement.textContent = `Etapa ${active + 1} de ${total}: ${nav[active].textContent.trim()}`;
      }
    }
  }
  function queueUpdate() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }
  function measure() {
    range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    width = window.innerWidth;
    queueUpdate();
  }
  function goTo(index) {
    index = clamp(index, 0, total - 1);
    const target = (index + (index === 0 ? 0 : 0.18)) / duration * range;
    window.scrollTo({ top: target, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  document.querySelectorAll('[data-goto]').forEach(button => {
    button.addEventListener('click', () => goTo(Number(button.dataset.goto)));
  });
  document.querySelector('.brand').addEventListener('click', event => {
    event.preventDefault();
    goTo(0);
  });
  previous.addEventListener('click', () => goTo(active - 1));
  next.addEventListener('click', () => goTo(active + 1));
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault(); goTo(active + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault(); goTo(active - 1);
    } else if (event.key === 'Home') {
      event.preventDefault(); goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault(); goTo(total - 1);
    }
  });
  let touchStart = null;
  window.addEventListener('touchstart', event => {
    if (event.touches.length === 1) touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  window.addEventListener('touchend', event => {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(active + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  reduced.addEventListener('change', queueUpdate);
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.background = '#eae5df';
      img.classList.add('image-unavailable');
    });
  });
  measure();
  const hashIndex = scenes.findIndex(scene => `#${scene.id}` === window.location.hash);
  if (hashIndex > 0) requestAnimationFrame(() => goTo(hashIndex));
})();
