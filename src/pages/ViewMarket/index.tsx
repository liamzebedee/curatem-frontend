import { useGraphMarketMakerData } from 'hooks/useGraphMarketData'
import React, { useEffect, useState } from 'react'
import { RouteComponentProps } from '@reach/router'
import { getCuratemApolloClient } from 'utils/getApolloClient'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/client'
import { NETWORK_CHAIN_ID } from 'connectors'
import { Select } from '@chakra-ui/react'
import { useRedditPostAPI, useRedditState } from 'state/reddit/hooks'
import ReactMarkdown from 'react-markdown'
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
                itemUrl,
                
                community {
                    moderator,
                    token,
                    id
                }
            }
        }`

const client = getCuratemApolloClient(NETWORK_CHAIN_ID)

interface MarketMetadata {
    url: string
    type: string
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
 

export default function ViewMarket(props: any) {
    let { market } = props.match.params
    const { marketMakerData } = useGraphMarketMakerData(market, NETWORK_CHAIN_ID)
    console.log(marketMakerData)

    const { metadata } = useMarketMetadata(market)
    
    const { data, error, loading, refetch } = useQuery(query, {
        variables: { 
            id: market
        },
        client,
    })

    const { fetchPost } = useRedditPostAPI()
    useEffect(() => {
        if(data) fetchPost(data.market.itemUrl)
    }, [data])

    const redditState = useRedditState()
    const redditPost = data && redditState[data.market.itemUrl]

    console.log(data)
    console.log(metadata)

    return <>
        <div>
            <h5>Post content</h5>
            <ReactMarkdown>
            { redditPost && redditPost.selftext }
            </ReactMarkdown>
            {/* <span>{ redditPost && redditPost.selftext }</span> */}

            <h5>Author</h5>
            <span>@{ redditPost && redditPost.author }</span>

            <h5>Posted</h5>
            { redditPost && (new Date(redditPost.created * 1000)).toString() }
            { data && data.market.itemUrl }
        </div>

        <div>
            Your bet
            <SpamSelector/>
        </div>
    </>
}

const SpamSelector = () => {
    return <Select placeholder="None">
        <option value="spam">Spam</option>
        <option value="not-spam">Not Spam</option>
    </Select>
}