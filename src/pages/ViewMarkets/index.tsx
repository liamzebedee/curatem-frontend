import { useGraphMarketMakerData } from 'hooks/useGraphMarketData'
import React, { useEffect, useState } from 'react'
import { RouteComponentProps } from '@reach/router'
import { getCuratemApolloClient } from 'utils/getApolloClient'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'
import { NETWORK_CHAIN_ID } from 'connectors'
const ipfsClient = require('ipfs-http-client')


interface ViewMarketsProps extends RouteComponentProps {
    community?: string
}

const query = gql`
        query GetCommunity($id: ID!) {
            community(id: $id) {
                id,
                moderator,
                token,
                markets {
                    id,
                    metadataCID,
                    conditionId,
                    questionId,
                    itemUrl
                }
            }
        }`

const client = getCuratemApolloClient(NETWORK_CHAIN_ID)

interface MarketMetadata {
    url: string
    type: string
}

async function loadJsonFileFromIpfs(cid: string): Promise<{}> {
    // const ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001' as any)
    const ipfs = ipfsClient('https://ipfs.infura.io:5001/')

    for await (const file of ipfs.get(cid)) {
        console.log(file.type, file.path)

        if (!file.content) continue;

        const content = []

        for await (const chunk of file.content) {
        content.push(chunk)
        }
        
        const blob = JSON.parse(new TextDecoder("utf-8").decode(content[0]))
        return blob
    }

    // TODO: define behaviour.
    throw new Error("")
}

function useMarketMetadata(marketId: string): { metadata?: MarketMetadata } {
    const [metadata, setMetadata] = useState<MarketMetadata>()
    
    async function load() {
    }

    useEffect(() => {
        if(metadata == null) 
            load()
    }, [metadata])

    return { metadata }
}



export default function ViewMarkets(props: any) {
    let { community } = props.match.params as ViewMarketsProps    

    const { data, error, loading, refetch } = useQuery(query, {
        variables: { 
            id: community?.toLowerCase()
        },
        client,
    })

    if(loading) return null

    return <>
        <div>
            {data.community.markets.length} markets

            <ul>
            {data.community.markets.map((market: any) => {
                return <li>
                    <Link to={`/communities/${community}/markets/${market.id}`}>{market.itemUrl}</Link>
                </li>
            })}
            </ul>
        </div>
    </>
}