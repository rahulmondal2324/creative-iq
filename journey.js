const clamp = value => Math.min(1, Math.max(0, value));
const mix = (from, to, progress) => from + (to - from) * progress;

function ease(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

// The bottom-right point travels ahead of the other three corners.
export function aperture(width, height, box, progress) {
  const t = ease(progress);
  const lead = ease(progress * 1.42);
  const left = mix(box.x, 0, ease((progress - .15) / .85));
  const top = mix(box.y, 0, ease((progress - .27) / .73));
  const right = mix(box.right, width, t);
  const bottom = mix(box.bottom, height, t);
  const tipX = mix(box.right, width, lead);
  const tipY = mix(box.bottom, height, lead);
  const bend = Math.sin(Math.PI * progress);
  const radius = mix(24, 0, t);
  const n = Math.round;
  return `path("M ${n(left + radius)} ${n(top)} H ${n(right - radius)}
    Q ${n(right)} ${n(top)} ${n(right)} ${n(top + radius)}
    C ${n(right - 46 * bend)} ${n(mix(top, tipY, .52))} ${n(tipX + 23 * bend)} ${n(tipY - 58 * bend - radius)} ${n(tipX)} ${n(tipY - radius)}
    Q ${n(tipX)} ${n(tipY)} ${n(tipX - radius)} ${n(tipY)}
    C ${n(mix(left, tipX, .67))} ${n(tipY + 27 * bend)} ${n(mix(left, tipX, .3))} ${n(bottom)} ${n(left + radius)} ${n(bottom)}
    Q ${n(left)} ${n(bottom)} ${n(left)} ${n(bottom - radius)}
    V ${n(top + radius)} Q ${n(left)} ${n(top)} ${n(left + radius)} ${n(top)} Z")`.replace(/\s+/g, ' ');
}

export function startJourney(motion) {
  const journey = document.querySelector('.journey');
  if (!journey) return;
  const pin = journey.querySelector('.journey-pin');
  const intro = document.querySelector('.journey-intro');
  const header = document.querySelector('body:not(.home-page) .site-header');
  const scene = document.querySelector('.scene');
  const photos = [...scene.querySelectorAll('.scene-images img')];
  const chapters = [...scene.querySelectorAll('.chapter')];
  const meter = scene.querySelector('.story-meter');
  let width, height, distance, box, imageWidth, imageHeight, frame, previous;
  const openingLength = journey.classList.contains('story-journey') ? .17 : .26;

  function draw(progress) {
    const grow = clamp(progress / openingLength);
    const story = clamp((progress - openingLength) / (.94 - openingLength));
    const step = story * (chapters.length - .65);
    const activeChapter = Math.min(chapters.length - 1, Math.floor(step + .05));
    const introOpacity = 1 - ease((grow - .05) / .42);
    const copyOpacity = ease((grow - .74) / .26);
    intro.style.opacity = introOpacity;
    scene.style.setProperty("--shade", mix(.21, 1, ease(grow)));
    scene.style.clipPath = grow >= 1 ? 'none' : aperture(width, height, box, grow);
    if (header) {
      const headerFade = ease((grow - .42) / .58) * (1 - ease((progress - .95) / .05));
      header.classList.toggle('over-journey', headerFade > .58);
      header.style.setProperty('--nav-opacity', 1 - headerFade);
      header.style.setProperty('--nav-border', .12 * (1 - headerFade));
    }

    const opening = ease(grow);
    const previewScale = Math.max((box.right - box.x) / imageWidth, (box.bottom - box.y) / imageHeight);
    const focusScale = mix(previewScale, 1, opening);
    const cropOffset = width <= 760 ? (imageWidth - width) * .19 : 0;
    const centreX = mix((box.x + box.right) / 2, width / 2 - cropOffset, opening);
    const centreY = mix((box.y + box.bottom) / 2, height / 2, opening);


    for (const [index, photo] of photos.entries()) {
      const next = ease((step - index + .22) / .44);
      const fade = index === 0 ? 1 : next;
      const gone = index < photos.length - 1 && step >= index + 1.22;
      photo.style.opacity = gone ? 0 : fade;
      if (fade > 0 && !gone) {
        const drift = 1 + .09 * clamp(step - index);
        if (index === 0) {
          const scale = focusScale * drift;
          photo.style.transform = `translate3d(${centreX - imageWidth * scale / 2}px,${centreY - imageHeight * scale / 2}px,0) scale(${scale})`;
        } else {
          photo.style.transform = `scale(${drift})`;
        }
      }
      const incoming = index === 0 ? 1 : next;
      const outgoing = index === chapters.length - 1 ? 1 : 1 - ease((step - index - .78) / .44);
      const opacity = incoming * outgoing * copyOpacity;
      chapters[index].classList.toggle('is-active', index === activeChapter && copyOpacity > .85);
      chapters[index].style.opacity = opacity;
      chapters[index].style.transform = `translateY(${(1 - incoming) * 22 - (1 - outgoing) * 14}px)`;
    }
    meter.style.opacity = copyOpacity;
    meter.firstElementChild.style.transform = `scaleX(${story})`;
    journey.classList.add('ready');
  }

  function update() {
    frame = null;
    if (!journey.classList.contains('ready') && !box) return;
    const top = journey.getBoundingClientRect().top;
    const progress = clamp(-top / distance);
    if (progress !== previous) {
      draw(progress);
      previous = progress;
    }

  }

  function queue() {
    if (frame == null) frame = requestAnimationFrame(update);
  }

  function measure() {
    if (motion.matches || innerHeight < 460 || !CSS.supports('clip-path', 'path("M 0 0 L 20 20 Z")') || !CSS.supports('height', '100svh')) {
      document.documentElement.classList.remove('cinematic', 'can-reveal');
      journey.classList.remove('ready');
      header?.removeAttribute('style');
      header?.classList.remove('over-journey');
      intro.removeAttribute('style');
      chapters.forEach(chapter => {
        chapter.removeAttribute('style');
        chapter.classList.remove('is-active');
      });
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
      box = null;
      return;
    }

    document.documentElement.classList.add('cinematic');
    width = pin.clientWidth;
    height = pin.clientHeight;
    const aspect = Number(photos[0].getAttribute('width')) / Number(photos[0].getAttribute('height'));
    imageWidth = Math.max(width, height * aspect);
    imageHeight = imageWidth / aspect;
    photos[0].style.width = `${imageWidth}px`;
    photos[0].style.height = `${imageHeight}px`;
    distance = Math.max(1, journey.offsetHeight - height);
    const x = intro.offsetLeft;
    const y = Math.min(intro.offsetHeight + 19, height - 88);
    const w = Math.min(width - x * 2, width * .50, 650);
    const h = Math.min(w * .55, height - y - 18);
    box = { x, y, right: x + w, bottom: y + h };
    previous = undefined;
    queue();
  }

  for (const [index, chapter] of chapters.entries()) {
    chapter.addEventListener('focusin', () => {
      if (!box || chapter.classList.contains('is-active')) return;
      const progress = openingLength + (.94 - openingLength) * ((index + .3) / (chapters.length - .65));
      const start = scrollY + journey.getBoundingClientRect().top;
      window.scrollTo({ top: start + progress * distance, behavior: 'instant' });
      update();
    });
  }

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', measure);
  motion.addEventListener?.('change', measure);
  document.fonts?.ready.then(measure);
  measure();
}
