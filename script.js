const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const canvas = document.querySelector("#sphere-field");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const field = {
  width: 0,
  height: 0,
  ratio: 1,
  tick: 0,
  spheres: [],
  grid: new Map(),
  cellSize: 156,
};
const animatedCounters = new WeakSet();
const neonPalette = [
  { name: "magenta", rgb: "233, 75, 120" },
  { name: "cyan", rgb: "24, 231, 255" },
  { name: "yellow", rgb: "255, 214, 72" },
  { name: "green", rgb: "78, 255, 164" },
];

if (window.lucide) {
  window.lucide.createIcons();
}

function resizeCanvas() {
  field.ratio = Math.min(window.devicePixelRatio || 1, 2);
  field.width = window.innerWidth;
  field.height = window.innerHeight;

  canvas.width = Math.floor(field.width * field.ratio);
  canvas.height = Math.floor(field.height * field.ratio);
  canvas.style.width = `${field.width}px`;
  canvas.style.height = `${field.height}px`;
  ctx.setTransform(field.ratio, 0, 0, field.ratio, 0, 0);

  const total = Math.max(220, Math.min(460, Math.floor(field.width / 3.4)));
  field.spheres = Array.from({ length: total }, (_, index) => ({
    x: (0.04 + Math.random() * 0.92) * field.width,
    y: (0.06 + Math.random() * 0.88) * field.height,
    vx: (Math.random() - 0.5) * (0.08 + Math.random() * 0.22),
    vy: (Math.random() - 0.5) * (0.08 + Math.random() * 0.22),
    radius: 0.35 + Math.random() * 0.75,
    color: neonPalette[Math.floor(Math.random() * neonPalette.length)],
    activity: 0,
    drift: Math.random() * Math.PI * 2,
  }));
}

function drawSphereField() {
  field.tick += 0.018;
  ctx.clearRect(0, 0, field.width, field.height);
  const connectionDistance = 92;
  const connectionDistanceSq = connectionDistance * connectionDistance;
  const minDistance = 42;
  const minDistanceSq = minDistance * minDistance;

  field.grid.clear();

  field.spheres.forEach((sphere, index) => {
    if (!reduceMotion) {
      sphere.x += sphere.vx + Math.cos(field.tick * 0.7 + sphere.drift) * 0.12;
      sphere.y += sphere.vy + Math.sin(field.tick * 0.62 + sphere.drift) * 0.12;
      sphere.vx *= 0.998;
      sphere.vy *= 0.998;
    }

    if (sphere.x < -20) sphere.x = field.width + 20;
    if (sphere.x > field.width + 20) sphere.x = -20;
    if (sphere.y < -20) sphere.y = field.height + 20;
    if (sphere.y > field.height + 20) sphere.y = -20;
    sphere.activity *= 0.86;

    const cellX = Math.floor(sphere.x / field.cellSize);
    const cellY = Math.floor(sphere.y / field.cellSize);
    const key = `${cellX}:${cellY}`;

    if (!field.grid.has(key)) {
      field.grid.set(key, []);
    }

    field.grid.get(key).push(index);
  });

  field.spheres.forEach((sphere, index) => {
    const cellX = Math.floor(sphere.x / field.cellSize);
    const cellY = Math.floor(sphere.y / field.cellSize);

    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const neighbors = field.grid.get(`${cellX + offsetX}:${cellY + offsetY}`);
        if (!neighbors) continue;

        neighbors.forEach((nextIndex) => {
          if (nextIndex <= index) return;

          const next = field.spheres[nextIndex];
          const diffX = sphere.x - next.x;
          const diffY = sphere.y - next.y;
          const distanceSq = diffX * diffX + diffY * diffY;

          if (!reduceMotion && distanceSq > 0.01 && distanceSq < minDistanceSq) {
            const distance = Math.sqrt(distanceSq);
            const push = (minDistance - distance) / minDistance;
            const dx = diffX / distance;
            const dy = diffY / distance;
            sphere.vx += dx * push * 0.035;
            sphere.vy += dy * push * 0.035;
            next.vx -= dx * push * 0.035;
            next.vy -= dy * push * 0.035;
          }

          if (distanceSq >= connectionDistanceSq) return;

          const distance = Math.sqrt(distanceSq);
          const strength = 1 - distance / connectionDistance;
          sphere.activity = Math.max(sphere.activity, strength);
          next.activity = Math.max(next.activity, strength);
          const pulse = 0.58 + Math.sin(field.tick * 8 + index + nextIndex) * 0.42;
          const flash = strength > 0.68 ? 0.22 * pulse : 0;
        const opacity = strength * (0.11 + pulse * 0.11) + flash * 0.6;
          const lineColor = sphere.color.name === next.color.name ? sphere.color.rgb : next.color.rgb;

          ctx.strokeStyle = `rgba(${lineColor}, ${opacity})`;
          ctx.lineWidth = 0.45 + pulse * 0.45;
          ctx.beginPath();
          ctx.moveTo(sphere.x, sphere.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();

          if (strength > 0.58) {
            const midX = (sphere.x + next.x) / 2;
            const midY = (sphere.y + next.y) / 2;
            const glowRadius = 1.2 + strength * 3.2 * pulse;
            ctx.fillStyle = `rgba(${lineColor}, ${0.18 * strength})`;
            ctx.beginPath();
            ctx.arc(midX, midY, glowRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
    }
  });

  field.spheres.forEach((sphere, index) => {
    const spherePulse = 0.72 + Math.sin(field.tick * 5 + index) * 0.18;
    const sphereColor = sphere.color.rgb;
    const haloRadius = sphere.radius * (4.2 + sphere.activity * 2.4);

    ctx.fillStyle = `rgba(${sphereColor}, ${0.018 + sphere.activity * 0.2})`;
    ctx.beginPath();
    ctx.arc(sphere.x, sphere.y, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${sphereColor}, ${0.12 + sphere.activity * 0.68 * spherePulse})`;
    ctx.beginPath();
    ctx.arc(sphere.x, sphere.y, sphere.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 246, 230, ${0.08 + sphere.activity * 0.46})`;
    ctx.beginPath();
    ctx.arc(sphere.x, sphere.y, Math.max(0.5, sphere.radius * 0.28), 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(drawSphereField);
}

menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll(".count-up").forEach(animateCounter);
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

function animateCounter(element) {
  if (animatedCounters.has(element)) return;
  animatedCounters.add(element);

  const target = Number(element.dataset.target || 0);
  const prefix = element.dataset.prefix || "";
  const suffix = element.dataset.suffix || "";
  const format = element.dataset.format;
  const duration = 900;
  const startedAt = performance.now();

  function render(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    const renderedValue = format ? value.toLocaleString(format) : String(value);

    element.textContent = `${prefix}${renderedValue}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(render);
    }
  }

  requestAnimationFrame(render);
}

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index * 35, 220)}ms`;
  revealObserver.observe(element);
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
drawSphereField();
