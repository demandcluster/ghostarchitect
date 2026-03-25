"use client";

import { useEffect, useRef } from "react";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
  Points,
  LineBasicMaterial,
  LineSegments,
  LineLoop,
  Color,
  Vector3,
} from "three";

const NODE_COUNT = 60;
const MAX_DIST = 2.5;
const SPEED = 0.005;

export function NetworkBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;

    // Scene
    const scene = new Scene();
    const camera = new PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.z = 8;

    let renderer: WebGLRenderer;
    try {
      // Suppress Three.js's own console.error during context creation
      const origError = console.error;
      console.error = () => {};
      renderer = new WebGLRenderer({ alpha: true, antialias: true });
      console.error = origError;
    } catch {
      return; // WebGL unavailable — skip decorative background silently
    }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const accent = new Color(0x00e533);

    // Node data
    const positions = new Float32Array(NODE_COUNT * 3);
    const velocities: Vector3[] = [];

    for (let i = 0; i < NODE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      velocities.push(
        new Vector3(
          (Math.random() - 0.5) * SPEED,
          (Math.random() - 0.5) * SPEED,
          (Math.random() - 0.5) * SPEED * 0.3
        )
      );
    }

    // Points (nodes)
    const pointsGeom = new BufferGeometry();
    pointsGeom.setAttribute("position", new BufferAttribute(positions, 3));
    const pointsMat = new PointsMaterial({
      color: accent,
      size: 0.12,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });
    const points = new Points(pointsGeom, pointsMat);
    scene.add(points);

    // Lines (edges)
    const maxEdges = NODE_COUNT * 8;
    const linePositions = new Float32Array(maxEdges * 6);
    const lineColors = new Float32Array(maxEdges * 6);
    const lineGeom = new BufferGeometry();
    lineGeom.setAttribute("position", new BufferAttribute(linePositions, 3));
    lineGeom.setAttribute("color", new BufferAttribute(lineColors, 3));
    lineGeom.setDrawRange(0, 0);

    const lineMat = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const lines = new LineSegments(lineGeom, lineMat);
    scene.add(lines);

    // Ping rings — expanding circles around random nodes
    const RING_SEGMENTS = 64;
    const ringGeom = new BufferGeometry();
    const ringVerts = new Float32Array((RING_SEGMENTS + 1) * 3);
    for (let i = 0; i <= RING_SEGMENTS; i++) {
      const a = (i / RING_SEGMENTS) * Math.PI * 2;
      ringVerts[i * 3] = Math.cos(a);
      ringVerts[i * 3 + 1] = Math.sin(a);
      ringVerts[i * 3 + 2] = 0;
    }
    ringGeom.setAttribute("position", new BufferAttribute(ringVerts, 3));

    const MAX_PINGS = 4;
    const pings: { line: LineLoop; life: number; nodeIdx: number; active: boolean }[] = [];
    for (let i = 0; i < MAX_PINGS; i++) {
      const mat = new LineBasicMaterial({ color: accent, transparent: true, opacity: 0 });
      const ring = new LineLoop(ringGeom, mat);
      ring.visible = false;
      scene.add(ring);
      pings.push({ line: ring, life: 0, nodeIdx: 0, active: false });
    }
    // Dead nodes — fade out then move offscreen, respawn after delay
    // State: "fading" (0→1 over 1.5s) then "dead" (offscreen, timer counting down)
    const deadNodes: Map<number, { phase: "fading" | "dead"; timer: number }> = new Map();

    let nextPingIn = 0.5;

    // Breach attacks — red line racing from attacker node to target node
    const red = new Color(0xff2244);
    const MAX_BREACHES = 3;
    const breaches: {
      attackLine: LineSegments;
      ring: LineLoop;
      srcIdx: number;
      tgtIdx: number;
      life: number;
      active: boolean;
    }[] = [];
    for (let i = 0; i < MAX_BREACHES; i++) {
      // Attack line (2 vertices)
      const aGeom = new BufferGeometry();
      const aPos = new Float32Array(6);
      aGeom.setAttribute("position", new BufferAttribute(aPos, 3));
      const aMat = new LineBasicMaterial({ color: red, transparent: true, opacity: 0 });
      const aLine = new LineSegments(aGeom, aMat);
      aLine.visible = false;
      scene.add(aLine);

      // Red ring at target
      const rMat = new LineBasicMaterial({ color: red, transparent: true, opacity: 0 });
      const rRing = new LineLoop(ringGeom, rMat);
      rRing.visible = false;
      scene.add(rRing);

      breaches.push({ attackLine: aLine, ring: rRing, srcIdx: 0, tgtIdx: 0, life: 0, active: false });
    }
    let nextBreachIn = 4 + Math.random() * 3;

    // Animation
    let frameId: number;
    let elapsed = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      elapsed += 0.016;

      // Move nodes
      for (let i = 0; i < NODE_COUNT; i++) {
        const o = i * 3;
        positions[o] += velocities[i].x;
        positions[o + 1] += velocities[i].y;
        positions[o + 2] += velocities[i].z;

        if (Math.abs(positions[o]) > 7) velocities[i].x *= -1;
        if (Math.abs(positions[o + 1]) > 5) velocities[i].y *= -1;
        if (Math.abs(positions[o + 2]) > 2) velocities[i].z *= -1;
      }
      // Handle dead/fading nodes
      for (const [idx, state] of deadNodes) {
        state.timer -= 0.016;
        if (state.phase === "fading") {
          // Node stays in place — edges just fade via iFade/jFade multiplier
          if (state.timer <= 0) {
            const o = idx * 3;
            // Move offscreen
            positions[o] = 999;
            positions[o + 1] = 999;
            positions[o + 2] = 999;
            state.phase = "dead";
            state.timer = 3 + Math.random() * 4;
          }
        } else {
          // Dead — waiting to respawn
          if (state.timer <= 0) {
            const o = idx * 3;
            positions[o] = (Math.random() - 0.5) * 14;
            positions[o + 1] = (Math.random() - 0.5) * 10;
            positions[o + 2] = (Math.random() - 0.5) * 4;
            deadNodes.delete(idx);
          }
        }
      }

      pointsGeom.attributes.position.needsUpdate = true;

      // Build edges
      let edgeCount = 0;
      for (let i = 0; i < NODE_COUNT && edgeCount < maxEdges; i++) {
        const iState = deadNodes.get(i);
        const iFade = iState?.phase === "fading" ? Math.max(0, iState.timer / 1.5) : (iState ? 0 : 1);
        if (iFade === 0) continue;
        const ax = positions[i * 3];
        const ay = positions[i * 3 + 1];
        const az = positions[i * 3 + 2];
        for (let j = i + 1; j < NODE_COUNT && edgeCount < maxEdges; j++) {
          const jState = deadNodes.get(j);
          const jFade = jState?.phase === "fading" ? Math.max(0, jState.timer / 1.5) : (jState ? 0 : 1);
          if (jFade === 0) continue;
          const dx = ax - positions[j * 3];
          const dy = ay - positions[j * 3 + 1];
          const dz = az - positions[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < MAX_DIST) {
            const fade = 1 - dist / MAX_DIST;
            const o = edgeCount * 6;

            linePositions[o] = ax;
            linePositions[o + 1] = ay;
            linePositions[o + 2] = az;
            linePositions[o + 3] = positions[j * 3];
            linePositions[o + 4] = positions[j * 3 + 1];
            linePositions[o + 5] = positions[j * 3 + 2];

            const intensity = fade * 0.8 * Math.min(iFade, jFade);
            lineColors[o] = accent.r * intensity;
            lineColors[o + 1] = accent.g * intensity;
            lineColors[o + 2] = accent.b * intensity;
            lineColors[o + 3] = accent.r * intensity;
            lineColors[o + 4] = accent.g * intensity;
            lineColors[o + 5] = accent.b * intensity;

            edgeCount++;
          }
        }
      }
      lineGeom.setDrawRange(0, edgeCount * 2);
      lineGeom.attributes.position.needsUpdate = true;
      lineGeom.attributes.color.needsUpdate = true;

      // Ping rings
      nextPingIn -= 0.016;
      if (nextPingIn <= 0) {
        nextPingIn = 2 + Math.random() * 3;
        const ping = pings.find(p => !p.active);
        if (ping) {
          let idx = Math.floor(Math.random() * NODE_COUNT);
          for (let t = 0; t < 5 && deadNodes.has(idx); t++) idx = Math.floor(Math.random() * NODE_COUNT);
          ping.nodeIdx = idx;
          ping.life = 0;
          ping.active = true;
          ping.line.visible = true;
        }
      }
      for (const p of pings) {
        if (!p.active) continue;
        p.life += 0.016 * 0.6;
        if (p.life >= 1) {
          p.active = false;
          p.line.visible = false;
          continue;
        }
        const o = p.nodeIdx * 3;
        p.line.position.set(positions[o], positions[o + 1], positions[o + 2]);
        const scale = 0.05 + p.life * 0.4;
        p.line.scale.setScalar(scale);
        p.line.lookAt(camera.position);
        (p.line.material as { opacity: number }).opacity = (1 - p.life) * 0.7;
      }

      // Breach attacks
      nextBreachIn -= 0.016;
      if (nextBreachIn <= 0) {
        nextBreachIn = 5 + Math.random() * 6;
        const breach = breaches.find(b => !b.active);
        if (breach) {
          let tgt = Math.floor(Math.random() * NODE_COUNT);
          for (let t = 0; t < 5 && deadNodes.has(tgt); t++) tgt = Math.floor(Math.random() * NODE_COUNT);
          breach.tgtIdx = tgt;
          // Pick a source far from target
          let src = Math.floor(Math.random() * NODE_COUNT);
          for (let tries = 0; tries < 5; tries++) {
            const dx = positions[src * 3] - positions[breach.tgtIdx * 3];
            const dy = positions[src * 3 + 1] - positions[breach.tgtIdx * 3 + 1];
            if (Math.sqrt(dx * dx + dy * dy) > 3) break;
            src = Math.floor(Math.random() * NODE_COUNT);
          }
          breach.srcIdx = src;
          breach.life = 0;
          breach.active = true;
          breach.attackLine.visible = true;
          breach.ring.visible = false;
        }
      }
      for (const b of breaches) {
        if (!b.active) continue;
        b.life += 0.016 * 0.4;
        if (b.life >= 1) {
          b.active = false;
          b.attackLine.visible = false;
          b.ring.visible = false;
          // Start fading the target node
          if (!deadNodes.has(b.tgtIdx)) {
            deadNodes.set(b.tgtIdx, { phase: "fading", timer: 1.5 });
          }
          continue;
        }

        const so = b.srcIdx * 3;
        const to = b.tgtIdx * 3;
        const sx = positions[so], sy = positions[so + 1], sz = positions[so + 2];
        const tx = positions[to], ty = positions[to + 1], tz = positions[to + 2];

        if (b.life < 0.4) {
          // Phase 1: line extends from source toward target
          const t = b.life / 0.4;
          const aPos = b.attackLine.geometry.attributes.position.array as Float32Array;
          aPos[0] = sx; aPos[1] = sy; aPos[2] = sz;
          aPos[3] = sx + (tx - sx) * t;
          aPos[4] = sy + (ty - sy) * t;
          aPos[5] = sz + (tz - sz) * t;
          b.attackLine.geometry.attributes.position.needsUpdate = true;
          (b.attackLine.material as { opacity: number }).opacity = 0.8;
          b.ring.visible = false;
        } else {
          // Phase 2: line fully connected, red ping expands at target
          const aPos = b.attackLine.geometry.attributes.position.array as Float32Array;
          aPos[0] = sx; aPos[1] = sy; aPos[2] = sz;
          aPos[3] = tx; aPos[4] = ty; aPos[5] = tz;
          b.attackLine.geometry.attributes.position.needsUpdate = true;

          const ringT = (b.life - 0.4) / 0.6;
          (b.attackLine.material as { opacity: number }).opacity = (1 - ringT) * 0.8;

          b.ring.visible = true;
          b.ring.position.set(tx, ty, tz);
          b.ring.scale.setScalar(0.05 + ringT * 0.5);
          b.ring.lookAt(camera.position);
          (b.ring.material as { opacity: number }).opacity = (1 - ringT) * 0.9;
        }
      }

      // Gentle camera sway
      camera.position.x = Math.sin(elapsed * 0.08) * 0.4;
      camera.position.y = Math.cos(elapsed * 0.06) * 0.3;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const cw = mount.clientWidth || window.innerWidth;
      const ch = mount.clientHeight || window.innerHeight;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      pointsGeom.dispose();
      pointsMat.dispose();
      lineGeom.dispose();
      lineMat.dispose();
      ringGeom.dispose();
      pings.forEach(p => (p.line.material as LineBasicMaterial).dispose());
      breaches.forEach(b => {
        b.attackLine.geometry.dispose();
        (b.attackLine.material as LineBasicMaterial).dispose();
        (b.ring.material as LineBasicMaterial).dispose();
      });
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}
