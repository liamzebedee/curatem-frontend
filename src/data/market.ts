import { NETWORK_CHAIN_ID } from 'connectors';
import { ethers } from 'ethers';
import gql from 'graphql-tag';
import { getApolloClient, getCuratemApolloClient } from 'utils/getApolloClient';

const client = getCuratemApolloClient(NETWORK_CHAIN_ID);
const omenClient = getApolloClient(NETWORK_CHAIN_ID);

export interface MarketData {
    state?: 'open' | 'resolving' | 'resolved';
    pool: string;
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
