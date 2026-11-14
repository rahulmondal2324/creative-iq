const shapes = ['cross', 'ring', 'block'];
const colours = [
  ['#a7cf64', '#699f2b', '#294918'],
  ['#ffed9d', '#f9c92f', '#8e5e0b'],
  ['#9cd9cc', '#4eab92', '#1b5a50'],
  ['#a0bdfc', '#567fce', '#253b72']
];

const distantPieces = [
  [8,11,27,-12], [21,7,21,18], [36,12,24,20], [53,5,19,-12],
  [59,14,24,-17], [53,35,23,11], [61,54,28,-23], [92,23,27,22],
  [96,49,23,-10], [91,78,26,17], [65,84,25,-22], [46,91,22,10],
  [24,91,24,28], [8,84,24,-8]
];

const foregroundPieces = [
  [4,19,43,-22], [46,9,42,16], [53,23,42,25], [60,70,44,-28],
  [57,94,48,22], [95,13,48,-16], [96,62,47,30], [93,88,50,-19],
  [37,94,36,9], [17,93,38,-21], [3,77,36,23], [99,37,40,-18]
];

// Staggered rows overlap at the curved edge, with taller pieces framing the corners.
const bottomPieces = [
  [2,88,82,-24], [9,94,70,19], [16,90,59,-13], [22,96,82,24],
  [28,91,58,-28], [34,96,73,12], [41,92,54,-17], [47,97,91,18],
  [54,91,62,-19], [61,97,83,28], [68,92,57,-15], [74,97,89,18],
  [81,93,58,27], [88,97,90,-16], [94,91,67,22], [99,87,89,-23],
  [4,99,106,28], [14,100,102,-21], [25,101,117,23], [37,101,107,-15],
  [57,102,120,24], [69,101,103,-19], [84,102,115,20], [96,100,118,-28]
];

const waveSpeed = 405;
const waveLife = .85;

export function startPlayLab(reducedMotion) {
  const panel = document.querySelector('.hero');
  const layer = panel.querySelector('.play-pieces');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const pieces = [...distantPieces, ...foregroundPieces, ...bottomPieces].map(([left, top, size, angle], index) => {
    const element = document.createElement('span');
    const distant = index < distantPieces.length;
    const bottom = index >= distantPieces.length + foregroundPieces.length;
    const [shine, face, edge] = colours[index % colours.length];

    element.className = 'play-piece ' + shapes[index % shapes.length];
    element.classList.toggle('is-distant', distant);
    element.classList.toggle('is-bottom', bottom);
    element.style.setProperty('--left', left + '%');
    element.style.setProperty('--top', top + '%');
    const minSize = bottom ? 36 : distant ? 11 : 19;
    element.style.setProperty('--size', `clamp(${minSize}px, ${size / 12}vw, ${size}px)`);
    element.style.setProperty('--angle', angle + 'deg');
    element.style.setProperty('--shine', shine);
    element.style.setProperty('--face', face);
    element.style.setProperty('--edge', edge);
    element.style.setProperty('--piece-opacity', bottom ? '.91' : distant ? '.37' : '.76');
    layer.append(element);

    return {
      element, left: left / 100, top: top / 100, angle,
      phase: index * 2.399, speed: .42 + (index % 7) * .06,
      depth: distant ? .68 : 1,
      x: 0, y: 0, vx: 0, vy: 0
    };
  });

  const ripples = Array.from({ length: 5 }, () => {
    const element = document.createElement('span');
    element.className = 'play-ripple';
    layer.prepend(element);
    return { element, age: waveLife, x: 0, y: 0 };
  });

  let visible = !('IntersectionObserver' in window);
  let frame = 0;
  let previous = null;
  let time = 0;
  let pointer = null;
  let lastWave = null;
  let nextRipple = 0;

  function update(timestamp) {
    const dt = previous === null ? 0 : Math.min((timestamp - previous) / 1000, 1 / 30);
    previous = timestamp;
    time += dt;
    const width = layer.clientWidth;
    const height = layer.clientHeight;
    const hoverRadius = Math.min(215, width * .28);

    for (const wave of ripples) {
      wave.age += dt;
      const opacity = Math.max(0, 1 - wave.age / waveLife);
      if (opacity || wave.element.style.opacity !== '0') {
        wave.element.style.opacity = opacity * .48;
        wave.element.style.transform = `translate3d(${wave.x - 50}px,${wave.y - 50}px,0) scale(${Math.max(.02, wave.age * waveSpeed / 50)})`;
      }
    }

    for (const piece of pieces) {
      const phase = time * piece.speed + piece.phase;
      const driftX = Math.sin(phase) * 15 * piece.depth;
      const driftY = Math.cos(phase * .79 + piece.phase) * 12 * piece.depth;
      const homeX = piece.left * width + driftX;
      const homeY = piece.top * height + driftY;
      let targetX = 0;
      let targetY = 0;

      if (pointer) {
        const dx = homeX - pointer.x;
        const dy = homeY - pointer.y;
        const distance = Math.hypot(dx, dy);
        const angle = distance < 1 ? piece.phase : Math.atan2(dy, dx);
        const push = Math.max(0, 1 - distance / hoverRadius) ** 1.5 * 102;
        targetX = Math.cos(angle) * push;
        targetY = Math.sin(angle) * push;
      }

      for (const wave of ripples) {
        if (wave.age >= waveLife) continue;
        const dx = homeX - wave.x;
        const dy = homeY - wave.y;
        const distance = Math.hypot(dx, dy);
        const band = Math.max(0, 1 - Math.abs(distance - wave.age * waveSpeed) / 88);
        const push = band ** 2 * (1 - wave.age / waveLife) * 58;
        const angle = distance < 1 ? piece.phase : Math.atan2(dy, dx);
        targetX += Math.cos(angle) * push;
        targetY += Math.sin(angle) * push;
      }

      // A damped spring keeps the drift, hover and outgoing waves in one continuous motion.
      piece.vx += ((targetX * piece.depth - piece.x) * 58 - piece.vx * 13) * dt;
      piece.vy += ((targetY * piece.depth - piece.y) * 58 - piece.vy * 13) * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      const turn = piece.angle + Math.sin(phase) * 8 + piece.x * .19 - piece.y * .11;
      piece.element.style.transform = `translate(-50%,-50%) translate3d(${driftX + piece.x}px,${driftY + piece.y}px,0) rotate(${turn}deg)`;
    }
    frame = requestAnimationFrame(update);
  }

  function syncAnimation() {
    const running = visible && !document.hidden && !reducedMotion.matches;
    if (running && !frame) frame = requestAnimationFrame(update);
    if (running) return;
    cancelAnimationFrame(frame);
    frame = 0;
    previous = pointer = lastWave = null;
    for (const wave of ripples) {
      wave.age = waveLife;
      wave.element.style.opacity = '0';
    }
    for (const piece of pieces) {
      piece.x = piece.y = piece.vx = piece.vy = 0;
      piece.element.style.removeProperty('transform');
    }
  }

  panel.addEventListener('pointermove', event => {
    if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
    const box = layer.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (lastWave && (time - lastWave.time < .15 ||
      Math.hypot(pointer.x - lastWave.x, pointer.y - lastWave.y) < 40)) return;

    const wave = ripples[nextRipple];
    wave.x = pointer.x;
    wave.y = pointer.y;
    wave.age = 0;
    lastWave = { ...pointer, time };
    nextRipple = (nextRipple + 1) % ripples.length;
  }, { passive: true });

  function clearPointer() {
    pointer = lastWave = null;
  }

  panel.addEventListener('pointerleave', clearPointer);
  panel.addEventListener('pointercancel', clearPointer);
  finePointer.addEventListener('change', clearPointer);
  reducedMotion.addEventListener('change', syncAnimation);
  document.addEventListener('visibilitychange', syncAnimation);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncAnimation();
    });
    observer.observe(panel);
  }
  syncAnimation();
}
