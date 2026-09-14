(() => {
  'use strict';
  const page = document.body.dataset.auth;
  const panels = [...document.querySelectorAll('.auth-panel')];
  const forms = [...document.querySelectorAll('.auth-form')];
  let signupStep = 0;

  function message(input, text = '') {
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    const output = document.getElementById(`${input.id}-error`);
    if (output) output.textContent = text;
  }
  function errorFor(input) {
    if (!input.value.trim()) return input.dataset.required || 'Preencha este campo.';
    if (input.type === 'email' && input.validity.typeMismatch) return 'Informe um e-mail válido, como nome@agencia.com.br.';
    if (input.dataset.min && input.value.trim().length < Number(input.dataset.min)) return 'Use pelo menos 2 caracteres.';
    if (input.dataset.password === 'new' && input.value.length < 10) return 'Use pelo menos 10 caracteres na senha.';
    if (input.dataset.confirm && input.value !== document.getElementById(input.dataset.confirm).value) return 'As senhas precisam ser iguais.';
    return '';
  }
  function validate(scope) {
    let first = null;
    scope.querySelectorAll('input[required]').forEach(input => {
      const error = errorFor(input); message(input, error);
      if (error && !first) first = input;
    });
    if (first) first.focus();
    return !first;
  }
  function clearSecrets() {
    document.querySelectorAll('[data-secret]').forEach(input => { input.value = ''; input.type = 'password'; });
    document.querySelectorAll('.password-toggle').forEach(button => { button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-label', 'Mostrar senha'); });
  }
  function showPanel(id) {
    clearSecrets();
    panels.forEach(panel => {
      panel.hidden = panel.id !== id;
      panel.classList.toggle('is-entering', panel.id === id);
    });
    const panel = document.getElementById(id);
    const heading = panel.querySelector('h1');
    heading?.focus();
    document.title = id === 'reset-panel' ? 'Recuperar acesso — TravelPro' : 'Entrar — TravelPro';
  }
  function setStep(index) {
    signupStep = index;
    document.querySelectorAll('.auth-step').forEach((step, i) => { step.hidden = i !== index; step.classList.toggle('is-entering', i === index); });
    document.querySelectorAll('.auth-stepper > span').forEach((step, i) => { step.classList.toggle('is-current', i === index); step.classList.toggle('is-done', i < index); if (i === index) step.setAttribute('aria-current','step'); else step.removeAttribute('aria-current'); });
    document.querySelector('#signup-title').textContent = index ? 'Seu espaço, seu acesso.' : 'Sua agência começa aqui.';
    document.querySelector('#signup-subtitle').textContent = index ? 'Defina uma senha para o seu perfil.' : 'Vamos preparar o próximo capítulo da sua agência.';
    document.querySelectorAll('.auth-step')[index].querySelector('input')?.focus();
  }
  async function finish(form) {
    const result=document.getElementById(form.dataset.result),buttons=[...form.querySelectorAll('button[type="submit"]')];
    buttons.forEach(b=>b.disabled=true);result.hidden=false;result.textContent='Aguarde…';
    try {
      let route,body;
      if(form.id==='signup-form'){route='/auth/register';body={name:document.getElementById('signup-name').value,agency:document.getElementById('signup-agency').value,email:document.getElementById('signup-email').value,password:document.getElementById('signup-password').value};}
      else if(form.id==='login-form'){route='/auth/login';body={email:document.getElementById('login-email').value,password:document.getElementById('login-password').value};}
      else {route='/auth/reset-request';body={email:document.getElementById('reset-email').value};}
      const data=await TravelAPI.request(route,{method:'POST',body});clearSecrets();
      if(form.id==='reset-form'){result.textContent=data.message;return;}
      location.href='portal.html';
    }catch(error){result.textContent=error.message;result.focus();}finally{buttons.forEach(b=>b.disabled=false);}
  }
  forms.forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (page === 'signup') {
        const current = form.querySelectorAll('.auth-step')[signupStep];
        if (!validate(current)) return;
        if (signupStep === 0) { setStep(1); return; }
        // Validate both steps, including any fields changed by the browser's autofill.
        if (!validate(form.querySelectorAll('.auth-step')[0])) { setStep(0); validate(form.querySelectorAll('.auth-step')[0]); return; }
      } else if (!validate(form)) return;
      finish(form);
    });
    form.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') message(input); });
      input.addEventListener('blur', () => { if (input.value) message(input, errorFor(input)); });
    });
  });
  document.querySelectorAll('.password-toggle').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.getAttribute('aria-controls'));
    const showing = input.type === 'password'; input.type = showing ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(showing)); button.setAttribute('aria-label', showing ? 'Ocultar senha' : 'Mostrar senha');
    input.focus({ preventScroll: true });
  }));
  document.querySelector('[data-back-step]')?.addEventListener('click', () => setStep(0));
  document.querySelector('[data-reset]')?.addEventListener('click', () => {
    document.querySelector('#reset-email').value = document.querySelector('#login-email').value;
    showPanel('reset-panel');
  });
  document.querySelector('[data-login]')?.addEventListener('click', () => showPanel('login-panel'));
  const password = document.querySelector('#signup-password');
  password?.addEventListener('input', () => {
    const ready = password.value.length >= 10;
    document.querySelector('.password-rule > span').style.width = `${Math.min(100,password.value.length * 10)}%`;
    document.querySelector('#password-hint').classList.toggle('is-met', ready);
    document.querySelector('#password-hint').textContent = ready ? '✓ Mínimo de 10 caracteres atendido.' : 'Use pelo menos 10 caracteres.';
  });
  const token=new URLSearchParams(location.search).get('reset');
  if(token&&page==='login'){
    showPanel('reset-panel');document.getElementById('reset-title').textContent='Crie uma nova senha';
    const form=document.getElementById('reset-form');form.innerHTML='<div class="field"><label for="reset-new">Nova senha</label><input id="reset-new" type="password" autocomplete="new-password" minlength="10" required></div><button class="primary-cta submit-button" type="submit">Salvar nova senha</button>';
    form.addEventListener('submit',async event=>{event.preventDefault();event.stopImmediatePropagation();if(!form.reportValidity())return;const result=document.getElementById('reset-result');result.hidden=false;try{await TravelAPI.request('/auth/reset-confirm',{method:'POST',body:{token,password:document.getElementById('reset-new').value}});location.href='login.html';}catch(error){result.textContent=error.message;}},true);
  }
  addEventListener('pagehide' , clearSecrets);
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('motion-paused', document.hidden));
})();
