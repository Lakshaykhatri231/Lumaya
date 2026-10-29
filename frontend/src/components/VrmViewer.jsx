import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// How the user came across -> the face Lumaya makes back: [expression, strength, fallback]
// Not every VRM defines every expression (this one has an empty 'sad'), so a fallback is used when it has no shapes.
const EMOTION_EXPRESSION = {
  distressed: ['sad', 0.55, 'relaxed'],
  positive: ['happy', 0.6],
  open: ['relaxed', 0.5],
  seeking_advice: ['relaxed', 0.3],
  guarded: ['relaxed', 0.2],
  looping: ['relaxed', 0.2]
};
// ...and a posture to go with it: head tilt (roll) and pitch, in radians
const EMOTION_POSTURE = {
  distressed: { tilt: 0.1, pitch: 0.06 },
  open: { tilt: 0.04, pitch: 0 },
  positive: { tilt: 0, pitch: -0.02 }
};
const FACE_EXPRESSIONS = ['happy', 'sad', 'relaxed', 'angry', 'surprised'];

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Renders the VRM avatar. It reacts to props without reloading the model:
 *  - emotion:  the user's detected state, shown as a facial expression
 *  - speaking: mouth moves while Lumaya's reply is being typed out
 *  - thinking: head tilts slightly while waiting for a reply
 */
const VrmViewer = ({ modelPath, emotion = null, speaking = false, thinking = false, width = '100%', height = '100%' }) => {
  const containerRef = useRef(null);
  const stateRef = useRef({ emotion, speaking, thinking });
  const [status, setStatus] = useState('loading'); // loading | ready | failed

  stateRef.current = { emotion, speaking, thinking };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    let frameId = 0;
    let vrm = null;
    let renderer;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (error) {
      console.error('WebGL unavailable for the avatar:', error);
      setStatus('failed');
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, container.clientWidth / Math.max(container.clientHeight, 1), 0.1, 20);
    camera.position.set(0, 1.3, 1.2);

    const key = new THREE.DirectionalLight(0xffffff, Math.PI * 0.9);
    key.position.set(0.8, 1.2, 1.5);
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.9));

    // Pull the camera back just far enough that head and shoulders fit the container's width
    let headY = 1.4;
    const VISIBLE_WIDTH = 0.55; // metres of scene to show across the frame
    const fitCamera = () => {
      const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
      const fovHalf = THREE.MathUtils.degToRad(camera.fov / 2);
      const distance = Math.max(1.4, VISIBLE_WIDTH / (2 * Math.tan(fovHalf) * aspect));
      camera.aspect = aspect;
      camera.position.set(0, headY - 0.02, distance);
      camera.lookAt(0, headY - 0.09, 0);
      camera.updateProjectionMatrix();
    };

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelPath,
      (gltf) => {
        if (cancelled) return;
        vrm = gltf.userData.vrm;
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.rotateVRM0(vrm); // VRM 0.x models face -Z; this turns them to face the camera
        vrm.scene.traverse((object) => { object.frustumCulled = false; });
        scene.add(vrm.scene);

        // Relax the T-pose: arms down by the sides
        const bone = (name) => vrm.humanoid.getNormalizedBoneNode(name);
        bone('leftUpperArm') && (bone('leftUpperArm').rotation.z = 1.2);
        bone('rightUpperArm') && (bone('rightUpperArm').rotation.z = -1.2);
        bone('leftLowerArm') && (bone('leftLowerArm').rotation.z = 0.12);
        bone('rightLowerArm') && (bone('rightLowerArm').rotation.z = -0.12);

        // Frame head and shoulders from wherever the head actually is
        const head = new THREE.Vector3();
        bone('head').getWorldPosition(head);
        headY = head.y;
        fitCamera();
        if (vrm.lookAt) vrm.lookAt.target = camera;

        setStatus('ready');
      },
      undefined,
      (error) => {
        if (cancelled) return;
        console.error('Error loading VRM model:', error);
        setStatus('failed');
      }
    );

    const reduceMotion = prefersReducedMotion();
    const current = { happy: 0, sad: 0, relaxed: 0, angry: 0, surprised: 0, aa: 0, blink: 0 };
    const ease = (from, to, dt, speed = 6) => from + (to - from) * Math.min(1, dt * speed);
    const clock = new THREE.Clock();
    let elapsed = 0;
    let nextBlinkAt = 2.5;
    let blinkStartedAt = -1;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      if (!vrm || document.hidden) return;
      elapsed += dt;

      const { emotion: emo, speaking: talking, thinking: waiting } = stateRef.current;
      const [wanted, strength, fallback] = EMOTION_EXPRESSION[emo] || [null, 0];
      const hasShapes = (name) => (vrm.expressionManager?.expressionMap[name]?.binds?.length ?? 0) > 0;
      const target = wanted && !hasShapes(wanted) && fallback ? fallback : wanted;

      for (const name of FACE_EXPRESSIONS) {
        current[name] = ease(current[name], name === target ? strength : 0, dt);
        vrm.expressionManager?.setValue(name, current[name]);
      }

      // Mouth: an uneven flap while a reply is being typed out
      const mouthTarget = talking && !reduceMotion ? 0.15 + 0.4 * Math.abs(Math.sin(elapsed * 11)) * (0.6 + 0.4 * Math.sin(elapsed * 2.7)) : 0;
      current.aa = ease(current.aa, mouthTarget, dt, 18);
      vrm.expressionManager?.setValue('aa', current.aa);

      // Blink every few seconds
      if (!reduceMotion) {
        if (blinkStartedAt < 0 && elapsed >= nextBlinkAt) blinkStartedAt = elapsed;
        if (blinkStartedAt >= 0) {
          const progress = (elapsed - blinkStartedAt) / 0.18;
          current.blink = progress >= 1 ? 0 : Math.sin(progress * Math.PI);
          if (progress >= 1) { blinkStartedAt = -1; nextBlinkAt = elapsed + 2.5 + Math.random() * 3; }
        }
        vrm.expressionManager?.setValue('blink', current.blink);
      }

      // Idle breathing and a small head sway; a slight tilt while thinking
      const spine = vrm.humanoid.getNormalizedBoneNode('spine');
      const headBone = vrm.humanoid.getNormalizedBoneNode('head');
      if (!reduceMotion) {
        if (spine) spine.rotation.x = Math.sin(elapsed * 1.2) * 0.012;
        if (headBone) {
          const posture = EMOTION_POSTURE[emo] || { tilt: 0, pitch: 0 };
          headBone.rotation.y = Math.sin(elapsed * 0.5) * 0.05;
          headBone.rotation.x = ease(headBone.rotation.x, posture.pitch + (talking ? Math.sin(elapsed * 4) * 0.02 : 0), dt, 5);
          headBone.rotation.z = ease(headBone.rotation.z, waiting ? 0.09 : posture.tilt, dt, 3);
        }
      }

      vrm.update(dt);
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight);
      fitCamera();
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      if (vrm) VRMUtils.deepDispose(vrm.scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [modelPath]);

  return (
    <div style={{ position: 'relative', width, height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} aria-hidden="true" />
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#92400e' }}>
          Waking up Lumaya…
        </div>
      )}
      {status === 'failed' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }} title="Avatar unavailable on this device">
          🌿
        </div>
      )}
    </div>
  );
};

export default VrmViewer;
