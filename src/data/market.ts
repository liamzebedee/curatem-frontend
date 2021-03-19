import { ChainId, Fetcher, Pair, Token as UniswapToken, Route, JSBI, Fraction } from '@uniswap/sdk';
import { NETWORK_CHAIN_ID } from 'connectors';
import { ethers } from 'ethers';
import gql from 'graphql-tag';
import { getApolloClient, getCuratemApolloClient } from 'utils/getApolloClient';
import _ from 'lodash'

import {
    Community,
    Token,
    SpamPredictionMarket,
    SpamPredictionMarketData,
    MarketData
} from './types'
import { useBalanceActions } from 'state/balances/hooks';

const client = getCuratemApolloClient(NETWORK_CHAIN_ID);
const omenClient = getApolloClient(NETWORK_CHAIN_ID);

const marketQuery = gql`
    query GetCuratemMarket($id: ID!) {
        spamPredictionMarket(id: $id) {
            id
            questionId
            itemUrl
            spamToken
            notSpamToken
            finalized
            sharesMinted
            sharesRedeemed

            community {
                moderatorArbitrator
                token {
                    id
                    name
                    symbol
                    decimals
                }
                id
            }
        }
    }
`;

interface Question extends Record<string, any> {
    id: string;
    openingTimestamp: string;
    timeout: string;
    currentAnswer: any;
    currentAnswerTimestamp: string;
    arbitrator: string;
    isPendingArbitration: boolean;
    answerFinalizedTimestamp: string;
    arbitrationRequestedTimestamp: string
    arbitrationRequestedBy: string

    answers: QuestionAnswer[]
}

interface QuestionAnswer {
    id: string
    timestamp: string
    answer: string
    bondAggregate: string
}
interface QuestionData {
    question: Question
}

const questionQuery = gql`
    query GetQuestion($id: ID!) {
        question(id: $id) {
            id

            templateId
            data
            title
            outcomes
            category
            language

            arbitrator
            openingTimestamp
            timeout

            currentAnswer
            currentAnswerBond
            currentAnswerTimestamp

            arbitrationRequestedTimestamp
            arbitrationRequestedBy
            isPendingArbitration
            arbitrationOccurred

            answerFinalizedTimestamp

            answers {
                id,
                timestamp,
                answer,
                bondAggregate
            } 
        }
    }
`;

async function loadMarketFromSubgraph(marketId: string) {
    const queryResult = await client.query<{ spamPredictionMarket: SpamPredictionMarket }>({
        query: marketQuery,
        variables: {
            id: marketId,
        },
    });

    if (queryResult.error) {
        throw new Error(`Error getting market data from Graph - ${queryResult.error.toString()}`);
    }

    if (queryResult.data.spamPredictionMarket == null) {
        throw new Error('Market could not be found');
    }

    return queryResult.data.spamPredictionMarket;
}

async function loadQuestionFromSubgraph(questionId: string) {
    const queryResult = await omenClient.query<QuestionData>({
        query: questionQuery,
        variables: {
            id: questionId,
        },
    });

    if (queryResult.error) {
        throw new Error(`Error getting question data from Graph - ${queryResult.error.toString()}`);
    }

    if (queryResult.data.question == null) {
        throw new Error('Realitio question could not be found');
    }

    return queryResult.data.question
}

export interface RealitioEvent {
    time: number
    type: string
}


export interface CreationEvent extends RealitioEvent {
    type: 'created'
}
export interface AnswerPosted extends RealitioEvent {
    type: 'answer-posted'
    bond: string
    answer: string
}

export interface ArbitrationRequested extends RealitioEvent {
    type: 'arbitration-requested'
    by: string
}

export interface ArbitrationAnswer extends RealitioEvent {
    type: 'arbitration-answer'
    answer: string
}

export interface Finalised extends RealitioEvent {
    type: 'finalised'
    answer: string
}

export interface AwaitingAnswer extends RealitioEvent {
    type: 'awaiting-answer'
    remainingTimer: number
}

// A question is asked.
// Anyone may provide an answer with a bond within the question timeframe.

// You post a question to the askQuestion() function, specifiying:
// The question text and terms. (See "Encoding questions" below.)
// The timeout, which is how many seconds since the last answer the system will wait before finalizing on it.
// The arbitrator, which is the address of a contract that will be able to intervene and decide the final answer, in return for a fee.
// Anyone can post an answer by calling the submitAnswer() function. They must supply a bond with their answer.
// Supplying an answer sets their answer as the "official" answer, and sets the clock ticking until the timeout elapses and system finalizes on that answer.
// Anyone can either a different answer or the same answer again. Each time they must supply at least double the previous bond. Each new answer resets the timeout clock.
// Prior to finalization, anyone can pay an arbitrator contract to make a final judgement. Doing this freezes the system until the arbitrator makes their judgement and sends a submitAnswerByArbitrator() transaction to the contract.
// Once the timeout from the last answer has elapsed, the system considers it final.
// Once finalized, anyone can run the claimWinnings() function to distribute the bounty and bonds to each owner's balance, still held in the contract.
// Users can call withdraw() to take ETH held in their balance out of the contract.
class EventHistory {
    events: Array<any> = []

    push(event: any) {
        this.events = _.sortBy(
            [
                ...this.events,
                event
            ], 
            ['time']
        )
    }

    get() {
        return this.events
    }
}

async function buildRealitioHistory(questionId: string, question: Question) {
    let events = new EventHistory()
    
    const created: CreationEvent = {
        type: 'created',
        time: parseInt(question.openingTimestamp)
    }
    events.push(created)

    question.answers.forEach(answer => {
        const answerPosted: AnswerPosted = {
            type: 'answer-posted',
            time: parseInt(answer.timestamp),
            bond: answer.bondAggregate,
            answer: answer.answer
        }
        events.push(answerPosted)
    })

    if(question.arbitrationRequestedBy) {
        const arbitrationRequested: ArbitrationRequested = {
            type: 'arbitration-requested',
            time: parseInt(question.arbitrationRequestedTimestamp),
            by: question.arbitrationRequestedBy
        }
        events.push(arbitrationRequested)
    }

    if(question.arbitrationOccurred) {
        // The answers array will include this arbitrator's answer,
        // which will be confusing to display as the bond is 0.
        // So we splice the array at the index of this event.
        // Bit of a hack.
        // TODO: this was a bit buggy, after the following events:
        // 1. Submit one answer
        // 2. Request arbitration.
        // let i = _.findLastIndex(events.events, event => event.type == 'answer-posted')
        // events.events.splice(i)

        const arbitrationAnswer: ArbitrationAnswer = {
            type: 'arbitration-answer',
            time: parseInt(question.answerFinalizedTimestamp),
            answer: question.currentAnswer
        }
        events.push(arbitrationAnswer)

        const finalised: Finalised = {
            type: 'finalised',
            time: parseInt(question.answerFinalizedTimestamp),
            answer: question.currentAnswer
        }
        events.push(finalised)
    } else if (question.currentAnswerTimestamp) {
        const nowInSeconds = Math.floor(+new Date() / 1000);
        const currentAnswerTimestamp = parseInt(question.currentAnswerTimestamp)
        const timeout = parseInt(question.timeout)

        let remainingTimer = (currentAnswerTimestamp + timeout) - nowInSeconds
        if(remainingTimer > 0) {
            // Still waiting answer. Show timeout.
            // TODO
            const ev: AwaitingAnswer = {
                time: nowInSeconds,
                type: 'awaiting-answer',
                remainingTimer
            }
            events.push(ev)
        } else {
            const finalised: Finalised = {
                type: 'finalised',
                time: currentAnswerTimestamp + timeout,
                answer: question.currentAnswer
            }
            events.push(finalised)
        }
    }

    return events.get().reverse()
}



export async function loadMarket(account: any, library: any, marketId: string) {
    const data = await loadMarketFromSubgraph(marketId)

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

    const questionData = await loadQuestionFromSubgraph(data.questionId)
    const questionHistory = await buildRealitioHistory(data.questionId, questionData)
    console.debug('questionHistory', questionHistory)

    if (questionData.answerFinalizedTimestamp != null) {
        marketData.state = 'resolved';
    } else if (
        questionData.isPendingArbitration ||
        questionData.currentAnswerTimestamp != null ||
        parseInt(questionData.openingTimestamp) < nowInSeconds
    ) {
        marketData.state = 'resolving';
    } else {
        marketData.state = 'open';
    }

    let uniSpamToken = new UniswapToken(ChainId.KOVAN, spamToken.address, 18, "SPAM")
    let uniNotSpamToken = new UniswapToken(ChainId.KOVAN, notSpamToken.address, 18, "NOT-SPAM")
    let uniCollateralToken = new UniswapToken(ChainId.KOVAN, data.community.token.id, 18, "REP")

    const pairSpamCollateral = await Fetcher.fetchPairData(uniSpamToken, uniCollateralToken, library)
    const pairNotSpamCollateral = await Fetcher.fetchPairData(uniNotSpamToken, uniCollateralToken, library)
    
    function getUniswapPoolInfo(pair: Pair, token: UniswapToken) {
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
        tokens: {
            outcomes: {
                notSpamToken: notSpamToken.address,
                spamToken: spamToken.address
            },
            lpshares: {
                spam: pairSpamCollateral.liquidityToken.address,
                notSpam: pairNotSpamCollateral.liquidityToken.address
            }
        },
        user: {
            spamToken_balance,
            notSpamToken_balance,
        },
        amm,
        totalVolume,
        market: marketData,
        question: questionData,
        spamPredictionMarket: data,
        questionHistory
    };
}

