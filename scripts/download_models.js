const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Sleep utility function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const downloadFile = async (url, outputPath) => {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer'
        });

        await fs.writeFile(outputPath, response.data);
        console.log(`Successfully downloaded: ${outputPath}`);
    } catch (error) {
        console.error(`Error downloading ${url}: ${error.message}`);
    }
};

const createUniqueFileName = (nft, asset, fileExtension) => {
    // Create a unique name using chain, full contract address, token ID, and asset name
    const chainId = nft.chain;
    const contractAddress = nft.contractAddress.toLowerCase();
    const tokenId = nft.tokenId;
    const sanitizedAssetName = asset.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    return `${chainId}_${contractAddress}_${tokenId}_${sanitizedAssetName}.${fileExtension}`;
};

const processNFTData = async (nftData) => {
    // Create weapons_models directory if it doesn't exist
    const outputDir = 'weapon_models';
    try {
        await fs.access(outputDir);
    } catch {
        await fs.mkdir(outputDir);
        console.log('Created weapon_models directory');
    }

    // Deep clone the original NFT data
    const enhancedNFTData = JSON.parse(JSON.stringify(nftData));

    // Process each NFT
    for (let i = 0; i < enhancedNFTData.length; i++) {
        const nft = enhancedNFTData[i];
        
        if (!nft.metadata?.raw?.metadata?.assets) {
            continue;
        }

        const assets = nft.metadata.raw.metadata.assets;
        const nftName = nft.metadata.name;

        // Add new array to track local file paths
        nft._local_files = [];

        // Process each asset in the NFT
        for (const asset of assets) {
            if (!asset.files || !asset.files.length) {
                continue;
            }

            for (const file of asset.files) {
                if (file.file_type === 'model/fbx' || file.file_type === 'model/glb') {
                    const fileExtension = file.file_type.split('/')[1];
                    const fileName = createUniqueFileName(nft, asset, fileExtension);
                    const outputPath = path.join(outputDir, fileName);
                    const relativePath = path.join('weapon_models', fileName);

                    console.log(`Downloading ${nftName} - ${asset.name}...`);
                    await downloadFile(file.url, outputPath);

                    // Add local file information
                    nft._local_files.push({
                        asset_name: asset.name,
                        original_url: file.url,
                        local_path: relativePath,
                        file_type: file.file_type
                    });

                    // Add 3 second delay between downloads
                    console.log('Waiting 3 seconds before next download...');
                    await sleep(3000);
                }
            }
        }
    }

    // Save the enhanced metadata
    const metadataOutputPath = path.join(outputDir, 'enhanced_metadata.json');
    await fs.writeFile(
        metadataOutputPath, 
        JSON.stringify(enhancedNFTData, null, 2),
        'utf8'
    );
    console.log(`Saved enhanced metadata to ${metadataOutputPath}`);

    return enhancedNFTData;
};

// Since the file is provided in the conversation, we assume it's already loaded
// but in a real Node.js environment, you would load it like this:
const nftData = require('./nft_metadata.json');

console.log('Starting download of weapon models...');
processNFTData(nftData)
    .then(() => console.log('Finished downloading all models and creating enhanced metadata'))
    .catch(error => console.error('Error processing NFT data:', error));