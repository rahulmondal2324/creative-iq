export function startLearningMix(motion) {
  const grid = document.querySelector('.learning-mix-grid');
  const stacked = matchMedia('(max-width: 680px)');
  const graphics = [...grid.querySelectorAll('.mix-graphic')];
  const beats = graphics.map(graphic => [...graphic.querySelectorAll('[data-beat]')]);
  let pending = false;

  function reveal(words, top, height) {
    const start = height * .94;
    const span = height * (stacked.matches ? .47 : .65);
    const progress = (start - top) / span;
    const step = .91 / words.length;

    words.forEach((word, index) => {
      const phase = (progress - index * step) / (step * 1.3);
      const opacity = Math.min(1, Math.max(0, phase));
      word.style.opacity = opacity;
    });
  }

  function update() {
    pending = false;
    if (motion.matches) {
      beats.flat().forEach(word => word.style.removeProperty('opacity'));
      return;
    }

    const height = window.innerHeight;
    if (stacked.matches) {
      const tops = graphics.map(graphic => graphic.getBoundingClientRect().top);
      beats.forEach((words, index) => reveal(words, tops[index], height));
    } else {
      reveal(beats.flat(), grid.getBoundingClientRect().top, height);
    }
  }

  function queue() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  motion.addEventListener?.('change', queue);
  update();
}
