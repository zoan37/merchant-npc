export type WeaponActionParams = {
    target: string;
    weaponName: string;
    weaponType: string;
    contractAddress: string;
    tokenId: string;
};

export type WeaponConfig = {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: number;
    animation: string;
};

export type Weapon = {
    id: string;
    name: string;
    price?: string;
    model: string;
    animation: string;
    weaponType: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: number;
    niftyIslandLink?: string;
    chain?: string;
    contractAddress?: string;
    tokenId?: string;
}; 