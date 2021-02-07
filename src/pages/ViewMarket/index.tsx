import { networkId } from '../../constants'
import { useGraphMarketMakerData } from 'hooks/useGraphMarketData'
import React, { useEffect, useState } from 'react'
import { RouteComponentProps } from '@reach/router'
import { getCuratemApolloClient } from 'utils/getApolloClient'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/client'
const ipfsClient = require('ipfs-http-client')

interface ViewMarketProps extends RouteComponentProps {
    market?: string
}

const query = gql`
        query GetMarket($id: ID!) {
            market(id: $id) {
                questionId,
                conditionId,
                metadataCID,
                
                community {
                    moderator,
                    token,
                    id
                }
            }
        }`

const client = getCuratemApolloClient(networkId)

interface MarketMetadata {
    url: string
    type: string
}
function useMarketMetadata(marketId: string): { metadata?: MarketMetadata } {
    const [metadata, setMetadata] = useState<MarketMetadata>()
    
    async function load() {
        // const ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001' as any)
        const ipfs = ipfsClient('https://ipfs.infura.io:5001/')

        for await (const file of ipfs.get(marketId)) {
            console.log(file.type, file.path)
        
            if (!file.content) continue;
        
            const content = []
        
            for await (const chunk of file.content) {
            content.push(chunk)
            }
            
            const metadata = JSON.parse(new TextDecoder("utf-8").decode(content[0]))
            setMetadata(metadata)
            return
        }
    }

    useEffect(() => {
        if(metadata == null) 
            load()
    }, [metadata])

    return { metadata }
}

export default function ViewMarket(props: any) {
    let { market } = props.match.params
    const { marketMakerData } = useGraphMarketMakerData(market, networkId)
    console.log(marketMakerData)

    const { metadata } = useMarketMetadata(market)
    

    const { data, error, loading, refetch } = useQuery(query, {
        variables: { 
            id: market
        },
        client,
    })

    console.log(data)
    console.log(metadata)

    return <>
        <div>
            <h5>Post content</h5>
            <p></p>

            <h5>Author</h5>
            <span></span>

            <h5>Posted</h5>
            { metadata && metadata.url }
        </div>
    </>
}