// src/components/VrmViewer.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const VrmViewer = ({ modelPath, width = '100%', height = '400px' }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f8f8);
    sceneRef.current = scene;
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      30, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      20
    );
    camera.position.set(0, 1, 5);
    cameraRef.current = camera;
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    
    // Load VRM model
    const loader = new GLTFLoader();
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });
    
    loader.load(
      modelPath,
      (gltf) => {
        const vrm = gltf.userData.vrm;
        
        // Normalize the model
        VRMUtils.rotateVRM0(vrm);
        
        // Add the model to the scene
        scene.add(vrm.scene);
        
        // Adjust camera to look at the model
        const headPosition = new THREE.Vector3();
        vrm.humanoid.getNormalizedBoneNode('head').getWorldPosition(headPosition);
        camera.lookAt(headPosition);
        controls.target.copy(new THREE.Vector3(0, 1, 0));
        
        // Adjust model position
        vrm.scene.position.set(0, 0, 0);
      },
      (progress) => {
        console.log('Loading model...', (progress.loaded / progress.total) * 100, '%');
      },
      (error) => {
        console.error('Error loading VRM model:', error);
      }
    );
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      renderer.dispose();
    };
  }, [modelPath]);
  
  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: width, 
        height: height,
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    />
  );
};

export default VrmViewer;