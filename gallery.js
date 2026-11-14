const showcase = document.querySelector('.device-showcase');
const reduceShowcaseMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isSafari = /^Apple/.test(navigator.vendor) || /iPad|iPhone|iPod/.test(navigator.userAgent);
const fineShowcasePointer = matchMedia('(hover: hover) and (pointer: fine)');

function splitShowcaseText(element) {
  const text = element.textContent.trim();
  element.setAttribute('aria-label', text);
  let index = 0;
  const fragment = document.createDocumentFragment();

  for (const word of text.split(/\s+/)) {
    if (index > 0) fragment.append(' ');
    const wrapper = document.createElement('span');
    wrapper.className = 'showcase-word';
    wrapper.setAttribute('aria-hidden', 'true');
    for (const character of word) {
      const letter = document.createElement('span');
      letter.className = 'showcase-letter';
      letter.style.setProperty('--letter-index', index++);
      letter.textContent = character;
      wrapper.append(letter);
    }
    fragment.append(wrapper);
  }
  element.replaceChildren(fragment);
}

if (showcase && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle('showcase-in', entry.isIntersecting);
    }
  }, { threshold: 0 });

  showcase.querySelectorAll('h1, .showcase-title').forEach(splitShowcaseText);
  showcase.classList.add('showcase-ready');
  // Observe stable boxes so the reveal itself never changes its trigger.
  showcase.querySelectorAll('.device-showcase-heading, .device-showcase-grid > li, .showcase-caption')
    .forEach((element) => observer.observe(element));
}

if (showcase) {
  const tiles = [...showcase.querySelectorAll('.device-showcase-grid > li')];
  const ribbon = showcase.querySelector('.gallery-ribbon path');
  function updateRibbon(bounds) {
    const progress = Math.max(0, Math.min(1, (innerHeight * .82 - bounds.top) / (bounds.height + innerHeight * .17)));
    ribbon.style.strokeDashoffset = 1 - progress;
  }
  let arcFrame = 0;
  let previousScroll = window.scrollY;
  let previousTime = 0;
  let scrollPulse = 0;

  function updateScrollArc(time) {
    arcFrame = 0;
    const sectionBounds = showcase.getBoundingClientRect();
    if (!reduceShowcaseMotion.matches) updateRibbon(sectionBounds);
    else ribbon.style.removeProperty('stroke-dashoffset');
    if (reduceShowcaseMotion.matches || isSafari) {
      showcase.classList.remove('showcase-arc');
      scrollPulse = 0;
      previousTime = 0;
      return;
    }

    if (sectionBounds.bottom < 0 || sectionBounds.top > innerHeight) {
      previousTime = 0;
      scrollPulse = 0;
      return;
    }
    const scroll = window.scrollY;
    const elapsed = previousTime ? Math.max(16, time - previousTime) : 16;
    const speed = previousTime ? Math.abs(scroll - previousScroll) / elapsed : 0;
    scrollPulse = Math.max(Math.min(1, speed / 2.5), scrollPulse * Math.exp(-elapsed / 120));
    previousScroll = scroll;
    previousTime = time;

    const viewportHeight = window.innerHeight;
    const center = viewportHeight * .5;
    const mobile = window.innerWidth <= 600;
    const radius = viewportHeight * (mobile ? 4.0 : 3.2);
    const angleLimit = viewportHeight * .65 / radius;

    // The eye sits at the center of the viewport for every tile, even across columns.
    const positions = tiles.map((tile) => {
      const bounds = tile.getBoundingClientRect();
      const offset = bounds.top + bounds.height / 2 - center;
      const angle = Math.max(-angleLimit, Math.min(angleLimit, offset / radius));
      return {
        eyeX: window.innerWidth / 2 - bounds.left,
        eyeY: center - bounds.top,
        rotation: angle * 180 / Math.PI,
        lift: radius * (Math.sin(angle) - angle),
        depth: radius * (1 - Math.cos(angle)),
        stretch: 1 + scrollPulse * Math.min(1, Math.abs(offset) / center) * (mobile ? .022 : .05),
      };
    });

    showcase.classList.add('showcase-arc');
    tiles.forEach((tile, index) => {
      const { eyeX, eyeY, rotation, lift, depth, stretch } = positions[index];
      tile.style.setProperty('--arc-eye', `${eyeX.toFixed(2)}px ${eyeY.toFixed(2)}px`);
      tile.style.setProperty('--arc-angle', `${rotation.toFixed(2)}deg`);
      tile.style.setProperty('--arc-lift', `${lift.toFixed(2)}px`);
      tile.style.setProperty('--arc-depth', `${depth.toFixed(2)}px`);
      tile.style.setProperty('--arc-stretch', stretch.toFixed(4));
    });
    if (scrollPulse > .01) queueScrollArc();
  }

  function queueScrollArc() {
    if (!arcFrame) arcFrame = requestAnimationFrame(updateScrollArc);
  }

  window.addEventListener('scroll', queueScrollArc, { passive: true });
  window.addEventListener('resize', queueScrollArc);
  reduceShowcaseMotion.addEventListener('change', queueScrollArc);
  queueScrollArc();

  for (const card of showcase.querySelectorAll('.showcase-card')) {
    const image = card.querySelector('.showcase-image');

    card.addEventListener('pointermove', (event) => {
      if (isSafari || !fineShowcasePointer.matches || reduceShowcaseMotion.matches || event.pointerType === 'touch') return;
      const bounds = image.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5));
      const y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5));
      image.style.setProperty('--showcase-x', `${x * -34}px`);
      image.style.setProperty('--showcase-y', `${y * -24}px`);
    });

    card.addEventListener('pointerleave', () => {
      image.style.removeProperty('--showcase-x');
      image.style.removeProperty('--showcase-y');
    });
  }
}
