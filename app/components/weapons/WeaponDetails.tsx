import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ModelViewer from '../model-viewer';

type WeaponDetailsProps = {
    weaponDetails: any;
    onClose: () => void;
    onTryWeapon: () => void;
};

export const WeaponDetails: React.FC<WeaponDetailsProps> = ({
    weaponDetails,
    onClose,
    onTryWeapon
}) => {
    // Copy the weapon details modal JSX from npc.tsx and adapt it to use props
    // ...
}; 