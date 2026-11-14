const trigger = document.querySelector('#parent-login-trigger');
const dialog = document.querySelector('#parent-login');
const phoneStep = document.querySelector('#parent-phone-step');
const codeStep = document.querySelector('#parent-code-step');
const complete = document.querySelector('#parent-login-complete');
const phone = document.querySelector('#parent-phone');
const code = document.querySelector('#parent-code');
const codeHint = document.querySelector('#parent-code-hint strong');
const progress = document.querySelector('.parent-login-progress');
const [numberItem, verificationItem] = progress.children;

function showStep(step, focusTarget) {
  for (const panel of [phoneStep, codeStep, complete]) {
    panel.hidden = panel !== step;
  }

  progress.hidden = step === complete;
  numberItem.toggleAttribute('data-done', step === codeStep);
  const current = step === phoneStep ? numberItem : verificationItem;
  numberItem.removeAttribute('aria-current');
  verificationItem.removeAttribute('aria-current');
  current.setAttribute('aria-current', 'step');
  focusTarget.focus();
}

function resetForm(form, input) {
  form.reset();
  input.setCustomValidity('');
}

trigger.addEventListener('click', () => {
  if (typeof dialog.showModal !== 'function') return;
  showStep(phoneStep, document.querySelector('#parent-login-title'));
  dialog.showModal();
});

dialog.addEventListener('close', () => {
  resetForm(phoneStep, phone);
  resetForm(codeStep, code);
  codeHint.textContent = '';
  trigger.focus({ preventScroll: true });
});

phone.addEventListener('input', () => phone.setCustomValidity(''));
code.addEventListener('input', () => code.setCustomValidity(''));

phoneStep.addEventListener('submit', event => {
  event.preventDefault();
  const number = phone.value.trim().replace(/[\s().-]/g, '');

  if (!/^\+?[0-9]{7,15}$/.test(number)) {
    phone.setCustomValidity('Enter a valid mobile number with 7 to 15 digits.');
    phone.reportValidity();
    return;
  }

  codeHint.textContent = String(Math.floor(100000 + Math.random() * 900000));
  showStep(codeStep, code);
});

codeStep.addEventListener('submit', event => {
  event.preventDefault();

  if (code.value !== codeHint.textContent) {
    code.setCustomValidity('Enter the six-digit code shown above.');
    code.reportValidity();
    return;
  }

  resetForm(phoneStep, phone);
  resetForm(codeStep, code);
  codeHint.textContent = '';
  showStep(complete, complete.querySelector('h3'));
});

document.querySelector('#parent-change-phone').addEventListener('click', () => {
  resetForm(codeStep, code);
  codeHint.textContent = '';
  showStep(phoneStep, phone);
});
