const palette = [
  ['#c6e783', '#78a53b', '#3b5f21'],
  ['#ffed9d', '#efbf32', '#95680e'],
  ['#a1ded1', '#58a992', '#225d50'],
  ['#adc4fa', '#6788cc', '#304775'],
];

function makeSprites() {
  return palette.flatMap(([light, face, edge]) => ['block', 'ring', 'cross'].map(shape => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 80;
    const pen = tile.getContext('2d');
    const paint = pen.createLinearGradient(20, 16, 59, 66);
    paint.addColorStop(0, light);
    paint.addColorStop(.44, face);
    paint.addColorStop(1, edge);
    pen.shadowColor = '#08150eaa';
    pen.shadowBlur = 6;
    pen.shadowOffsetY = 5;
    pen.fillStyle = paint;
    pen.beginPath();
    if (shape === 'cross') {
      pen.roundRect(17, 31, 46, 14, 4);
      pen.roundRect(33, 15, 14, 46, 4);
      pen.fill();
    } else {
      pen.roundRect(17, 15, 46, 46, shape === 'ring' ? 23 : 12);
      pen.moveTo(49, 37);
      pen.arc(40, 37, shape === 'ring' ? 9 : 6, 0, Math.PI * 2);
      pen.fill('evenodd');
    }
    return tile;
  }));
}

export function startNewsletterWater(reducedMotion) {
  const canvas = document.querySelector('.newsletter-water');
  const pen = canvas.getContext('2d');
  if (!pen) return;

  const panel = canvas.parentElement;
  const sprites = makeSprites();
  const step = 1 / 120;
  let width, height, spacing, rest, pieces, surface, velocity, scaleX, scaleY;
  let frame = 0;
  let time = 0;
  let previous = 0;
  let accumulator = 0;
  let pointer = null;
  let visible = !('IntersectionObserver' in window);

  function measure() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    scaleX = canvas.width / width;
    scaleY = canvas.height / height;
    const columns = Math.ceil(width / 20) + 2;
    spacing = width / (columns - 2);
    rest = height - parseFloat(getComputedStyle(panel).paddingBottom) + 30;
    surface = new Float32Array(columns);
    velocity = new Float32Array(columns);
    pieces = Array.from({ length: columns * 5 }, (_, i) => {
      const column = i % columns;
      const row = Math.floor(i / columns);
      const variation = Math.sin(i * 2.399);
      return {
        column, row,
        x: (column - .5 + (row % 2) * .5) * spacing + variation * 6,
        y: row * (height - rest) / 4 + variation * 8,
        size: 31 + (i * 7 % 14),
        angle: variation * .85,
        sprite: sprites[(i * 5 + row) % sprites.length],
      };
    });
    pointer = null;
    draw();
  }

  function draw() {
    if (!pieces) return;
    pen.resetTransform();
    pen.clearRect(0, 0, canvas.width, canvas.height);
    for (const piece of pieces) {
      const wave = surface[piece.column] * (1 - piece.row * .17);
      const swell = Math.sin(time * 1.4 - piece.x * .013) * (11 - piece.row * 1.6);
      const drift = Math.sin(time + piece.angle * 4) * 3;
      const next = surface[Math.min(piece.column + 1, surface.length - 1)];
      const tilt = (next - surface[piece.column]) * .014;
      const cos = Math.cos(piece.angle + tilt);
      const sin = Math.sin(piece.angle + tilt);
      pen.setTransform(cos * scaleX, sin * scaleY, -sin * scaleX, cos * scaleY,
        (piece.x + drift) * scaleX, (rest + piece.y + wave + swell) * scaleY);
      pen.drawImage(piece.sprite, -piece.size / 2, -piece.size / 2, piece.size, piece.size);
    }
  }

  function update(timestamp) {
    const elapsed = previous ? Math.min((timestamp - previous) / 1000, 1 / 24) : 0;
    previous = timestamp;
    time += elapsed;
    accumulator += elapsed;
    const contact = pointer ? Math.max(0, 1 - Math.abs(pointer.y - rest - 12) / 130) : 0;
    while (accumulator >= step) {
      for (let i = 0; i < surface.length; i++) {
        const level = surface[i];
        const left = surface[Math.max(0, i - 1)];
        const right = surface[Math.min(i + 1, surface.length - 1)];
        const distance = contact ? ((i - .5) * spacing - pointer.x) / 92 : 0;
        const pressure = Math.abs(distance) < 2
          ? contact * Math.exp(-distance * distance * 2) * 590 : 0;
        velocity[i] += ((left + right - 2 * level) * 260 - level * 10 - velocity[i] * 2.65 + pressure) * step;
      }
      for (let i = 0; i < surface.length; i++) surface[i] += velocity[i] * step;
      accumulator -= step;
    }
    draw();
    frame = requestAnimationFrame(update);
  }

  function sync() {
    const running = visible && !document.hidden && !reducedMotion.matches;
    if (running && !frame) frame = requestAnimationFrame(update);
    if (running) return;
    cancelAnimationFrame(frame);
    frame = previous = accumulator = 0;
    pointer = null;
    surface?.fill(0);
    velocity?.fill(0);
    if (reducedMotion.matches) time = 0;
    draw();
  }

  panel.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !frame || event.pointerType === 'touch') return;
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const now = event.timeStamp;
    const before = pointer;
    pointer = { x, y, now };
    if (!before || now - before.now > 110) return;
    const dx = x - before.x;
    const dy = y - before.y;
    const distance = Math.hypot(dx, dy);
    const proximity = Math.max(0, 1 - Math.abs(y - rest - 12) / 116);
    const force = Math.min(distance, 42) * 9 * proximity;
    if (!force) return;
    const direction = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 1;
    const centre = (x + before.x) / 2;
    const radius = 58 + Math.min(Math.abs(dx) / 3, 70);
    for (let i = 0; i < surface.length; i++) {
      const offset = ((i - .5) * spacing - centre) / radius;
      if (Math.abs(offset) > 2) continue;
      // The leading crest lifts while the trough behind the pointer sinks.
      const wake = Math.exp(-offset * offset * 2) * (dy > 0 ? .26 : -.48)
        - direction * offset * Math.exp(-offset * offset * 1.5) * 1.3;
      velocity[i] += force * wake;
    }
  }, { passive: true });
  panel.addEventListener('pointerleave', () => { pointer = null; });
  panel.addEventListener('pointercancel', () => { pointer = null; });
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(canvas);
  else addEventListener('resize', measure);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(panel);
  }
  measure();
  sync();
}
