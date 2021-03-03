import { ChainId, Fetcher, Pair, Token, Route, JSBI, Fraction } from '@uniswap/sdk';
import { NETWORK_CHAIN_ID } from 'connectors';
import { ethers } from 'ethers';
import gql from 'graphql-tag';
import { getApolloClient, getCuratemApolloClient } from 'utils/getApolloClient';

const client = getCuratemApolloClient(NETWORK_CHAIN_ID);
const omenClient = getApolloClient(NETWORK_CHAIN_ID);

export interface MarketData {
    state?: 'open' | 'resolving' | 'resolved';
}

export interface Community {
    id: string
    moderator: string
    token: string
}

export interface SpamPredictionMarketData {
    spamPredictionMarket: {
        id: string;
        questionId: string;
        itemUrl: string;
        spamToken: string;
        notSpamToken: string;
        community: Community;
    };
}
const marketQuery = gql`
    query GetCuratemMarket($id: ID!) {
        spamPredictionMarket(id: $id) {
            id
            questionId
            itemUrl
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
        id: string;
        openingTimestamp: string;
        timeout: string;
        currentAnswer: any;
        currentAnswerTimestamp: string;
        arbitrator: string;
        isPendingArbitration: boolean;
        answerFinalizedTimestamp: string;
    };
}

const questionQuery = gql`
    query GetQuestion($id: ID!) {
        question(id: $id) {
            id,
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



export async function loadMarket(account: any, library: any, marketId: string) {
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

    const spamToken = new ethers.Contract(
        data.spamToken,
        require('@curatem/contracts/abis/ERC20.json'),
        library,
    );
    const notSpamToken = new ethers.Contract(
        data.notSpamToken,
        require('@curatem/contracts/abis/ERC20.json'),
        library,
    );
    const market = new ethers.Contract(
        data.id,
        require('@curatem/contracts/abis/SpamPredictionMarket.json'),
        library,
    );

    const spamToken_balance = await spamToken.balanceOf(account);
    const notSpamToken_balance = await notSpamToken.balanceOf(account);
    const totalVolume = await spamToken.totalSupply();

    const nowInSeconds = Math.floor(+new Date() / 1000);
    const marketData: MarketData = {
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

    let uniSpamToken = new Token(ChainId.KOVAN, spamToken.address, 18, "SPAM")
    let uniNotSpamToken = new Token(ChainId.KOVAN, notSpamToken.address, 18, "NOT-SPAM")
    let uniCollateralToken = new Token(ChainId.KOVAN, data.community.token, 18, "REP")

    const pairSpamCollateral = await Fetcher.fetchPairData(uniSpamToken, uniCollateralToken, library)
    const pairNotSpamCollateral = await Fetcher.fetchPairData(uniNotSpamToken, uniCollateralToken, library)
    
    function getUniswapPoolInfo(pair: Pair, token: Token) {
        console.debug(`Getting info for ${pair.token0.symbol}/${pair.token1.symbol} pool`)
        console.debug(`Reserves: ${pair.reserve0.toFixed(5)} ${pair.token0.symbol}, ${pair.reserve1.toFixed(5)} ${pair.token1.symbol}`)
        if(pair.reserveOf(token).equalTo(JSBI.BigInt(0))) {
            // if the pool is empty, then we return the price as 1.
            return new Fraction(
                JSBI.BigInt(1),
                JSBI.BigInt(1)
            )
        }

        const route = new Route([pair], token)
        return route.midPrice
    }
    
    async function getBalance(tokenAddress: string) {
        const token = new ethers.Contract(
            tokenAddress,
            require('@curatem/contracts/abis/ERC20.json'),
            library
        );
        return await token.balanceOf(account)
    }
    
    let amm = {
        prices: {
            spam: '',
            notspam: ''
        },
        reserves: {
            spam: pairSpamCollateral.reserveOf(uniSpamToken).toFixed(6),
            notspam: pairNotSpamCollateral.reserveOf(uniNotSpamToken).toFixed(6)
        },
        lpshares: {
            spam: await getBalance(pairSpamCollateral.liquidityToken.address),
            notspam: await getBalance(pairNotSpamCollateral.liquidityToken.address)
        }
    }

    

    let midPrices = [
        getUniswapPoolInfo(pairNotSpamCollateral, uniNotSpamToken),
        getUniswapPoolInfo(pairSpamCollateral, uniSpamToken)
    ]

    let sumPrices = midPrices.reduce(
        (prev, curr) => prev.add(curr),
        new Fraction(JSBI.BigInt(0), JSBI.BigInt(1))
    )

    // Odds are determined by normalising the price of each outcome token.
    console.debug('midPrices', midPrices.map(price => price.toFixed(5)).join(','))
    let odds = midPrices.map(price => price.divide(sumPrices))
    
    amm.prices.notspam = odds[0].toFixed(6)
    amm.prices.spam = odds[1].toFixed(6)
    
    console.debug(odds)

    return {
        user: {
            spamToken_balance,
            notSpamToken_balance,
        },
        amm,
        totalVolume,
        market: marketData,
        question,
        ...marketQueryResult.data,
    };
}

