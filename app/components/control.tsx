'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const Scene = () => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const avatarRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  
  const keyStates = useRef({
    w: false,
    a: false,
    s: false,
    d: false
  });

  useEffect(() => {
    if (!rendererRef.current) {
      init();
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleKeyDown = (event) => {
    if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      keyStates.current[event.key.toLowerCase()] = true;
    }
  };

  const handleKeyUp = (event) => {
    if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
      keyStates.current[event.key.toLowerCase()] = false;
    }
  };

  function init() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0e0e0);
    scene.fog = new THREE.Fog(0xe0e0e0, 20, 100);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 20, 10);
    scene.add(dirLight);

    // Ground
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);

    const grid = new THREE.GridHelper(200, 200, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    controls.target.set(0, 1, 0);
    controls.enableKeys = false;
    controls.enablePan = false;
    controlsRef.current = controls;

    // Load Avatar
    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true });
    });

    loader.load(
      './avatars/Default_M.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;
        scene.add(vrm.scene);
        avatarRef.current = vrm;

        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        VRMUtils.rotateVRM0(vrm);
      },
      (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
      (error) => console.error(error)
    );

    const clock = new THREE.Clock();
    const moveSpeed = 0.1;

    function animate() {
      requestAnimationFrame(animate);
      const deltaTime = clock.getDelta();

      if (avatarRef.current) {
        const avatar = avatarRef.current.scene;
        const moveVector = new THREE.Vector3(0, 0, 0);

        // Get camera's forward direction (projected onto XZ plane)
        const cameraForward = new THREE.Vector3();
        camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();

        // Get camera's right direction
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(new THREE.Vector3(0, 1, 0), cameraForward);
        cameraRight.normalize();

        // Calculate movement direction
        if (keyStates.current.w) moveVector.add(cameraForward);
        if (keyStates.current.s) moveVector.sub(cameraForward);
        if (keyStates.current.a) moveVector.sub(cameraRight);
        if (keyStates.current.d) moveVector.add(cameraRight);

        if (moveVector.length() > 0) {
          moveVector.normalize();
          
          // Store the camera's position relative to the target before moving
          const cameraOffset = camera.position.clone().sub(controls.target);
          
          // Move the avatar
          avatar.position.add(moveVector.multiplyScalar(moveSpeed));
          
          // Update OrbitControls target to new avatar position
          controls.target.copy(avatar.position).add(new THREE.Vector3(0, 1, 0));
          
          // Move camera maintaining the exact same offset
          camera.position.copy(controls.target).add(cameraOffset);
        }

        avatarRef.current.update(deltaTime);
      }

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  return <div ref={containerRef} />;
};

export default Scene;