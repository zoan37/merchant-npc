import React from 'react';
import { useSceneSetup } from './hooks/useSceneSetup';
import { useWeaponSystem } from './hooks/useWeaponSystem';
import { useChatSystem } from './hooks/useChatSystem';
import { ChatInterface } from './chat/ChatInterface';
import { WeaponDetails } from './weapons/WeaponDetails';
// ... other imports

const Scene = () => {
    // Use custom hooks to organize logic
    const {
        containerRef,
        sceneRef,
        // ... other scene-related state and refs
    } = useSceneSetup();

    const {
        weapons,
        equippedWeapon,
        handleWeaponAction,
        // ... other weapon-related state and functions
    } = useWeaponSystem();

    const {
        chatMessages,
        currentMessage,
        handleChatSubmit,
        // ... other chat-related state and functions
    } = useChatSystem();

    // ... remaining component logic

    return (
        // ... JSX using the new components
    );
};

export default Scene; 