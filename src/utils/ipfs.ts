import { useEffect, useState } from 'react';

/* eslint-disable @typescript-eslint/no-var-requires */
const ipfsClient = require('ipfs-http-client');

export async function loadJsonFileFromIpfs(cid: string): Promise<unknown> {
    // const ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001' as any)
    const ipfs = ipfsClient('https://ipfs.infura.io:5001/');

    for await (const file of ipfs.get(cid)) {
        console.log(file.type, file.path);

        if (!file.content) continue;

        const content = [];

        for await (const chunk of file.content) {
            content.push(chunk);
        }

        const blob = JSON.parse(new TextDecoder('utf-8').decode(content[0]));
        return blob;
    }

    // TODO: define behaviour.
    throw new Error('');
}

interface MarketMetadata {
    url: string;
    type: string;
}

// function useMarketMetadata(marketId: string): { metadata?: MarketMetadata } {
//     const [metadata, setMetadata] = useState<MarketMetadata>()

//     async function load() {
//     }

//     useEffect(() => {
//         if(metadata == null)
//             load()
//     }, [metadata])

//     return { metadata }
// }
