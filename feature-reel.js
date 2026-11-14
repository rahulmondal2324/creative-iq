const clamp = value => Math.min(1, Math.max(0, value));
const mix = (start, end, progress) => start + (end - start) * progress;

function ease(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

// Coordinates are normalised to the expanded frame. The raised right tip leads
// the first stretch, then the left edge bows inward as the lower corner catches up.
const rightwardStretch = [
  [.015,.08], [.19,.08], [.48,.17], [.695,.20], [.733,.20], [.729,.22],
  [.63,.35], [.555,.48], [.514,.69], [.507,.73], [.487,.73],
  [.31,.69], [.14,.70], [.018,.70], [0,.70], [0,.67],
  [0,.48], [.001,.26], [.005,.13], [.008,.08], [.015,.08],
];
const settlingStretch = [
  [.066,.20], [.28,.17], [.68,.04], [.937,.035], [.962,.035], [.957,.059],
  [.926,.24], [.912,.50], [.90,.785], [.899,.813], [.877,.819],
  [.60,.893], [.29,.79], [.067,.731], [.044,.728], [.049,.697],
  [.055,.59], [.095,.43], [.048,.228], [.042,.204], [.066,.20],
];

function roundedOutline(left, top, right, bottom, radius) {
  return [
    [left+radius,top], [mix(left,right,.33),top], [mix(left,right,.67),top], [right-radius,top], [right,top], [right,top+radius],
    [right,mix(top,bottom,.33)], [right,mix(top,bottom,.67)], [right,bottom-radius], [right,bottom], [right-radius,bottom],
    [mix(left,right,.67),bottom], [mix(left,right,.33),bottom], [left+radius,bottom], [left,bottom], [left,bottom-radius],
    [left,mix(top,bottom,.67)], [left,mix(top,bottom,.33)], [left,top+radius], [left,top], [left+radius,top],
  ];
}

function fluidOutline(width, height, box, radius, progress) {
  const stages = [
    { at: 0, points: roundedOutline(box.x, box.y, box.right, box.bottom, radius) },
    { at: .42, points: rightwardStretch.map(([x,y]) => [x * width, y * height]) },
    { at: .77, points: settlingStretch.map(([x,y]) => [x * width, y * height]) },
    { at: 1, points: roundedOutline(0, 0, width, height, radius) },
  ];
  const endIndex = stages.findIndex(stage => stage.at >= progress && stage.at > 0);
  const { at: start, points: from } = stages[endIndex - 1];
  const { at: end, points: to } = stages[endIndex];
  const blend = (progress - start) / (end - start);
  const points = from.map(([x,y], index) => [mix(x, to[index][0], blend), mix(y, to[index][1], blend)]);
  const xs = points.map(([x]) => x);
  const ys = points.map(([,y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const commands = { 0: 'M', 1: 'C', 4: 'Q', 6: 'C', 9: 'Q', 11: 'C', 14: 'Q', 16: 'C', 19: 'Q' };
  const path = points.map(([x,y], index) =>
    `${commands[index] ?? ''} ${x.toFixed(2)} ${y.toFixed(2)}`
  ).join(' ');

  return { clip: `path("${path} Z")`, left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

export function startFeatureReel(motion) {
  const section = document.querySelector('.feature-reel');
  const stage = section.querySelector('.feature-reel-stage');
  const frame = section.querySelector('.feature-reel-frame');
  const copy = section.querySelector('.feature-reel-copy');
  const video = section.querySelector('video');
  const play = section.querySelector('.feature-reel-play');
  const desktopPointer = matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)');
  const canAnimate = CSS.supports('clip-path', 'path("M 0 0 L 10 10 Z")');
  let request = 0;
  let transition;
  let previousTop;
  let watching = false;

  function finishTransition() {
    transition = undefined;
    document.documentElement.classList.remove('reel-scrolling');
  }

  function update(timestamp) {
    request = 0;
    if (!section.classList.contains('is-fluid')) return;

    const width = frame.clientWidth;
    const height = frame.clientHeight;
    if (!width || !height) return;

    const drop = stage.clientHeight - height;
    const headerHeight = document.querySelector('.site-header').offsetHeight;
    const paddingTop = parseFloat(getComputedStyle(section).paddingTop);
    const pinStart = headerHeight + 14 - paddingTop;
    const distance = Math.max(1, stage.offsetTop + drop - 10);
    const top = section.getBoundingClientRect().top;

    const travelled = pinStart - top;
    const inside = travelled > 3 && travelled < distance - 3;
    if (!transition && inside && previousTop !== undefined) {
      const from = pinStart - previousTop;
      const enteredFromAbove = from <= 3 && top < previousTop;
      const enteredFromBelow = from >= distance - 3 && top > previousTop;
      if (enteredFromAbove || enteredFromBelow) {
        const destination = enteredFromAbove ? distance + 2 : -2;
        transition = { start: scrollY, end: scrollY + destination - travelled, time: timestamp };
        document.documentElement.classList.add('reel-scrolling');
      }
    }

    if (transition) {
      const elapsed = clamp((timestamp - transition.time) / 1120);
      window.scrollTo({ top: mix(transition.start, transition.end, ease(elapsed)), behavior: 'instant' });
      if (elapsed === 1) finishTransition();
      else queueUpdate();
    }

    const sectionTop = section.getBoundingClientRect().top;
    previousTop = sectionTop;
    const position = pinStart - sectionTop;
    const progress = position >= distance - 3 ? 1 : clamp(position / distance);
    const stageWidth = stage.clientWidth;
    const smallWidth = Math.min(stageWidth * (stageWidth < 600 ? .53 : .46), width * .65);
    const smallHeight = smallWidth * 9 / 16;
    const x = stageWidth * .018;
    const y = (height - smallHeight) * .29;
    const box = { x, y, right: x + smallWidth, bottom: y + smallHeight };
    const growth = ease(progress);
    copy.style.opacity = 1 - ease(progress * 3.8);
    copy.style.transform = `translateY(${-14 * growth}px)`;
    const radius = Math.min(parseFloat(getComputedStyle(frame).borderTopLeftRadius), smallHeight / 4);
    const media = progress === 1
      ? { clip: '', left: 0, top: 0, width, height }
      : fluidOutline(width, height, box, radius, progress);
    frame.style.clipPath = media.clip;
    video.style.width = media.width + 'px';
    video.style.height = media.height + 'px';
    video.style.transform = `translate(${media.left}px, ${media.top}px)`;
    video.style.objectFit = progress > 0 && progress < 1 ? 'cover' : '';
    const descent = drop * ease((progress - .08) / .92);
    const centreOffset = (stageWidth - width) / 2 * growth;
    frame.style.transform = `translate(${centreOffset}px, ${descent}px)`;
    play.style.top = drop + height / 2 + 'px';
    section.classList.toggle('is-expanded', progress === 1);
    if (progress < .15 && watching) {
      watching = false;
      video.muted = true;
      video.loop = true;
    }
    play.hidden = watching || progress < 1;
    video.controls = progress === 1 && watching;
  }

  function queueUpdate() {
    if (!request) request = requestAnimationFrame(update);
  }

  function syncMode() {
    finishTransition();
    const fluid = canAnimate && desktopPointer.matches && !motion.matches;
    section.classList.toggle('is-fluid', fluid);
    if (fluid) {
      previousTop = undefined;
      queueUpdate();
      return;
    }

    copy.style.removeProperty('opacity');
    copy.style.removeProperty('transform');
    frame.style.clipPath = '';
    frame.style.removeProperty('transform');
    section.classList.remove('is-expanded');
    play.hidden = true;
    play.style.removeProperty('top');
    video.style.removeProperty('width');
    video.style.removeProperty('height');
    video.style.removeProperty('transform');
    video.style.removeProperty('object-fit');
    video.controls = true;
  }

  play.addEventListener('click', () => {
    watching = true;
    video.controls = true;
    video.muted = false;
    video.loop = false;
    video.currentTime = 0;
    video.focus({ preventScroll: true });
    queueUpdate();
    video.play().catch(() => {});
  });
  addEventListener('scroll', queueUpdate, { passive: true });
  addEventListener('resize', syncMode);
  desktopPointer.addEventListener('change', syncMode);
  addEventListener('pagehide', finishTransition);
  motion.addEventListener('change', () => {
    if (motion.matches) video.pause();
    syncMode();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (section.classList.contains('is-fluid') && entry.isIntersecting) video.play().catch(() => {});
      else if (!entry.isIntersecting) video.pause();
    }, { threshold: .35 }).observe(stage);
  }
  syncMode();
}
