import { useGraphMarketMakerData } from 'hooks/useGraphMarketData';
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from '@reach/router';
import { getApolloClient, getCuratemApolloClient } from 'utils/getApolloClient';
import gql from 'graphql-tag';
import { useLazyQuery, useQuery } from '@apollo/client';
import { NETWORK_CHAIN_ID } from 'connectors';
import { Button, Heading, Select } from '@chakra-ui/react';
import { useRedditPostAPI, useRedditState } from 'state/reddit/hooks';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import { BigNumber, ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import { useQuery as useReactQuery } from 'react-query';
import { getSigner } from 'utils/getLibrary';
import { useContractDeployments } from '../../hooks/useContractDeployments';
import { fromWei, toWei } from 'utils';
import { Currency, CurrencyAmount } from '@uniswap/sdk';
import FormattedCurrencyAmount from 'components/FormattedCurrencyAmount';
import { BalancerSwapper } from 'components/BalancerSwapper';
import { NULL_ADDRESS } from '../../constants'
// import { BalancerSwapper } from 'balancer-swapper'

interface ViewMarketProps extends RouteComponentProps {
    market?: string;
}

interface SpamPredictionMarketData {
    spamPredictionMarket: {
        questionId: string;
        itemUrl: string;
        id: string;
        spamToken: string;
        notSpamToken: string;
    };
}
const marketQuery = gql`
    query GetCuratemMarket($id: ID!) {
        spamPredictionMarket(id: $id) {
            questionId
            itemUrl
            id
            spamToken
            notSpamToken

            community {
                moderator
                token
                id
            }
        }
    }
`;

interface QuestionData {
    question: {
        openingTimestamp: string;
        arbitrator: string;
        timeout: string;
        currentAnswerTimestamp: string;
        isPendingArbitration: boolean;
        answerFinalizedTimestamp: string;
    };
}

const questionQuery = gql`
    query GetQuestion($id: ID!) {
        question(id: $id) {
            openingTimestamp
            timeout
            currentAnswer
            currentAnswerTimestamp
            arbitrator
            isPendingArbitration
            answerFinalizedTimestamp
        }
    }
`;

const client = getCuratemApolloClient(NETWORK_CHAIN_ID);
const omenClient = getApolloClient(NETWORK_CHAIN_ID);

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

type MarketState = 'open' | 'closed';
interface PredictionMarket {
    state: MarketState;
}

const Row = styled.div`
    display: flex;
    flex-direction: row;
    > * {
        margin-right: 1rem;
    }
    margin-bottom: 1rem;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    > * {
        margin-bottom: 1rem;
    }
    margin-right: 1rem;
`;

const PostContent = styled.div`
    display: block;

    border: 1px solid #ddd;
    padding: 1em;
    width: 1000px;
`;

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
`;

const YourBet = styled.div`
    display: block;
    flex: 0 0;
    align-self: start;

    border: 1px solid #ddd;
    padding: 1em;
    width: 400px;
`;

const MarketOverview = styled.div`
    display: block;
    border: 1px solid #ddd;
    padding: 1em;
    width: 1000px;
    justify-self: left;
`;

const TokenSwapper = styled.div`
    display: block;
    flex: 1 0;
    align-self: start;

    border: 1px solid #ddd;
    padding: 1em;
    width: 400px;
`;

interface MarketData {
    state?: 'open' | 'resolving' | 'resolved';
    pool: string;
}

async function loadMarket(account: any, library: any, marketId: string) {
    const marketQueryResult = await client.query<SpamPredictionMarketData>({
        query: marketQuery,
        variables: {
            id: marketId,
        },
    });

    if (marketQueryResult.error) {
        throw new Error(`Error getting market data from Graph - ${marketQueryResult.error.toString()}`);
    }

    if (marketQueryResult.data === null) {
        throw new Error('Market could not be found');
    }

    const data = marketQueryResult.data.spamPredictionMarket;

    const spamToken = new ethers.Contract(data.spamToken, require('@curatem/contracts/abis/ERC20.json'), library);
    const notSpamToken = new ethers.Contract(data.notSpamToken, require('@curatem/contracts/abis/ERC20.json'), library);
    const market = new ethers.Contract(data.id, require('@curatem/contracts/abis/SpamPredictionMarket.json'), library);

    const pool = await market.pool();
    console.debug(`Pool exists? ${pool}`);

    const spamToken_balance = await spamToken.balanceOf(account);
    const notSpamToken_balance = await notSpamToken.balanceOf(account);
    const totalVolume = await spamToken.totalSupply();

    const nowInSeconds = Math.floor(+new Date() / 1000);
    const marketData: MarketData = {
        pool,
    };

    const { data: questionData, error } = await omenClient.query<QuestionData>({
        query: questionQuery,
        variables: {
            id: data.questionId,
        },
    });
    const { question } = questionData;

    if (error) {
        throw new Error(`Error getting question data from Graph - ${error.toString()}`);
    }

    if (question == null) {
        throw new Error('Realitio question could not be found');
    }

    if (question.answerFinalizedTimestamp != null) {
        marketData.state = 'resolved';
    } else if (
        question.isPendingArbitration ||
        question.currentAnswerTimestamp != null ||
        parseInt(question.openingTimestamp) < nowInSeconds
    ) {
        marketData.state = 'resolving';
    } else {
        marketData.state = 'open';
    }

    console.debug(spamToken_balance, notSpamToken_balance, totalVolume, questionData);

    return {
        user: {
            spamToken_balance,
            notSpamToken_balance,
        },
        totalVolume,
        market: marketData,
        question,
        ...marketQueryResult.data,
    };
}

const MarketStateIcon = ({ state }: { state: string }) => {
    return <>{state.toUpperCase()}</>;
};

export default function ViewMarket(props: any) {
    const { market } = props.match.params;

    const { account, library } = useWeb3React();
    const { data, isLoading: loading, error } = useReactQuery<any, Error>(
        ['load-market', market],
        () => loadMarket(account, library, market),
        { retry: 1 },
    );

    const { fetchPost } = useRedditPostAPI();
    useEffect(() => {
        if (data && data.spamPredictionMarket) {
            fetchPost(data.spamPredictionMarket.itemUrl);
        }
    }, [account, library, data, fetchPost]);

    const redditState = useRedditState();
    const redditPost = data && data.spamPredictionMarket && redditState[data.spamPredictionMarket.itemUrl];

    if (loading) return null;

    if (error) return <>{error.toString()}</>;

    if (data.spamPredictionMarket === null) {
        return <>No market found.</>;
    }

    const tokens = [
        data.spamPredictionMarket.spamToken,
        data.spamPredictionMarket.notSpamToken,
        data.spamPredictionMarket.community.token,
    ];

    return (
        <>
            <Row>
                <Column>
                <PostContent>
                    <Heading as="h3" size="md">
                        Post content
                    </Heading>

                    <PostContentPreview>
                        <ReactMarkdown>{redditPost && redditPost.selftext}</ReactMarkdown>
                    </PostContentPreview>

                    <Heading as="h3" size="md">
                        Author
                    </Heading>
                    <span>@{redditPost && redditPost.author}</span>

                    <Heading as="h3" size="md">
                        Posted
                    </Heading>
                    <a href={data.spamPredictionMarket.itemUrl} target="_blank" rel="noreferrer">
                        {redditPost && new Date(redditPost.created * 1000).toString()}
                    </a>
                </PostContent>

                <MarketOverview>
                    <Heading as="h3" size="md">
                        Prediction market
                    </Heading>

                    <MarketStateIcon state={data.market.state} />

                        {/* { data.market.state !== 'resolved' 
                    ? <p>Closes in {question.openingTimestamp}</p> 
                    : null }
                    
                    Closes in:  */}

                    <p>Question ID: {data.spamPredictionMarket.questionId}</p>
                    <p>Balancer Pool: {data.market.pool}</p>
                    <p>Tokens: {tokens}</p>
                </MarketOverview>

                </Column>


                <Column>
                    <YourBet>
                        <Heading as="h3" size="md">
                            Your bet
                        </Heading>

                        <SpamSelector {...data.spamPredictionMarket} market={data.spamPredictionMarket.id} />

                        <div>
                            <p>{fromWei(data.user.spamToken_balance)} SPAM</p>
                            <p>{fromWei(data.user.notSpamToken_balance)} NOT-SPAM</p>
                        </div>
                    </YourBet>

                    <TokenSwapper>
                        <Heading as="h3" size="md">
                            Trade
                        </Heading>
                        
                    </TokenSwapper>
                </Column>
            </Row>

            <Row>

                
            </Row>
        </>
    );
}

async function checkBalanceAndAllow(token: ethers.Contract, amount: BigNumber, holder: string, spender: string) {
    let balance = ethers.constants.Zero
    let allowance = ethers.constants.Zero
    let error

    balance = await token.balanceOf(holder);
    if (balance.lt(amount)) {
        error = new Error(`Token balance is too low. Balance: ${balance.toString()}, minimum buy: 1,000,000`)
        return [balance, allowance, error]
    }

    allowance = await token.allowance(
        holder,
        spender
    )
    if (allowance.lt(amount)) {
        await token.approve(spender, ethers.constants.MaxUint256, { from: holder });
    }

    return [balance, allowance, null]
}

const SpamSelector = (props: any) => {
    const { account, library } = useWeb3React();
    const { deployments } = useContractDeployments();


    async function onSelect(ev: any) {
        const { value } = ev.target;
        purchase(value)
    }
    
    async function purchase(outcome: 'spam' | 'notspam') {
        const outcomes = ['notspam', 'spam']
        const signer = getSigner(library, account!);
        const buyAmount = toWei('1')

        const market = new ethers.Contract(
            props.market,
            require('@curatem/contracts/abis/SpamPredictionMarket.json'),
            signer,
        );
        const spamToken = new ethers.Contract(props.spamToken, require('@curatem/contracts/abis/ERC20.json'), library);
        const notSpamToken = new ethers.Contract(
            props.notSpamToken,
            require('@curatem/contracts/abis/ERC20.json'),
            library,
        );
        const collateralToken = new ethers.Contract(
            props.community.token,
            require('@curatem/contracts/abis/ERC20.json'),
            signer,
        );


        const scripts = new ethers.Contract(
            deployments['Scripts'].address,
            require("@curatem/contracts/abis/Scripts.json"),
            getSigner(library, account!)
        )

        const [balance, allowance, error] = await checkBalanceAndAllow(collateralToken, buyAmount, account!, scripts.address)
        if(error) {
            setError(error.toString());
            return
        }

        await scripts.buyOutcomeElseProvideLiquidity(
            market.address,
            outcomes.indexOf(outcome),
            buyAmount,
            '9',
            '10',
            deployments['UniswapV2Router02'].address,
            '10000',
            '10000'
        )
    }

    const [error, setError] = useState('');

    return (
        <>
            <Select placeholder="None" onChange={onSelect}>
                <option value="spam">Spam</option>
                <option value="notspam">Not Spam</option>
            </Select>
            
            <br/>
            {error}
        </>
    );
};

