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
    const originalCameraPositionRef = useRef(null);
    const originalCameraTargetRef = useRef(null);
    const [showControls, setShowControls] = useState(false);

    const [isNearNPC, setIsNearNPC] = useState(false);
    const [isChatting, setIsChatting] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const NPC_NAME = "Zoan";

    const keyStates = useRef({
        w: false,
        a: false,
        s: false,
        d: false
    });

    const [showShop, setShowShop] = useState(true);
    const [equippedWeapon, setEquippedWeapon] = useState(null);
    const equippedWeaponRef = useRef(null);

    const weapons = [
        {
            id: 'sword',
            name: 'Great Sword',
            price: '1000 gold',
            model: './weapons/Sword.glb',
            animation: './animations/Great Sword Idle.fbx',
            position: { x: 0.05, y: -0.025, z: 0.0 },
            rotation: { 
                x: -Math.PI / 2 - 0 * Math.PI / 16,
                y: Math.PI / 2 + 2 * Math.PI / 16,
                z: Math.PI / 8 + -2 * Math.PI / 16
            },
            scale: 1.0
        },
        {
            id: 'pistol',
            name: 'Pistol',
            price: '800 gold',
            model: './weapons/Pistol.glb',
            animation: './animations/Pistol Idle.fbx',
            position: { x: 0.05, y: -0.03, z: 0 },
            rotation: { 
                x: -Math.PI / 2,
                y: Math.PI / 2 + Math.PI / 16,
                z: 0
            },
            scale: 0.8
        }
    ];

    useEffect(() => {
        equippedWeaponRef.current = equippedWeapon;
        console.log('Equipped weapon ref updated:', equippedWeaponRef.current);
    }, [equippedWeapon]);

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

    useEffect(() => {
        if (npcRef.current?.scene) {
            // Find the sprite in the NPC's children
            const nameSprite = npcRef.current.scene.children.find(
                child => child instanceof THREE.Sprite
            );
            if (nameSprite) {
                nameSprite.visible = isNearNPC;
            }
        }
    }, [isNearNPC]);

    useEffect(() => {
        console.log('Equipped weapon changed:', equippedWeapon);
    }, [equippedWeapon]);

    /*
    useEffect(() => {
        // Hide controls after 10 seconds
        const timer = setTimeout(() => {
            setShowControls(false);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);
    */

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
        // Store original camera position and target
        originalCameraPositionRef.current = cameraRef.current.position.clone();
        originalCameraTargetRef.current = controlsRef.current.target.clone();

        setIsChatting(true);

        const avatar = avatarRef.current.scene;
        const npc = npcRef.current.scene;
        const camera = cameraRef.current;

        // Calculate midpoint between avatar and NPC
        const midpoint = new THREE.Vector3().addVectors(
            avatar.position,
            npc.position
        ).multiplyScalar(0.5);

        // Calculate vector from midpoint to current camera position
        const currentToCameraVector = new THREE.Vector3()
            .copy(camera.position)
            .sub(midpoint);
        currentToCameraVector.y = 0; // Project onto XZ plane

        // Calculate vector from avatar to NPC
        const avatarToNPC = new THREE.Vector3()
            .copy(npc.position)
            .sub(avatar.position);
        avatarToNPC.y = 0; // Project onto XZ plane

        // Determine if camera is on left or right using cross product
        const crossProduct = new THREE.Vector3()
            .crossVectors(avatarToNPC, currentToCameraVector);
        const isOnLeftSide = crossProduct.y > 0;

        // Calculate the angle for camera positioning (45 degrees = π/4 radians)
        const angle = isOnLeftSide ? -Math.PI / 4 : Math.PI / 4;
        const targetDistance = 2.5;
        const targetHeight = midpoint.y + 1.5;

        // Calculate camera position behind and to the side of the avatar
        const targetCameraPosition = new THREE.Vector3();
        const avatarToNPCAngle = Math.atan2(avatarToNPC.z, avatarToNPC.x);
        
        // Position camera behind avatar at the calculated angle
        targetCameraPosition.x = avatar.position.x - Math.cos(avatarToNPCAngle - angle) * targetDistance;
        targetCameraPosition.z = avatar.position.z - Math.sin(avatarToNPCAngle - angle) * targetDistance;
        targetCameraPosition.y = targetHeight;

        // Animate camera to new position
        animateCamera(targetCameraPosition, midpoint);

        setChatMessages([{
            sender: NPC_NAME,
            message: 'Hello there! How can I help you today?'
        }]);

        if (npcAnimationActionsRef.current['Idle']) {
            playNpcAnimation('Idle');
        }

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

        if (!originalCameraPositionRef.current || !originalCameraTargetRef.current) {
            console.error('Original camera position not found');
            return;
        }

        // Animate camera back to original position and target
        animateCamera(
            originalCameraPositionRef.current,
            originalCameraTargetRef.current
        );
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
                sender: NPC_NAME,
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

        const animations = ['Idle', 'Walking', 'Great Sword Idle', 'Pistol Idle'];
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

        // Add this function to create text sprite
        function createTextSprite(text) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 512;
            canvas.height = 128;

            if (context) {
                context.imageSmoothingEnabled = false;
                context.textBaseline = 'middle';
                
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                context.font = 'Bold 42px Arial';
                context.textAlign = 'center';
                
                // Create outline by drawing the text multiple times with small offsets
                context.fillStyle = 'black';
                for (let i = -3; i <= 3; i++) {
                    for (let j = -3; j <= 3; j++) {
                        context.fillText(text, canvas.width/2 + i, canvas.height/2 + j);
                    }
                }
                
                // Draw the main text
                context.fillStyle = 'white';
                context.fillText(text, canvas.width/2, canvas.height/2);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false,
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            
            sprite.scale.set(1 * 1.5, 0.25 * 1.5, 1);
            sprite.position.y = 1.95;
            sprite.renderOrder = 999;
            sprite.visible = false;

            return sprite;
        }

        // Modify the NPC loader section
        loader.load(
            './avatars/Merchant.vrm',
            async (gltf) => {
                const vrm = gltf.userData.vrm;
                scene.add(vrm.scene);
                npcRef.current = vrm;

                vrm.scene.traverse((obj) => {
                    obj.frustumCulled = false;
                });

                // Create and add name sprite
                const nameSprite = createTextSprite(NPC_NAME);
                vrm.scene.add(nameSprite);

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
                        const currentWeapon = equippedWeaponRef.current;
                        if (currentWeapon) {
                            const animationName = currentWeapon.id.includes('sword') 
                                ? 'Great Sword Idle' 
                                : 'Pistol Idle';
                            playAnimation(animationName);
                        } else {
                            playAnimation('Idle');
                        }
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

    const tryWeapon = async (weapon) => {
        setShowShop(false);
        setEquippedWeapon(weapon);

        const loader = new GLTFLoader();
        const avatar = avatarRef.current;

        // Remove any existing weapon
        avatar.scene.traverse((child) => {
            if (child.name === 'weapon') {
                child.parent.remove(child);
            }
        });

        // Load and attach new weapon
        loader.load(
            weapon.model,
            (gltf) => {
                const weaponModel = gltf.scene;
                weaponModel.name = 'weapon';
                weaponModel.scale.setScalar(weapon.scale);

                // Find right hand and attach weapon
                avatar.scene.traverse((child) => {
                    if (child.name.includes('J_Bip_R_Hand')) {
                        child.add(weaponModel);
                        
                        weaponModel.position.set(
                            weapon.position.x,
                            weapon.position.y,
                            weapon.position.z
                        );
                        weaponModel.rotation.set(
                            weapon.rotation.x,
                            weapon.rotation.y,
                            weapon.rotation.z
                        );
                    }
                });

                /*
                // Play the appropriate idle animation based on weapon type
                if (weapon.id.includes('sword')) {
                    playAnimation('Great Sword Idle');
                } else if (weapon.id.includes('pistol')) {
                    playAnimation('Pistol Idle');
                }
                */
            }
        );
    };

    const returnToShop = () => {
        setShowShop(true);
        setEquippedWeapon(null);

        // Remove equipped weapon
        const avatar = avatarRef.current;
        avatar.scene.traverse((child) => {
            if (child.name === 'weapon') {
                child.parent.remove(child);
            }
        });

        // Return to Idle animation
        playAnimation('Idle');
    };

    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full" />

            {/* Info Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowControls(!showControls)}
                className="fixed top-4 right-4 w-10 h-10 rounded-full bg-black bg-opacity-75 text-white hover:bg-opacity-90 z-10"
            >
                <svg
                    className="w-6 h-6 scale-150"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </Button>

            {/* Controls Hint - Modified to be absolutely positioned in corner */}
            {showControls && (
                <div className="fixed top-16 right-4 bg-black bg-opacity-75 text-white px-6 py-4 rounded-lg z-10 w-64">
                    <div className="text-center mb-2 font-semibold">Controls</div>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-gray-700 rounded">WASD</kbd>
                            <span>Move</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-gray-700 rounded">F</kbd>
                            <span>Interact</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 101.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span>Click + Drag to look</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-gray-700 rounded">ESC</kbd>
                            <span>Exit chat</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Interaction Prompt */}
            {isNearNPC && !isChatting && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded z-10">
                    Press F to talk
                </div>
            )}

            {/* Modified Chat Interface */}
            {isChatting && (
                <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[800px] bg-white z-10">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-gray-500">Chatting with {NPC_NAME}</span>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={endChat}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕ Exit
                            </Button>
                        </div>

                        {/* Two-column layout */}
                        <div className="flex gap-4">
                            {/* Chat column */}
                            <div className="flex-1">
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
                            </div>

                            {/* Shop column */}
                            <div className="w-72 border-l pl-4">
                                <h3 className="font-semibold mb-3">Available Weapons</h3>
                                {showShop ? (
                                    <div className="space-y-4">
                                        {weapons.map((weapon) => (
                                            <div key={weapon.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                                                <div>
                                                    <h3 className="font-semibold">{weapon.name}</h3>
                                                    <p className="text-sm text-gray-600">{weapon.price}</p>
                                                </div>
                                                <Button onClick={() => tryWeapon(weapon)}>
                                                    Try It
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-4 bg-gray-100 rounded">
                                        <p className="mb-4">Currently trying: {equippedWeapon?.name}</p>
                                        <Button onClick={returnToShop}>
                                            Return to Shop
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Scene;