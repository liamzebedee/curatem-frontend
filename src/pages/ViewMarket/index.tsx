import { useGraphMarketMakerData } from 'hooks/useGraphMarketData'
import React, { useEffect, useState } from 'react'
import { RouteComponentProps } from '@reach/router'
import { getApolloClient, getCuratemApolloClient } from 'utils/getApolloClient'
import gql from 'graphql-tag'
import { useLazyQuery, useQuery } from '@apollo/client'
import { NETWORK_CHAIN_ID } from 'connectors'
import { Heading, Select } from '@chakra-ui/react'
import { useRedditPostAPI, useRedditState } from 'state/reddit/hooks'
import ReactMarkdown from 'react-markdown'
import styled from 'styled-components'
import { ethers } from 'ethers'
import { useWeb3React } from '@web3-react/core'
import { useQuery as useReactQuery } from 'react-query'
const ipfsClient = require('ipfs-http-client')

interface ViewMarketProps extends RouteComponentProps {
    market?: string
}

interface SpamPredictionMarketData {
    spamPredictionMarket: {
        questionId: string
        itemUrl: string
        id: string
        spamToken: string
        notSpamToken: string
    }
}
const marketQuery = gql`
        query GetCuratemMarket($id: ID!) {
            spamPredictionMarket(id: $id) {
                questionId,
                itemUrl,
                id,
                spamToken,
                notSpamToken,
                
                community {
                    moderator,
                    token,
                    id
                }
            }
        }`


interface QuestionData {
    question: {
        openingTimestamp: string
        arbitrator: string
        timeout: string
        currentAnswerTimestamp: string
        isPendingArbitration: boolean
        answerFinalizedTimestamp: string
    }
}

const questionQuery = gql`
    query GetQuestion($id: ID!) {
        question(id: $id){
            openingTimestamp,
            timeout,
            currentAnswer,
            currentAnswerTimestamp,
            arbitrator,
            isPendingArbitration,
            answerFinalizedTimestamp
        }
    }
`




const client = getCuratemApolloClient(NETWORK_CHAIN_ID)
const omenClient = getApolloClient(NETWORK_CHAIN_ID)

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

type MarketState = 'open' | 'closed'
interface PredictionMarket {
    state: MarketState
}


const Row = styled.div`
    display: flex;
    flex-direction: row;
    > * {
        margin-right: 1rem;
    }
    margin-bottom: 1rem;
`

const PostContent = styled.div`
  display: block;

  border: 1px solid #ddd;
  padding: 1em;
  width: 1000px;
`

const PostContentPreview = styled.div`
    max-height: 500px;
    overflow-y: scroll;
    white-space: pre-wrap;
    border: 1px solid gray;
    border-radius: 5px;
    padding: 1rem 2rem;
    margin: 1rem 0;

    > * {
        margin-bottom: 0.5rem;
    }
`

const YourBet = styled.div`
  display: block;
  flex: 1 0;
  align-self: start;

  border: 1px solid #ddd;
  padding: 1em;
  width: 400px;
`

const MarketOverview = styled.div`
  display: block;
  border: 1px solid #ddd;
  padding: 1em;
  width: 1000px;
  justify-self: left;
`

const TokenSwapper = styled.div`
  display: block;
  flex: 1 0;
  align-self: start;

  border: 1px solid #ddd;
  padding: 1em;
  width: 400px;
`

interface MarketData {
    state?: 'open' | 'resolving' | 'resolved'
}


async function loadMarket(account: any, library: any, marketId: string) {
    const marketQueryResult = await client.query<SpamPredictionMarketData>({
        query: marketQuery,
        variables: {
            id: marketId
        }
    })

    if(marketQueryResult.error) {
        throw new Error(`Error getting market data from Graph - ${marketQueryResult.error.toString()}`)
    }

    if(marketQueryResult.data === null) {
        throw new Error("Market could not be found")
    }

    const data = marketQueryResult.data.spamPredictionMarket

    const spamToken = new ethers.Contract(
        data.spamToken,
        require('@curatem/contracts/abis/ERC20.json'),
        library
    )
    const notSpamToken = new ethers.Contract(
        data.notSpamToken,
        require('@curatem/contracts/abis/ERC20.json'),
        library
    )
    const market = new ethers.Contract(
        data.id,
        require('@curatem/contracts/abis/SpamPredictionMarket.json'),
        library
    )

    const spamToken_balance = await spamToken.balanceOf(account)
    const notSpamToken_balance = await notSpamToken.balanceOf(account)
    const totalVolume = await spamToken.totalSupply()

    let nowInSeconds = Math.floor(+(new Date()) / 1000)
    let marketData: MarketData = {}

    const { data: questionData, error } = await omenClient.query<QuestionData>({
        query: questionQuery,
        variables: {
            id: data.questionId
        }
    })
    const { question } = questionData

    if(error) {
        throw new Error(`Error getting question data from Graph - ${error.toString()}`)
    }

    if(question.answerFinalizedTimestamp != null) {
        marketData.state = 'resolved'
    } else if (
        question.isPendingArbitration 
        || question.currentAnswerTimestamp != null
        || parseInt(question.openingTimestamp) < nowInSeconds) 
    {
        marketData.state = 'resolving'
    } else {
        marketData.state = 'open'
    }
    
    console.debug(spamToken_balance, notSpamToken_balance, totalVolume, questionData)

    return {
        user: {
            spamToken_balance,
            notSpamToken_balance
        },
        totalVolume,
        market: marketData,
        ...marketQueryResult.data
    }
}

const MarketStateIcon = ({ state }: { state: string }) => {
    return <>{state.toUpperCase()}</>
}

export default function ViewMarket(props: any) {
    let { market } = props.match.params

    const { account, library } = useWeb3React()
    const { data, isLoading: loading, error } = useReactQuery<any, Error>('load-market', () => loadMarket(account, library, market))


    const { fetchPost } = useRedditPostAPI()
    useEffect(() => {
        if(data && data.spamPredictionMarket) {
            fetchPost(data.spamPredictionMarket.itemUrl)
        }
    }, [account, library, data])

    const redditState = useRedditState()
    const redditPost = data && data.spamPredictionMarket && redditState[data.spamPredictionMarket.itemUrl]

    if(loading) return null

    if(error) return <>{error.toString()}</>

    if(data.spamPredictionMarket === null) {
        return <>No market found.</>
    }

    return <>
        <Row>
            <PostContent>
                <Heading as="h3" size="md">
                    Post content
                </Heading>
                <PostContentPreview>
                    <ReactMarkdown>
                    { redditPost && redditPost.selftext }
                    </ReactMarkdown>
                </PostContentPreview>

                <Heading as="h3" size="md">
                    Author
                </Heading>
                <span>@{ redditPost && redditPost.author }</span>

                <Heading as="h3" size="md">
                    Posted
                </Heading>
                <a href={data.spamPredictionMarket.itemUrl} target="_blank">
                    { redditPost && (new Date(redditPost.created * 1000)).toString() }
                </a>
            </PostContent>

            <YourBet>
                <Heading as="h3" size="md">
                    Your bet
                </Heading>
                <SpamSelector/>
            </YourBet>
        </Row>

        <Row>
            <MarketOverview>
                <Heading as="h3" size="md">
                    Prediction market
                </Heading>

                <MarketStateIcon state={data.market.state}/>

                Question ID: {data.spamPredictionMarket.questionId}
            </MarketOverview>

            <TokenSwapper>

            </TokenSwapper>
        </Row>
    </>
}


const SpamSelector = () => {
    return <Select placeholder="None">
        <option value="spam">Spam</option>
        <option value="not-spam">Not Spam</option>
    </Select>
}