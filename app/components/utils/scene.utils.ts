import { WeaponActionParams } from '../types/scene.types';
import summaryMetadata from '@/public/context/summary_metadata_with_vercel_urls.json';

export const getNiftyIslandUrl = (chain: string, contractAddress: string, tokenId: string) => {
    return `https://niftyisland.com/item/${chain}/${contractAddress}/${tokenId}`;
};

export const getVercelUrlFromLocalPath = (localPath: string): string | null => {
    const normalizedPath = localPath.startsWith('/') ? localPath.slice(1) : localPath;

    for (const item of summaryMetadata) {
        const matchingFile = item._local_files?.find(file => 
            file.local_path === normalizedPath
        );

        if (matchingFile?.vercel_url) {
            return matchingFile.vercel_url;
        }
    }

    console.warn(`No Vercel URL found for local path: ${localPath}`);
    return null;
};

export const inferWeaponType = (params: WeaponActionParams, metadata: any): 'sword' | 'pistol' => {
    const description = metadata?.description?.toLowerCase() || '';
    const name = metadata?.name?.toLowerCase() || '';
    const summary = metadata?._summaries?.[0]?.summary?.toLowerCase() || '';
    const weaponName = params.weaponName.toLowerCase();

    if (weaponName == 'galactic buster') {
        return 'sword';
    }

    const pistolKeywords = ['pistol', 'gun', 'megaphone', 'revolver', 'blaster'];
    const swordKeywords = ['sword', 'blade', 'dagger', 'bat'];

    // Check weapon name first
    for (const keyword of pistolKeywords) {
        if (weaponName.includes(keyword)) return 'pistol';
    }
    for (const keyword of swordKeywords) {
        if (weaponName.includes(keyword)) return 'sword';
    }

    // Check description
    if (description.includes('pistol was created')) return 'pistol';
    if (description.includes('sword was created')) return 'sword';

    // Check name
    for (const keyword of pistolKeywords) {
        if (name.includes(keyword)) return 'pistol';
    }
    for (const keyword of swordKeywords) {
        if (name.includes(keyword)) return 'sword';
    }

    // Check summary
    for (const keyword of pistolKeywords) {
        if (summary.includes(keyword)) return 'pistol';
    }
    for (const keyword of swordKeywords) {
        if (summary.includes(keyword)) return 'sword';
    }

    return 'sword';
};

export const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}; 