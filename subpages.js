import { startJourney } from './journey.js';
import { startNewsletterWater } from './newsletter-water.js';

const motion = matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav');

function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('span').textContent = open ? '−' : '+';
  nav.classList.toggle('open', open);
}

toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') === 'false'));
document.addEventListener('click', event => {
  if (!event.target.closest('.nav-wrap') || event.target.closest('#nav a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !nav.classList.contains('open')) return;
  setMenu(false);
  toggle.focus();
});

if ('IntersectionObserver' in window && !motion.matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-seen');
      observer.unobserve(entry.target);
    }
  }, { threshold: .12 });
  document.querySelectorAll('.page-image, .page-card').forEach(element => observer.observe(element));
}

for (const group of document.querySelectorAll('.answer-group')) {
  const button = document.querySelector(`[aria-controls="${group.id}"]`);
  if (!button) continue;
  const buttons = [...document.querySelectorAll('.answer-topics button')];
  const choose = selected => {
    for (const topic of buttons) {
      const active = topic === selected;
      topic.setAttribute('aria-pressed', String(active));
      document.getElementById(topic.getAttribute('aria-controls')).hidden = !active;
    }
  };
  for (const topic of buttons) topic.addEventListener('click', () => choose(topic));
  choose(buttons[0]);
  button.parentElement.hidden = false;
  break;
}

document.querySelector('#footer-year').textContent = new Date().getFullYear();
startJourney(motion);
startNewsletterWater(motion);
