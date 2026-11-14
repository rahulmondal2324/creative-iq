import { startFeatureReel } from './feature-reel.js';
import { startJourney } from './journey.js';
import { startPlayLab } from './play-lab.js';
import { startNewsletterWater } from './newsletter-water.js';
import { startLearningMix } from "./learning-mix.js";

const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav');
const header = document.querySelector('.site-header');

function syncHeader() {
  header.classList.toggle('is-scrolled', window.scrollY > 1);
}

syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });
window.addEventListener('pageshow', syncHeader);

function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
  toggle.querySelector('span').textContent = open ? '−' : '+';
}

toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') === 'false'));
nav.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('open')) {
    setMenu(false);
    toggle.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.nav-wrap')) setMenu(false);
});

const motion = matchMedia('(prefers-reduced-motion: reduce)');

function startReveals() {
  if (motion.matches || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('can-reveal');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(card => observer.observe(card));
}

startReveals();
startJourney(motion);
startFeatureReel(motion);

startLearningMix(motion);

const preview = document.querySelector('.preview-dialog');
const video = preview.querySelector('video');
document.querySelector('.play-preview').addEventListener('click', () => {
  preview.showModal();
  video.play().catch(() => {
    // Keep the native controls available if autoplay is blocked.
  });
});
preview.addEventListener('close', () => video.pause());

startPlayLab(motion);
startNewsletterWater(motion);

const principleOptions = document.querySelector('.principles-options');
const principleButtons = [...principleOptions.querySelectorAll('button')];
const principlePanels = principleButtons.map(button =>
  document.getElementById(button.getAttribute('aria-controls'))
);

function selectPrinciple(selected) {
  principleButtons.forEach((button, index) => {
    const active = index === selected;
    button.setAttribute('aria-pressed', String(active));
    principlePanels[index].hidden = !active;
  });
}

principleButtons.forEach((button, index) => {
  button.addEventListener('click', () => selectPrinciple(index));
});

selectPrinciple(0);
principleOptions.hidden = false;

const reviewList = document.querySelector('.review-list');
const reviewControls = document.querySelector('.review-controls');
const [previousReview, nextReview] = reviewControls.querySelectorAll('button');

if (window.jQuery?.fn.owlCarousel) {
  const carousel = window.jQuery(reviewList);
  reviewList.classList.add('owl-carousel');
  const speed = () => motion.matches ? 0 : 420;

  carousel.owlCarousel({
    responsive: { 0: { items: 1, margin: 14 }, 641: { items: 2, margin: 18 }, 821: { items: 3, margin: 26 } },
    rewind: true,
    dots: false,
    autoRefresh: false,
    smartSpeed: speed(),
  });

  previousReview.addEventListener('click', () => carousel.trigger('prev.owl.carousel', [speed()]));
  nextReview.addEventListener('click', () => carousel.trigger('next.owl.carousel', [speed()]));
  reviewList.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    carousel.trigger(event.key === 'ArrowLeft' ? 'prev.owl.carousel' : 'next.owl.carousel', [speed()]);
  });
  reviewControls.hidden = false;
}

document.querySelector('#footer-year').textContent = new Date().getFullYear();

const answerTopics = document.querySelector('.answer-topics');
const topicButtons = [...answerTopics.querySelectorAll('button')];
const answerGroups = topicButtons.map(button => document.getElementById(button.getAttribute('aria-controls')));

function selectTopic(selected) {
  topicButtons.forEach((button, index) => {
    const active = index === selected;
    button.setAttribute('aria-pressed', String(active));
    answerGroups[index].hidden = !active;
  });
}

topicButtons.forEach((button, index) => {
  button.addEventListener('click', () => selectTopic(index));
});
selectTopic(0);
answerTopics.hidden = false;
