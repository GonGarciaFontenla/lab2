// ═══════════════════════════════════════════════════════════
// STARFIELD — enhanced animated canvas background
// ═══════════════════════════════════════════════════════════
(function() {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let shootingStars = [];
  const STAR_COUNT = 280;
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: Math.random() * 1.6 + 0.2,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.001 + 0.0002,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.85 ? (Math.random() > 0.5 ? 180 : 270) : 220,
      });
    }
  }

  function spawnShootingStar() {
    if (Math.random() < 0.0025 && shootingStars.length < 2) {
      const startX = Math.random() * w * 0.7;
      const startY = Math.random() * h * 0.4;
      shootingStars.push({
        x: startX,
        y: startY,
        len: Math.random() * 80 + 50,
        speed: Math.random() * 7 + 5,
        alpha: 1,
        hue: Math.random() > 0.5 ? 180 : 270,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const time = Date.now();

    // Stars with twinkle & subtle color
    for (const star of stars) {
      const twinkle = Math.sin(time * star.speed + star.phase) * 0.4 + 0.6;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${star.hue}, 60%, 85%, ${star.alpha * twinkle})`;
      ctx.fill();
    }

    // Shooting stars
    spawnShootingStar();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      const gradient = ctx.createLinearGradient(
        ss.x, ss.y, ss.x - ss.len, ss.y - ss.len * 0.3
      );
      gradient.addColorStop(0, `hsla(${ss.hue}, 100%, 70%, ${ss.alpha})`);
      gradient.addColorStop(0.4, `hsla(${ss.hue}, 100%, 70%, ${ss.alpha * 0.4})`);
      gradient.addColorStop(1, `hsla(${ss.hue}, 100%, 70%, 0)`);

      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.len, ss.y - ss.len * 0.3);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Glow dot at head
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${ss.hue}, 100%, 90%, ${ss.alpha})`;
      ctx.fill();

      ss.x += ss.speed;
      ss.y += ss.speed * 0.3;
      ss.alpha -= 0.01;

      if (ss.alpha <= 0 || ss.x > w + 100) {
        shootingStars.splice(i, 1);
      }
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    resize();
    createStars();
  });

  resize();
  createStars();
  draw();
})();

// ═══════════════════════════════════════════════════════════
// SPACE ROCKET — Flying rocket with thrust flame & smoke particles
// ═══════════════════════════════════════════════════════════
(function() {
  const canvas = document.getElementById('rocketCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  let rocket = null;
  let particles = [];
  let nextLaunchTime = Date.now() + 2000; // First launch after 2 seconds

  function spawnRocket() {
    // Choose start position outside viewport
    const startSide = Math.random() > 0.5 ? 'left' : 'bottom';
    let startX, startY, targetX, targetY;

    if (startSide === 'left') {
      startX = -120;
      startY = h * (0.3 + Math.random() * 0.5);
      targetX = w + 120;
      targetY = startY - (h * (0.2 + Math.random() * 0.3));
    } else {
      startX = w * (0.1 + Math.random() * 0.5);
      startY = h + 120;
      targetX = startX + (w * (0.3 + Math.random() * 0.4));
      targetY = -120;
    }

    const angle = Math.atan2(targetY - startY, targetX - startX);
    const speed = 2.5 + Math.random() * 2.0;

    rocket = {
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: angle,
      size: 28,
      active: true
    };
  }

  function drawRocket(r) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle + Math.PI / 2); // Align rocket along flight direction

    // Thruster Flame
    const time = Date.now();
    const flameHeight = 22 + Math.sin(time * 0.05) * 6;
    
    // Outer flame
    const outerFlame = ctx.createLinearGradient(0, 15, 0, 15 + flameHeight);
    outerFlame.addColorStop(0, '#ff4500');
    outerFlame.addColorStop(0.5, '#ff8c00');
    outerFlame.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = outerFlame;
    ctx.beginPath();
    ctx.moveTo(-6, 15);
    ctx.lineTo(6, 15);
    ctx.lineTo(0, 15 + flameHeight);
    ctx.closePath();
    ctx.fill();

    // Inner flame
    const innerFlame = ctx.createLinearGradient(0, 15, 0, 15 + flameHeight * 0.6);
    innerFlame.addColorStop(0, '#ffffff');
    innerFlame.addColorStop(0.5, '#00f0ff');
    innerFlame.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = innerFlame;
    ctx.beginPath();
    ctx.moveTo(-3, 15);
    ctx.lineTo(3, 15);
    ctx.lineTo(0, 15 + flameHeight * 0.6);
    ctx.closePath();
    ctx.fill();

    // Rocket Body (Sleek Metallic Fuselage)
    const bodyGrad = ctx.createLinearGradient(-10, 0, 10, 0);
    bodyGrad.addColorStop(0, '#e2e8f0');
    bodyGrad.addColorStop(0.5, '#ffffff');
    bodyGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(0, -26); // Nose tip
    ctx.bezierCurveTo(10, -10, 10, 10, 8, 15);
    ctx.lineTo(-8, 15);
    ctx.bezierCurveTo(-10, 10, -10, -10, 0, -26);
    ctx.closePath();
    ctx.fill();

    // Red Nose Cone (Teraclaude Accent)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.bezierCurveTo(5, -18, 5, -12, 6, -10);
    ctx.lineTo(-6, -10);
    ctx.bezierCurveTo(-5, -12, -5, -18, 0, -26);
    ctx.closePath();
    ctx.fill();

    // Fins
    ctx.fillStyle = '#00f0ff'; // Cyan neon fins
    // Left fin
    ctx.beginPath();
    ctx.moveTo(-8, 5);
    ctx.lineTo(-15, 18);
    ctx.lineTo(-7, 15);
    ctx.closePath();
    ctx.fill();

    // Right fin
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.lineTo(15, 18);
    ctx.lineTo(7, 15);
    ctx.closePath();
    ctx.fill();

    // Porthole Window
    ctx.beginPath();
    ctx.arc(0, -2, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Window Reflection
    ctx.beginPath();
    ctx.arc(-1, -3, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  function spawnParticle(x, y, angle) {
    const spread = (Math.random() - 0.5) * 0.4;
    const speed = 1 + Math.random() * 1.5;
    const pAngle = angle + Math.PI + spread;
    particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(pAngle) * speed,
      vy: Math.sin(pAngle) * speed,
      radius: 2 + Math.random() * 3,
      alpha: 0.7,
      color: Math.random() > 0.4 ? 'rgba(0, 240, 255,' : 'rgba(168, 85, 247,'
    });
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);
    const now = Date.now();

    // Check if it's time to launch a new rocket
    if (!rocket && now >= nextLaunchTime) {
      spawnRocket();
    }

    if (rocket) {
      rocket.x += rocket.vx;
      rocket.y += rocket.vy;

      // Emit thruster smoke/sparkles
      const tailX = rocket.x - Math.cos(rocket.angle) * 20;
      const tailY = rocket.y - Math.sin(rocket.angle) * 20;
      for (let i = 0; i < 2; i++) {
        spawnParticle(tailX, tailY, rocket.angle);
      }

      drawRocket(rocket);

      // Check out of bounds
      if (rocket.x > w + 200 || rocket.x < -200 || rocket.y < -200 || rocket.y > h + 200) {
        rocket = null;
        // Schedule next rocket launch between 12 to 24 seconds later
        nextLaunchTime = now + 12000 + Math.random() * 12000;
      }
    }

    // Update and draw trail particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.015;
      p.radius += 0.05;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
})();

// ═══════════════════════════════════════════════════════════
// PLANETS — Procedural orbiting planets in the background
// ═══════════════════════════════════════════════════════════
(function() {
  const canvas = document.getElementById('planetsCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;
  let mouseX = 0, mouseY = 0;
  let smoothMouseX = 0, smoothMouseY = 0;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / w - 0.5) * 2;
    mouseY = (e.clientY / h - 0.5) * 2;
  });

  // Planet definitions — each is a unique world
  const planets = [
    {
      name: 'Aethon',
      radius: 38,
      orbitCenterX: 0.12,
      orbitCenterY: 0.25,
      orbitRadiusX: 30,
      orbitRadiusY: 15,
      orbitSpeed: 0.00012,
      phase: 0,
      parallax: 0.025,
      type: 'gas',
      baseHue: 270,
      bandColors: [
        'rgba(120, 60, 200, 0.6)',
        'rgba(168, 85, 247, 0.5)',
        'rgba(100, 40, 180, 0.55)',
        'rgba(140, 70, 220, 0.45)',
        'rgba(80, 30, 160, 0.5)',
      ],
      glowColor: 'rgba(168, 85, 247, 0.15)',
      glowSize: 20,
      hasRing: false,
      moons: 1,
      opacity: 0.35,
      rotation: 0,
      rotationSpeed: 0.0003,
    },
    {
      name: 'Cryos',
      radius: 55,
      orbitCenterX: 0.85,
      orbitCenterY: 0.65,
      orbitRadiusX: 40,
      orbitRadiusY: 20,
      orbitSpeed: 0.00008,
      phase: Math.PI * 0.7,
      parallax: 0.035,
      type: 'ringed',
      baseHue: 35,
      bandColors: [
        'rgba(210, 170, 100, 0.5)',
        'rgba(240, 200, 130, 0.4)',
        'rgba(190, 150, 80, 0.5)',
        'rgba(220, 180, 110, 0.45)',
        'rgba(180, 140, 70, 0.5)',
        'rgba(200, 160, 90, 0.4)',
      ],
      glowColor: 'rgba(251, 191, 36, 0.12)',
      glowSize: 28,
      hasRing: true,
      ringColor1: 'rgba(251, 191, 36, 0.18)',
      ringColor2: 'rgba(245, 158, 11, 0.08)',
      ringInner: 1.3,
      ringOuter: 2.1,
      ringTilt: 0.35,
      moons: 2,
      opacity: 0.30,
      rotation: 0,
      rotationSpeed: 0.00015,
    },
    {
      name: 'Verdantis',
      radius: 26,
      orbitCenterX: 0.55,
      orbitCenterY: 0.80,
      orbitRadiusX: 25,
      orbitRadiusY: 12,
      orbitSpeed: 0.00018,
      phase: Math.PI * 1.3,
      parallax: 0.02,
      type: 'terrestrial',
      baseHue: 160,
      bandColors: [
        'rgba(20, 120, 90, 0.5)',
        'rgba(34, 197, 94, 0.4)',
        'rgba(15, 100, 75, 0.5)',
        'rgba(52, 211, 153, 0.35)',
      ],
      glowColor: 'rgba(52, 211, 153, 0.12)',
      glowSize: 14,
      hasRing: false,
      moons: 0,
      opacity: 0.28,
      rotation: 0,
      rotationSpeed: 0.0005,
    },
    {
      name: 'Nereid',
      radius: 44,
      orbitCenterX: 0.25,
      orbitCenterY: 0.70,
      orbitRadiusX: 35,
      orbitRadiusY: 18,
      orbitSpeed: 0.0001,
      phase: Math.PI * 0.4,
      parallax: 0.03,
      type: 'ice',
      baseHue: 195,
      bandColors: [
        'rgba(0, 160, 200, 0.45)',
        'rgba(0, 200, 240, 0.35)',
        'rgba(0, 140, 180, 0.5)',
        'rgba(0, 180, 220, 0.4)',
        'rgba(0, 120, 160, 0.45)',
      ],
      glowColor: 'rgba(0, 240, 255, 0.10)',
      glowSize: 22,
      hasRing: true,
      ringColor1: 'rgba(0, 240, 255, 0.10)',
      ringColor2: 'rgba(0, 180, 220, 0.04)',
      ringInner: 1.25,
      ringOuter: 1.8,
      ringTilt: 0.25,
      moons: 1,
      opacity: 0.25,
      rotation: 0,
      rotationSpeed: 0.0002,
    },
    {
      name: 'Ignara',
      radius: 20,
      orbitCenterX: 0.75,
      orbitCenterY: 0.18,
      orbitRadiusX: 20,
      orbitRadiusY: 10,
      orbitSpeed: 0.00025,
      phase: Math.PI * 1.8,
      parallax: 0.015,
      type: 'terrestrial',
      baseHue: 15,
      bandColors: [
        'rgba(200, 80, 40, 0.5)',
        'rgba(244, 114, 70, 0.4)',
        'rgba(180, 60, 30, 0.55)',
        'rgba(220, 100, 50, 0.45)',
      ],
      glowColor: 'rgba(244, 114, 70, 0.10)',
      glowSize: 10,
      hasRing: false,
      moons: 0,
      opacity: 0.22,
      rotation: 0,
      rotationSpeed: 0.0006,
    },
  ];

  // Generate moon data for each planet
  planets.forEach(p => {
    p.moonData = [];
    for (let i = 0; i < p.moons; i++) {
      p.moonData.push({
        distance: p.radius * (1.8 + i * 0.7),
        size: 2.5 + Math.random() * 2,
        speed: 0.001 + Math.random() * 0.002,
        phase: Math.random() * Math.PI * 2,
        brightness: 0.4 + Math.random() * 0.3,
      });
    }
  });

  function drawPlanet(planet, time) {
    // Calculate orbital position
    const orbitAngle = time * planet.orbitSpeed + planet.phase;
    const baseX = planet.orbitCenterX * w + Math.cos(orbitAngle) * planet.orbitRadiusX;
    const baseY = planet.orbitCenterY * h + Math.sin(orbitAngle) * planet.orbitRadiusY;

    // Add parallax
    const px = baseX + smoothMouseX * planet.parallax * w * 0.5;
    const py = baseY + smoothMouseY * planet.parallax * h * 0.5;

    const r = planet.radius;

    ctx.save();
    ctx.globalAlpha = planet.opacity;

    // Outer atmospheric glow
    const glowGrad = ctx.createRadialGradient(px, py, r * 0.5, px, py, r + planet.glowSize);
    glowGrad.addColorStop(0, planet.glowColor);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(px, py, r + planet.glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw ring behind planet (bottom half)
    if (planet.hasRing) {
      drawRing(px, py, planet, time, 'behind');
    }

    // Planet body — clipped circle with bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.clip();

    // Base gradient
    const baseGrad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r);
    baseGrad.addColorStop(0, 'hsla(' + planet.baseHue + ', 40%, 30%, 0.8)');
    baseGrad.addColorStop(1, 'hsla(' + planet.baseHue + ', 50%, 12%, 0.9)');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);

    // Surface bands (rotate over time)
    planet.rotation += planet.rotationSpeed;
    const bandOffset = (planet.rotation % (Math.PI * 2));
    const bandCount = planet.bandColors.length;
    const bandHeight = (r * 2) / bandCount;

    for (let i = 0; i < bandCount; i++) {
      const yOff = py - r + i * bandHeight;
      const wave = Math.sin(bandOffset + i * 0.8) * 3;
      ctx.fillStyle = planet.bandColors[i];
      ctx.beginPath();
      ctx.ellipse(px + wave, yOff + bandHeight * 0.5, r * 1.1, bandHeight * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Storm spot for gas giants
    if (planet.type === 'gas' || planet.type === 'ice') {
      const stormX = px + Math.cos(planet.rotation * 2) * r * 0.4;
      const stormY = py + r * 0.15;
      const stormGrad = ctx.createRadialGradient(stormX, stormY, 0, stormX, stormY, r * 0.2);
      stormGrad.addColorStop(0, 'hsla(' + (planet.baseHue + 30) + ', 60%, 50%, 0.3)');
      stormGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = stormGrad;
      ctx.beginPath();
      ctx.ellipse(stormX, stormY, r * 0.2, r * 0.12, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Atmosphere edge highlight
    const atmosGrad = ctx.createRadialGradient(px - r * 0.35, py - r * 0.35, r * 0.2, px, py, r);
    atmosGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    atmosGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    atmosGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = atmosGrad;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);

    // Terminator shadow (day/night line)
    const shadowGrad = ctx.createLinearGradient(px - r, py, px + r, py);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);

    ctx.restore();

    // Specular highlight (shiny spot)
    const specGrad = ctx.createRadialGradient(
      px - r * 0.3, py - r * 0.3, 0,
      px - r * 0.3, py - r * 0.3, r * 0.5
    );
    specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    // Draw ring in front of planet (top half)
    if (planet.hasRing) {
      drawRing(px, py, planet, time, 'front');
    }

    // Moons
    planet.moonData.forEach(moon => {
      const moonAngle = time * moon.speed + moon.phase;
      const mx = px + Math.cos(moonAngle) * moon.distance;
      const my = py + Math.sin(moonAngle) * moon.distance * 0.4;

      // Moon glow
      const moonGlow = ctx.createRadialGradient(mx, my, 0, mx, my, moon.size * 3);
      moonGlow.addColorStop(0, 'rgba(255, 255, 255, ' + (moon.brightness * 0.15) + ')');
      moonGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(mx, my, moon.size * 3, 0, Math.PI * 2);
      ctx.fill();

      // Moon body
      const moonBodyGrad = ctx.createRadialGradient(mx - 1, my - 1, 0, mx, my, moon.size);
      moonBodyGrad.addColorStop(0, 'rgba(220, 225, 240, ' + moon.brightness + ')');
      moonBodyGrad.addColorStop(1, 'rgba(140, 150, 180, ' + (moon.brightness * 0.6) + ')');
      ctx.fillStyle = moonBodyGrad;
      ctx.beginPath();
      ctx.arc(mx, my, moon.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawRing(cx, cy, planet, time, layer) {
    if (!planet.hasRing) return;
    ctx.save();

    const r = planet.radius;
    const innerR = r * planet.ringInner;
    const outerR = r * planet.ringOuter;
    const tilt = planet.ringTilt;

    // We draw the ring as a flattened ellipse
    // 'behind' draws the bottom arc, 'front' draws the top arc
    const segments = 120;
    const ringWidth = outerR - innerR;
    const particleLayers = 4;

    for (let layer_i = 0; layer_i < particleLayers; layer_i++) {
      const layerR = innerR + (ringWidth * layer_i / particleLayers);
      const layerAlpha = 1 - (layer_i / particleLayers) * 0.5;

      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;

        // Only draw relevant half
        if (layer === 'behind' && angle > 0 && angle < Math.PI) continue;
        if (layer === 'front' && (angle <= 0 || angle >= Math.PI)) continue;

        const rx = cx + Math.cos(angle) * layerR;
        const ry = cy + Math.sin(angle) * layerR * tilt;

        if (i === 0 || (layer === 'behind' && i === Math.ceil(segments / 2)) || (layer === 'front' && i === 1)) {
          ctx.moveTo(rx, ry);
        } else {
          ctx.lineTo(rx, ry);
        }
      }

      const grad = ctx.createLinearGradient(cx - outerR, cy, cx + outerR, cy);
      grad.addColorStop(0, planet.ringColor2);
      grad.addColorStop(0.3, planet.ringColor1);
      grad.addColorStop(0.5, planet.ringColor1);
      grad.addColorStop(0.7, planet.ringColor1);
      grad.addColorStop(1, planet.ringColor2);

      ctx.strokeStyle = grad;
      ctx.lineWidth = (ringWidth / particleLayers) * 0.6;
      ctx.globalAlpha = planet.opacity * layerAlpha;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Subtle orbital path indicator
  function drawOrbitPath(planet, time) {
    const cx = planet.orbitCenterX * w + smoothMouseX * planet.parallax * w * 0.5;
    const cy = planet.orbitCenterY * h + smoothMouseY * planet.parallax * h * 0.5;

    ctx.save();
    ctx.globalAlpha = 0.025;
    ctx.strokeStyle = planet.glowColor.replace(/[\d.]+\)$/, '0.4)');
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, planet.orbitRadiusX, planet.orbitRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function animate() {
    const time = Date.now();

    // Smooth mouse tracking
    smoothMouseX += (mouseX - smoothMouseX) * 0.03;
    smoothMouseY += (mouseY - smoothMouseY) * 0.03;

    ctx.clearRect(0, 0, w, h);

    // Draw orbit paths first (very subtle)
    planets.forEach(p => drawOrbitPath(p, time));

    // Draw planets
    planets.forEach(p => drawPlanet(p, time));

    requestAnimationFrame(animate);
  }

  animate();
})();

// ═══════════════════════════════════════════════════════════
// PARALLAX — Nebula orbs follow mouse
// ═══════════════════════════════════════════════════════════
(function() {
  const orbs = [
    { el: document.getElementById('nebulaCyan'),   factor: 0.02 },
    { el: document.getElementById('nebulaPurple'), factor: -0.015 },
    { el: document.getElementById('nebulaPink'),   factor: 0.025 },
    { el: document.getElementById('nebulaGreen'),  factor: -0.02 },
  ];

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  document.addEventListener('mousemove', (e) => {
    targetX = (e.clientX - window.innerWidth / 2);
    targetY = (e.clientY - window.innerHeight / 2);
  });

  function animate() {
    currentX += (targetX - currentX) * 0.04;
    currentY += (targetY - currentY) * 0.04;

    for (const orb of orbs) {
      if (orb.el) {
        orb.el.style.transform = `translate(${currentX * orb.factor}px, ${currentY * orb.factor}px)`;
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
})();

// ═══════════════════════════════════════════════════════════
// ANIMATED COUNTERS — count-up on load
// ═══════════════════════════════════════════════════════════
(function() {
  const counters = document.querySelectorAll('.stat-card__number[data-count]');
  const duration = 1200;

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        if (target === 0) { el.textContent = '0'; return; }
        const start = performance.now();

        function update(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const value = Math.round(easeOutExpo(progress) * target);
          el.textContent = value.toLocaleString();
          if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(c => observer.observe(c));
})();

// ═══════════════════════════════════════════════════════════
// SEARCH — live filter notes
// ═══════════════════════════════════════════════════════════
(function() {
  const searchInput = document.getElementById('searchInput');
  const searchBar = document.getElementById('searchBar');
  const searchClear = document.getElementById('searchClear');
  const noResults = document.getElementById('noResults');
  const visibleCount = document.getElementById('visibleCount');
  const filterInfo = document.getElementById('filterInfo');

  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const cards = document.querySelectorAll('.note-card');
    let visible = 0;

    searchBar.classList.toggle('search-bar--active', query.length > 0);

    cards.forEach(card => {
      const title = (card.dataset.title || '').toLowerCase();
      const content = (card.dataset.content || '').toLowerCase();
      const match = !query || title.includes(query) || content.includes(query);
      card.classList.toggle('is-hidden', !match);
      if (match) visible++;
    });

    if (visibleCount) visibleCount.textContent = visible;
    if (noResults) noResults.classList.toggle('is-visible', visible === 0 && cards.length > 0);
    if (filterInfo) {
      filterInfo.textContent = query ? `Showing ${visible} of ${cards.length}` : '';
    }
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.focus();
  });
})();

// ═══════════════════════════════════════════════════════════
// FORM — AJAX submission (no page reload)
// ═══════════════════════════════════════════════════════════
const noteForm = document.getElementById('noteForm');
const submitBtn = document.getElementById('submitBtn');

if (noteForm) {
  noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) return;

    submitBtn.classList.add('is-loading');
    submitBtn.querySelector('span:last-child').textContent = 'Launching...';

    try {
      const formData = new URLSearchParams(new FormData(noteForm));
      const res = await fetch('/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (res.ok) {
        showToast('Note launched into the cosmos! ✨', 'success');
        setTimeout(() => location.reload(), 500);
      } else {
        showToast('Failed to launch note', 'error');
      }
    } catch (err) {
      showToast('Network error — check your connection', 'error');
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.querySelector('span:last-child').textContent = 'Launch Note';
    }
  });
}

// ═══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in inputs
  const tag = document.activeElement.tagName;
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  // Ctrl/Cmd + Enter — submit form
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const titulo = document.getElementById('titulo');
    if (titulo.value.trim()) {
      noteForm.dispatchEvent(new Event('submit', { cancelable: true }));
    }
    return;
  }

  // Escape — close modal or clear search
  if (e.key === 'Escape') {
    closeModal();
    const searchInput = document.getElementById('searchInput');
    if (document.activeElement === searchInput) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.blur();
    }
    return;
  }

  if (isInput) return;

  // "/" — focus search
  if (e.key === '/') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
    return;
  }

  // "N" — open form panel and focus new note title
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    const wrapper = document.getElementById('formPanelWrapper');
    const fab = document.getElementById('fabNewNote');
    if (!wrapper.classList.contains('is-open')) {
      wrapper.classList.add('is-open');
      fab.classList.add('is-open');
    }
    setTimeout(() => document.getElementById('titulo').focus(), 350);
    return;
  }
});

// ═══════════════════════════════════════════════════════════
// PIN — toggle pin status
// ═══════════════════════════════════════════════════════════
async function togglePin(id) {
  try {
    const res = await fetch(`/notas/${id}/pin`, { method: 'PATCH' });
    if (res.ok) {
      const data = await res.json();
      showToast(data.pinned ? 'Note pinned 📌' : 'Note unpinned', 'info');
      setTimeout(() => location.reload(), 400);
    } else {
      showToast('Failed to pin note', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// EDIT — inline editing
// ═══════════════════════════════════════════════════════════
function startEdit(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (!card || card.classList.contains('is-editing')) return;

  card.classList.add('is-editing');

  const titleEl = document.getElementById(`title-${id}`);
  const bodyEl = document.getElementById(`body-${id}`);

  const originalTitle = card.dataset.title;
  const originalContent = card.dataset.content;

  // Replace title with input
  const titleInput = document.createElement('input');
  titleInput.className = 'note-card__title-input';
  titleInput.value = originalTitle;
  titleInput.setAttribute('data-original', originalTitle);
  titleEl.replaceWith(titleInput);
  titleInput.id = `title-${id}`;

  // Replace body with textarea
  const bodyTextarea = document.createElement('textarea');
  bodyTextarea.className = 'note-card__body-edit';
  bodyTextarea.value = originalContent;
  bodyTextarea.setAttribute('data-original', originalContent);
  bodyEl.replaceWith(bodyTextarea);
  bodyTextarea.id = `body-${id}`;

  // Add save/cancel buttons
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'note-card__edit-actions';
  actionsDiv.innerHTML = `
    <button class="btn-save-edit" onclick="saveEdit(${id})">💾 Save</button>
    <button class="btn-cancel-edit" onclick="cancelEdit(${id}, '${originalTitle.replace(/'/g, "\\\'")}', '${originalContent.replace(/'/g, "\\\'")}')">✖ Cancel</button>
  `;
  bodyTextarea.after(actionsDiv);

  titleInput.focus();

  // Ctrl+Enter to save within edit
  const editKeyHandler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      saveEdit(id);
      document.removeEventListener('keydown', editKeyHandler);
    }
  };
  document.addEventListener('keydown', editKeyHandler);
}

async function saveEdit(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (!card) return;

  const titleInput = document.getElementById(`title-${id}`);
  const bodyTextarea = document.getElementById(`body-${id}`);

  const newTitle = titleInput.value.trim();
  const newContent = bodyTextarea.value;

  if (!newTitle) {
    showToast('Title cannot be empty', 'error');
    titleInput.focus();
    return;
  }

  try {
    const res = await fetch(`/notas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: newTitle, contenido: newContent }),
    });

    if (res.ok) {
      showToast('Note updated ✏️', 'success');
      setTimeout(() => location.reload(), 400);
    } else {
      showToast('Failed to update note', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

function cancelEdit(id, originalTitle, originalContent) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (!card) return;

  card.classList.remove('is-editing');

  const titleInput = document.getElementById(`title-${id}`);
  const bodyTextarea = document.getElementById(`body-${id}`);

  // Restore title
  const titleDiv = document.createElement('div');
  titleDiv.className = 'note-card__title';
  titleDiv.id = `title-${id}`;
  titleDiv.textContent = originalTitle;
  titleInput.replaceWith(titleDiv);

  // Restore body
  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'note-card__body';
  bodyDiv.id = `body-${id}`;
  bodyDiv.textContent = originalContent || '';
  if (!originalContent) {
    bodyDiv.innerHTML = '<span class="note-card__empty">No content</span>';
  }

  // Remove edit actions
  const editActions = card.querySelector('.note-card__edit-actions');
  if (editActions) editActions.remove();

  bodyTextarea.replaceWith(bodyDiv);
}

// ═══════════════════════════════════════════════════════════
// DELETE — Modal & AJAX delete
// ═══════════════════════════════════════════════════════════
let deleteId = null;
const deleteModal = document.getElementById('deleteModal');
const deleteModalText = document.getElementById('deleteModalText');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

function confirmDelete(id, title) {
  deleteId = id;
  deleteModalText.textContent = `"${title}" will be lost forever in the void.`;
  deleteModal.classList.add('modal-overlay--active');
}

function closeModal() {
  deleteModal.classList.remove('modal-overlay--active');
  deleteId = null;
}

// Close modal on overlay click
if (deleteModal) {
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeModal();
  });
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!deleteId) return;
    confirmDeleteBtn.textContent = 'Destroying...';
    confirmDeleteBtn.disabled = true;

    try {
      const res = await fetch(`/notas/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        closeModal();
        // Animate card removal
        const card = document.querySelector(`[data-id="${deleteId}"]`);
        if (card) {
          card.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
          card.style.transform = 'translateX(80px) scale(0.9)';
          card.style.opacity = '0';
          card.style.maxHeight = card.offsetHeight + 'px';
          setTimeout(() => {
            card.style.maxHeight = '0';
            card.style.padding = '0';
            card.style.margin = '0';
            card.style.border = 'none';
          }, 200);
          setTimeout(() => location.reload(), 600);
        } else {
          location.reload();
        }
        showToast('Note destroyed 💥', 'success');
      } else {
        showToast('Failed to delete note', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      confirmDeleteBtn.textContent = 'Destroy';
      confirmDeleteBtn.disabled = false;
    }
  });
}

// ═══════════════════════════════════════════════════════════
// TOAST — enhanced notification system with progress bar
// ═══════════════════════════════════════════════════════════
let toastCount = 0;
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const id = ++toastCount;
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message}
    <div class="toast__progress"></div>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });
  });

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 500);
  }, 3200);
}

// ═══════════════════════════════════════════════════════════
// HOVER ACCENT — show accent bar on hover
// ═══════════════════════════════════════════════════════════
document.querySelectorAll('.note-card__accent').forEach(accent => {
  const card = accent.closest('.note-card');
  card.addEventListener('mouseenter', () => accent.style.opacity = '1');
  card.addEventListener('mouseleave', () => accent.style.opacity = '0');
});

// ═══════════════════════════════════════════════════════════
// FAB — Toggle form panel
// ═══════════════════════════════════════════════════════════
(function() {
  const fab = document.getElementById('fabNewNote');
  const wrapper = document.getElementById('formPanelWrapper');
  if (!fab || !wrapper) return;

  fab.addEventListener('click', () => {
    const isOpen = wrapper.classList.toggle('is-open');
    fab.classList.toggle('is-open', isOpen);
    if (isOpen) {
      // Focus title after animation
      setTimeout(() => document.getElementById('titulo').focus(), 350);
    }
  });

  // Close panel on Escape when form is focused
  wrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      wrapper.classList.remove('is-open');
      fab.classList.remove('is-open');
      fab.focus();
    }
  });
})();
