'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadMixamoAnimation } from './loadMixamoAnimation.js';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TWEEN from '@tweenjs/tween.js';

const Scene = () => {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const avatarRef = useRef(null);
    const npcRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const mixerRef = useRef(null);
    const animationActionsRef = useRef({});
    const currentAnimationRef = useRef(null);
    const npcMixerRef = useRef(null);
    const npcAnimationActionsRef = useRef({});
    const currentNpcAnimationRef = useRef(null);
    const tweenGroupRef = useRef(new TWEEN.Group());
    const isTransitioningRef = useRef(false);
    const chatContainerRef = useRef(null);

    const [isNearNPC, setIsNearNPC] = useState(false);
    const [isChatting, setIsChatting] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');

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

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isNearNPC, isChatting]);

    const handleKeyDown = (event) => {
        console.log('Key pressed:', event.key);

        // Ignore movement keys if transitioning or chatting
        if ((isTransitioningRef.current || isChatting) && ['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
            return;
        }
        
        if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
            event.preventDefault();
            keyStates.current[event.key.toLowerCase()] = true;
        }

        if (event.key.toLowerCase() === 'f' && isNearNPC && !isChatting) {
            console.log('Starting chat...');
            startChat();
        }

        if (event.key === 'Escape' && isChatting) {
            endChat();
        }
    };

    const handleKeyUp = (event) => {
        if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
            keyStates.current[event.key.toLowerCase()] = false;
        }
    };

    const animateCamera = (targetPosition, targetLookAt, duration = 1000) => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;

        isTransitioningRef.current = true;

        const startPosition = camera.position.clone();
        const startTarget = controls.target.clone();

        const positionTween = new TWEEN.Tween(startPosition, tweenGroupRef.current)
            .to(targetPosition, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                camera.position.copy(startPosition);
            });

        const targetTween = new TWEEN.Tween(startTarget, tweenGroupRef.current)
            .to(targetLookAt, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                controls.target.copy(startTarget);
                controls.update();
            })
            .onComplete(() => {
                isTransitioningRef.current = false;
            });

        positionTween.start();
        targetTween.start();
    };

    const startChat = () => {
        setIsChatting(true);

        const avatar = avatarRef.current.scene;
        const npc = npcRef.current.scene;

        const midpoint = new THREE.Vector3().addVectors(
            avatar.position,
            npc.position
        ).multiplyScalar(0.5);

        const targetCameraPosition = new THREE.Vector3(
            midpoint.x,
            midpoint.y + 1.5,
            midpoint.z + 3
        );

        // Animate camera to new position
        animateCamera(targetCameraPosition, midpoint);

        setChatMessages([{
            sender: 'NPC',
            message: 'Hello there! How can I help you today?'
        }]);

        // Play idle animation for NPC
        if (npcAnimationActionsRef.current['Idle']) {
            playNpcAnimation('Idle');
        }

        // Add this: Focus on the input after a short delay to ensure the chat interface is rendered
        setTimeout(() => {
            const inputElement = document.querySelector('input[type="text"]');
            if (inputElement) {
                inputElement.focus();
            }
        }, 100);
    };

    const endChat = () => {
        setIsChatting(false);
        setChatMessages([]);
        setCurrentMessage('');

        if (!avatarRef.current?.scene || !cameraRef.current || !controlsRef.current) {
            console.error('Required references not found');
            return;
        }

        const avatar = avatarRef.current.scene;
        const targetPosition = new THREE.Vector3(0, 2, 5).add(avatar.position);
        const targetLookAt = avatar.position.clone().add(new THREE.Vector3(0, 1, 0));

        // Animate camera back to original position
        animateCamera(targetPosition, targetLookAt);
    };

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            const container = chatContainerRef.current;
            const scrollOptions = {
                top: container.scrollHeight,
                behavior: 'smooth'
            };
            container.scrollTo(scrollOptions);
        }
    };

    const handleChatSubmit = (e) => {
        e.preventDefault();
        if (!currentMessage.trim()) return;

        setChatMessages(prev => [...prev, {
            sender: 'User',
            message: currentMessage
        }]);
        
        // Scroll after user message
        setTimeout(scrollToBottom, 100);

        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                sender: 'NPC',
                message: `I understand you said "${currentMessage}". How interesting!`
            }]);
            // Scroll after NPC reply
            setTimeout(scrollToBottom, 100);
        }, 1000);

        setCurrentMessage('');
    };

    const playAnimation = (animation) => {
        const actions = animationActionsRef.current;
        const currentAction = currentAnimationRef.current;
        const nextAction = actions[animation];

        if (!nextAction) return;
        if (currentAction === nextAction) return;

        const DURATION = 0.25;

        if (currentAction) {
            nextAction.reset().setEffectiveTimeScale(1.0).setEffectiveWeight(1.0);
            nextAction.clampWhenFinished = true;
            nextAction.crossFadeFrom(currentAction, DURATION, true);
            nextAction.play();
        } else {
            nextAction.reset();
            nextAction.setEffectiveTimeScale(1.0);
            nextAction.setEffectiveWeight(1.0);
            nextAction.clampWhenFinished = true;
            nextAction.play();
        }

        currentAnimationRef.current = nextAction;
    };

    const playNpcAnimation = (animation) => {
        const actions = npcAnimationActionsRef.current;
        const currentAction = currentNpcAnimationRef.current;
        const nextAction = actions[animation];

        if (!nextAction) return;
        if (currentAction === nextAction) return;

        const DURATION = 0.25;

        if (currentAction) {
            nextAction.reset().setEffectiveTimeScale(1.0).setEffectiveWeight(1.0);
            nextAction.clampWhenFinished = true;
            nextAction.crossFadeFrom(currentAction, DURATION, true);
            nextAction.play();
        } else {
            nextAction.reset();
            nextAction.setEffectiveTimeScale(1.0);
            nextAction.setEffectiveWeight(1.0);
            nextAction.clampWhenFinished = true;
            nextAction.play();
        }

        currentNpcAnimationRef.current = nextAction;
    };

    async function initializeAnimations(vrm, isNPC = false) {
        console.log("Initializing animations...");
        const mixer = new THREE.AnimationMixer(vrm.scene);

        if (isNPC) {
            npcMixerRef.current = mixer;
        } else {
            mixerRef.current = mixer;
        }

        const animations = ['Idle', 'Walking'];
        const actions = {};

        for (const animation of animations) {
            try {
                console.log(`Loading animation: ${animation}`);
                const url = `./animations/${animation}.fbx`;
                const clip = await loadMixamoAnimation(url, vrm);
                console.log(`Creating action for: ${animation}`);
                const action = mixer.clipAction(clip);
                action.clampWhenFinished = true;
                action.loop = THREE.LoopRepeat;
                actions[animation] = action;
            } catch (error) {
                console.error(`Error loading animation ${animation}:`, error);
            }
        }

        if (isNPC) {
            npcAnimationActionsRef.current = actions;
            playNpcAnimation('Idle');
        } else {
            animationActionsRef.current = actions;
            playAnimation('Idle');
        }
    }

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

        var ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1.0, 1.0, 1.0).normalize();
        scene.add(light);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(0, 20, 10);
        scene.add(dirLight);

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2000, 2000),
            new THREE.MeshBasicMaterial({ color: 'rgb(210, 210, 210)', depthWrite: false })
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
        controls.minDistance = 2;
        controls.maxDistance = 10;
        controls.target.set(0, 1, 0);
        controls.enableKeys = false;
        controls.enablePan = false;
        controlsRef.current = controls;

        const loader = new GLTFLoader();
        loader.crossOrigin = 'anonymous';
        loader.register((parser) => {
            return new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true });
        });

        // Load player avatar
        loader.load(
            './avatars/Default_M.vrm',
            async (gltf) => {
                const vrm = gltf.userData.vrm;
                scene.add(vrm.scene);
                avatarRef.current = vrm;

                vrm.scene.traverse((obj) => {
                    obj.frustumCulled = false;
                });

                VRMUtils.rotateVRM0(vrm);
                await initializeAnimations(vrm, false);
            },
            (progress) => console.log('Loading player model...', 100.0 * (progress.loaded / progress.total), '%'),
            (error) => console.error(error)
        );

        // Load NPC
        loader.load(
            './avatars/Merchant.vrm',
            async (gltf) => {
                const vrm = gltf.userData.vrm;
                scene.add(vrm.scene);
                npcRef.current = vrm;

                vrm.scene.traverse((obj) => {
                    obj.frustumCulled = false;
                });

                VRMUtils.rotateVRM0(vrm);
                vrm.scene.position.set(3, 0, 0);
                vrm.scene.rotation.y = Math.PI / 2;

                await initializeAnimations(vrm, true);
            },
            (progress) => console.log('Loading NPC...', 100.0 * (progress.loaded / progress.total), '%'),
            (error) => console.error(error)
        );

        const clock = new THREE.Clock();
        const moveSpeed = 0.05;
        const rotationSpeed = 0.15;
        const INTERACTION_DISTANCE = 2;

        function animate() {
            requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();

            // Update tween group instead of TWEEN
            tweenGroupRef.current.update();

            if (mixerRef.current) {
                mixerRef.current.update(deltaTime);
            }

            if (npcMixerRef.current) {
                npcMixerRef.current.update(deltaTime);
            }

            if (avatarRef.current && npcRef.current) {
                const avatar = avatarRef.current.scene;
                const npc = npcRef.current.scene;

                const distance = avatar.position.distanceTo(npc.position);
                setIsNearNPC(distance < INTERACTION_DISTANCE);

                if (!isChatting) {
                    const moveVector = new THREE.Vector3(0, 0, 0);

                    const cameraForward = new THREE.Vector3();
                    camera.getWorldDirection(cameraForward);
                    cameraForward.y = 0;
                    cameraForward.normalize();

                    const cameraRight = new THREE.Vector3();
                    cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));
                    cameraRight.normalize();

                    if (keyStates.current.w) moveVector.add(cameraForward);
                    if (keyStates.current.s) moveVector.sub(cameraForward);
                    if (keyStates.current.a) moveVector.sub(cameraRight);
                    if (keyStates.current.d) moveVector.add(cameraRight);

                    if (moveVector.length() > 0) {
                        playAnimation('Walking');

                        moveVector.normalize();

                        const cameraOffset = camera.position.clone().sub(controls.target);

                        avatar.position.add(moveVector.multiplyScalar(moveSpeed));

                        const targetRotation = Math.atan2(moveVector.x, moveVector.z) + Math.PI;

                        let currentRotation = avatar.rotation.y;
                        let angleDiff = targetRotation - currentRotation;

                        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                        avatar.rotation.y += angleDiff * rotationSpeed;

                        controls.target.copy(avatar.position).add(new THREE.Vector3(0, 1, 0));
                        camera.position.copy(controls.target).add(cameraOffset);
                    } else {
                        playAnimation('Idle');
                    }
                }

                avatarRef.current.update(deltaTime);
                npcRef.current.update(deltaTime);
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

    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full" />

            {/* Interaction Prompt */}
            {isNearNPC && !isChatting && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded z-10">
                    Press F to talk
                </div>
            )}

            {/* Chat Interface */}
            {isChatting && (
                <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-96 bg-white z-10">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-gray-500">Press ESC to exit</span>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={endChat}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕ Exit
                            </Button>
                        </div>
                        <div 
                            ref={chatContainerRef}
                            className="h-48 overflow-y-auto mb-4 space-y-2"
                        >
                            {chatMessages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`p-2 rounded ${msg.sender === 'User'
                                        ? 'bg-blue-100 ml-8'
                                        : 'bg-gray-100 mr-8'
                                        }`}
                                >
                                    <strong>{msg.sender}:</strong> {msg.message}
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleChatSubmit} className="flex gap-2">
                            <Input
                                type="text"
                                value={currentMessage}
                                onChange={(e) => setCurrentMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1"
                            />
                            <Button type="submit">Send</Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Scene;