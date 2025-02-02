import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { NPC_NAME } from '../constants/scene.constants';

type ChatMessage = {
    sender: string;
    message: string;
    isStreaming?: boolean;
};

type ChatInterfaceProps = {
    chatMessages: ChatMessage[];
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    handleChatSubmit: (e: React.FormEvent) => void;
    endChat: () => void;
    showShop: boolean;
    equippedWeapon: any;
    weapons: any[];
    tryWeapon: (weapon: any) => void;
    returnToShop: () => void;
    agentActionTryWeapon: (params: any) => void;
    parseMessageTags: (message: string) => any;
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
    chatMessages,
    currentMessage,
    setCurrentMessage,
    handleChatSubmit,
    endChat,
    showShop,
    equippedWeapon,
    weapons,
    tryWeapon,
    returnToShop,
    agentActionTryWeapon,
    parseMessageTags
}) => {
    // Copy the chat interface JSX from npc.tsx and adapt it to use props
    // ...
}; 