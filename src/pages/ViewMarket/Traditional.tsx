import { Button, Heading, Progress, Select, Link, Tooltip, Icon } from '@chakra-ui/react';
import { RouteComponentProps } from '@reach/router';
import { CurrencyAmount, TokenAmount } from '@uniswap/sdk';
import { useWeb3React } from '@web3-react/core';
import { AnswerPosted, ArbitrationAnswer, ArbitrationRequested, AwaitingAnswer, CreationEvent, Finalised, loadMarket } from 'data/market';
import { BigNumber, ethers } from 'ethers';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useQuery as useReactQuery } from 'react-query';
import { useRedditPostAPI, useRedditState } from 'state/reddit/hooks';
import styled from 'styled-components';
import { fromWei, shortenAddress, timeAgo, toPercent, toRelativeTs, toWei } from 'utils';
import { getSigner } from 'utils/getLibrary';
import { generateEtherscanLink, generateEtherscanTokenLink, generateRealityEthLink, generateUniswapTradeLink } from 'utils/links';
import { useContractDeployments } from '../../hooks/useContractDeployments';
import { UniswapSwapper } from '../../components/UniswapSwapper'
import { ExternalLinkIcon, LockIcon } from '@chakra-ui/icons';
import { Question } from 'utils/types';
import { DateTime } from 'luxon';
import { resolveContracts } from 'utils/resolver';
import { useBalanceActions, useBalances } from 'state/balances/hooks';

interface ViewMarketProps extends RouteComponentProps {
    market?: string;
}

const Row = styled.div`
    display: flex;
    flex-direction: row;
    > * {
        margin-right: 1rem;
        margin-left: 1rem;
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
    max-width: 1000px;
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
    flex: 0 1;
    align-self: start;

    border: 1px solid #ddd;
    padding: 1em;
    width: 350px;

    > * {
        margin-bottom: 0.5rem;
    }
`;

const MarketOverview = styled.div`
    display: block;
    border: 1px solid #ddd;
    padding: 1em;
    max-width: 1000px;
    justify-self: left;
    > div {
        margin-top: .5rem;
    }

    table {
        width: 100%;
    }
    thead {
        border-top: 1px solid #ddd;
        border-bottom: 1px solid #ddd;
        text-align: left;
    }
    
    th,
    td {
        padding: 0.25rem 1rem;
    }
`;

const RealitioHistory = styled.div`
    display: block;
    border: 1px solid #ddd;
    padding: 1em;
    max-width: 1000px;
    justify-self: left;
    > div {
        margin-top: 1rem;
    }
`

const RealitioHistoryItem = styled.div`
    margin-bottom: 1rem;
`

const MarketTableRow = styled.div`
    display: flex;
    flex-direction: row;
    flex: 1;
`


const TokenSwapper = styled.div`
    display: block;
    flex: 0 0;
    align-self: start;

    border: 1px solid #ddd;
    padding: 1em;
    max-width: 400px;
    width: 100%;

    iframe {

        border: 0;
        margin: 0 auto;
        display: block;
        border-radius: 10px;
        max-width: 600px;
        min-width: 300px;
    }
`;


const InlineList = styled.ul`
    display: grid;
    list-style: none;
    grid-template-columns: repeat(3,minmax(80px,auto));
    
    > li {
        margin-right: 2rem;
        display: inline-block;
    }
`




const MarketStateIcon = ({ state }: { state: string }) => {
    return <>{state.toUpperCase()}</>;
};

const REALITIO_ANSWER_INVALID = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
function getOutcomeFromIndex(question: Question, index: string) {
    if(index == REALITIO_ANSWER_INVALID) {
        return "Invalid"
    }
    if(index == null) {
        return null
    }
    return question.outcomes[BigNumber.from(index).toNumber()]
}

type QuestionEvent = CreationEvent | AnswerPosted | ArbitrationRequested | ArbitrationAnswer | Finalised | AwaitingAnswer

function getEventDescription(question: Question, event: QuestionEvent) {
    switch(event.type) {
        case 'created':
            return <>
                Market created
            </>
        case 'answer-posted':
            return <>
                Answer submitted - {getOutcomeFromIndex(question, event.answer)} - with bond {CurrencyAmount.ether(event.bond).toFixed(6)} ETH
            </>
        case 'arbitration-requested':
            return <>
                Arbitration requested by {event.by}
            </>
        case 'arbitration-answer':
            return <>
                Arbitrator set official answer - {getOutcomeFromIndex(question, event.answer)}
            </>
        case 'finalised':
            return <>
                Answer finalised - {getOutcomeFromIndex(question, event.answer)}
            </>
        case 'awaiting-answer':
            return <>
                Market will auto-resolve in {event.remainingTimer}s if answer isn't disputed and arbitration isn't requested.
            </>
    }
}

export default function ViewMarket(props: any) {
    const { market } = props.match.params;

    const { account, library, chainId } = useWeb3React();
    const { data, isLoading: loading, error } = useReactQuery<any, Error>(
        ['load-market', market],
        () => loadMarket(account, library, market),
        { retry: 1 },
    );

    const { fetchPost } = useRedditPostAPI();
    const balances = useBalances()
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
                            Post title
                        </Heading>

                        <div>
                        { redditPost && redditPost.title }
                        </div>

                        {/* <PostContentPreview>
                            <ReactMarkdown>{redditPost && redditPost.selftext}</ReactMarkdown>
                        </PostContentPreview> */}

                        <Heading as="h3" size="md">
                            Author
                        </Heading>
                        <span>@{redditPost && redditPost.author}</span>

                        <Heading as="h3" size="md">
                            Posted
                        </Heading>
                        <Link href={data.spamPredictionMarket.itemUrl} isExternal>
                            {redditPost && DateTime.fromMillis(redditPost.created * 1000).toRFC2822()} <ExternalLinkIcon mx="2px" />
                        </Link>
                    </PostContent>

                    <MarketOverview>
                        <Heading as="h3" size="md">
                            Prediction market
                        </Heading>

                        <div>
                            <InlineList>
                                <li>
                                    <MarketStateIcon state={data.market.state} />
                                </li>
                                
                                <li>
                                    <p><strong>Created</strong>: {DateTime.fromMillis(data.question.openingTimestamp * 1000).toRFC2822()}</p>
                                </li>
                                
                                <li>
                                    <strong>Total volume</strong>: {CurrencyAmount.ether(data.totalVolume).toFixed(6)}
                                </li>

                                <li>
                                    <strong>Oracle:</strong> <Link href={generateRealityEthLink(data.question.id)} isExternal>reality.eth <ExternalLinkIcon mx="2px" /></Link>
                                </li>
                                
                                <li>
                                    <strong>Arbitrator</strong>: Community Moderators (
                                        <Link href={generateEtherscanLink('address', data.spamPredictionMarket.community.moderatorArbitrator, chainId!)}>
                                            { shortenAddress(data.spamPredictionMarket.community.moderatorArbitrator) } <ExternalLinkIcon mx="2px" />
                                        </Link>)
                                </li>
                            </InlineList>
                        </div>

                        <br/>
                        
                        <div style={{ margin: '0 -1rem' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Outcome/probability</th>
                                        <th>Liquidity</th>
                                        {/* <th>Volume</th> */}
                                        <th>My shares</th>
                                        <th>My LP shares</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        [
                                            {
                                                outcomeName: "Spam",
                                                outcomeTokenSymbol: "SPAM",
                                                odds: toPercent(data.amm.prices.spam),
                                                reserves: data.amm.reserves.spam,
                                                myShares: CurrencyAmount.ether(data.user.spamToken_balance),
                                                myLPShares: CurrencyAmount.ether(data.amm.lpshares.spam),
                                                tokenAddress: data.spamPredictionMarket.spamToken
                                            },
                                            {
                                                outcomeName: "Not Spam",
                                                outcomeTokenSymbol: "NOT-SPAM",
                                                odds: toPercent(data.amm.prices.notspam),
                                                reserves: data.amm.reserves.notspam,
                                                myShares: CurrencyAmount.ether(data.user.notSpamToken_balance),
                                                myLPShares: CurrencyAmount.ether(data.amm.lpshares.notspam),
                                                tokenAddress: data.spamPredictionMarket.notSpamToken
                                            }
                                        ].map(({ outcomeName, outcomeTokenSymbol, odds, reserves, myShares, myLPShares, tokenAddress }) => <tr>
                                            <td width={'400'}>
                                                <MarketTableRow>
                                                    <header style={{ flex: 1 }} className="outcome">
                                                    { outcomeName }
                                                    </header>
                                                    <span className="odds">{ odds }%</span>
                                                </MarketTableRow>
        
                                                <MarketTableRow>
                                                    <div style={{ flex: 1 }}>
                                                        <Progress colorScheme="green" size="sm" value={parseFloat(odds)} />
                                                    </div>
                                                </MarketTableRow>
                                            </td>
                                            
                                            <td width={125}>
                                                {reserves}
                                            </td>
        
                                            <td width={175}>
                                                <p>
                                                    <Link href={generateEtherscanTokenLink(tokenAddress, account!, chainId!)} isExternal>
                                                        {
                                                            balances.tokens[tokenAddress] && CurrencyAmount.ether(balances.tokens[tokenAddress][account!].toString()).toFixed(6)
                                                        } <ExternalLinkIcon mx="2px" />
                                                    </Link>
                                                </p>
                                            </td>

                                            <td width={175}>
                                                <p>{myLPShares.toFixed(6)}</p>
                                            </td>
                                        </tr>)
                                    }
                                    
                                </tbody>
                            </table>
                        </div>

                    </MarketOverview>

                    <RealitioHistory>
                        <Heading as="h3" size="md">
                            History
                        </Heading>

                        <div>
                            {
                                data.questionHistory.map((event: QuestionEvent) => {
                                    const description = getEventDescription(data.question, event)
                                    const date = DateTime.fromMillis(event.time * 1000)
                                    return <RealitioHistoryItem>
                                        <div>{description}.</div>
                                        
                                        <div>
                                            <Tooltip label={date.toRFC2822()} aria-label={date.toISO()}>
                                            {timeAgo(date)}
                                            </Tooltip>
                                        </div>
                                    </RealitioHistoryItem>
                                })
                            }
                        </div>
                    </RealitioHistory>
                </Column>

                <Column>
                    <YourBet>
                        <Heading as="h3" size="md">
                            Your bet
                        </Heading>
                        
                        { !loading && <SpamSelector
                            tokens={data.tokens} 
                            {...data.spamPredictionMarket} 
                            market={data.spamPredictionMarket.id} /> }
                    </YourBet>
                    
                    <OutcomePanel data={data}/>
                    
                    <TokenSwapper>
                        <Heading as="h3" size="md">
                            Trade
                        </Heading>
                        
                        {
                            [
                                ['SPAM', data.spamPredictionMarket.spamToken], 
                                ['NOT-SPAM', data.spamPredictionMarket.notSpamToken]
                            ].map(([ tokenSymbol, tokenAddress ]) => 
                                <>
                                    <Link href={generateUniswapTradeLink(tokenAddress, data.spamPredictionMarket.community.token)} isExternal>
                                        Trade {tokenSymbol} <ExternalLinkIcon mx="2px" />
                                    </Link>
                                    <br/>
                                </>
                            )
                        }
                    </TokenSwapper>

                    <YourBet>
                        <Heading as="h3" size="md">
                            Moderate
                        </Heading>
                        
                        <ArbitratePane
                            data={data} />
                    </YourBet>
                </Column>

                
            </Row>

            <Row></Row>
        </>
    );
}

const OutcomePanel = (props: any) => {
    const { data: { spamPredictionMarket: market, question } } = props
    const { account, library, chainId } = useWeb3React();

    const [state, setState] = useState<Record<string, any>>({
        canRedeem: true,
        needsFinalisation: props.data.market.state == 'resolved' && !market.finalized,
        error: null,
        loading: false
    })


    const finalize = useCallback(async function finalize() {
        setState({
            ...state,
            loading: true,
            error: ''
        })

        const deployments = await resolveContracts(`${chainId}`)

        const signer = getSigner(library, account!);
        const realitioOracle = new ethers.Contract(
            deployments['RealitioOracle'].address,
            require('@curatem/contracts/abis/RealitioOracle.json'),
            signer,
        )

        try {
            // TODO: sanity check market.oracle == realitioOracle
            //       for future implementations.
            const res = await realitioOracle.resolve(question.id, market.id)
            await res.wait(1)
        } catch(ex) {
            if(ex.code == 4001) {
                setState({
                    ...state,
                    loading: false,
                    error: ''
                })
                return
            }
            setState({
                ...state,
                loading: false,
                error: ex.toString()
            })
        }

        setState({
            ...state,
            loading: false,
            error: null,
            needsFinalisation: false
        })
        return

    }, [library, account, chainId, props.data])


    // const load = useCallback(async function load() {
    //     const deployments = await resolveContracts(`${chainId}`)
    //     const signer = getSigner(library, account!);

    //     const marketContract = new ethers.Contract(
    //         market.id,
    //         require('@curatem/contracts/abis/SpamPredictionMarket.json'),
    //         library,
    //     );

    //     const curatemHelpers = new ethers.Contract(
    //         deployments['CuratemHelpersV1'].address,
    //         require('@curatem/contracts/abis/CuratemHelpersV1.json'),
    //         library,
    //     );
        
    //     const canRedeem = await curatemHelpers.canRedeem(market.id, account)
    //     setState({
    //         ...state,
    //         canRedeem,
    //     })
    // }, [library, account, chainId, props.data])

    const redeem = useCallback(async function redeem() {
        setState({
            ...state,
            loading: true,
            error: ''
        })

        const signer = getSigner(library, account!);

        const marketContract = new ethers.Contract(
            market.id,
            require('@curatem/contracts/abis/SpamPredictionMarket.json'),
            signer,
        );
        
        const spamToken = new ethers.Contract(
            market.spamToken,
            require('@curatem/contracts/abis/ERC20.json'),
            signer,
        );

        const notSpamToken = new ethers.Contract(
            market.notSpamToken,
            require('@curatem/contracts/abis/ERC20.json'),
            signer,
        );

        

        try {
            const payouts: BigNumber[] = await marketContract.callStatic.getPayouts()
            let tokens = [notSpamToken, spamToken]
            let i = 0

            for(let payout of payouts) {
                if(payout.gt(BigNumber.from(0))) {
                    let [balance, allowance, error] = await checkBalanceAndAllow(
                        tokens[i], 
                        BigNumber.from('1'), 
                        account!, 
                        marketContract.address
                    )
                    if(error) throw error

                    const res = await marketContract.redeemOutcome(i, balance)
                    await res.wait(1)
                }
            }

        } catch(ex) {
            if(ex.code == 4001) {
                setState({
                    ...state,
                    loading: false,
                    error: ''
                })
            } else {
                setState({
                    ...state,
                    loading: false,
                    error: ex.toString()
                })
                console.error(ex)
            }
            return
        }

        setState({
            ...state,
            loading: false,
            error: null,
            needsFinalisation: false,
            canRedeem: false
        })
        return

    }, [library, account, chainId, props.data, market])


    // useEffect(() => {
    //     if(props.data.market.state == 'resolved' && !state.needsFinalisation) { 
    //         load()
    //     }
    // }, [library, account, chainId, state.needsFinalisation])

    let action
    
    if(props.data.market.state == 'resolving') {

    } else if(state.needsFinalisation) {
        action = <Button disabled={state.loading} onClick={finalize}>
            Finalise
        </Button>   
    } else {
        action = state.canRedeem == null ?
            'Loading balances...' :
          <Button 
              disabled={!state.canRedeem || state.loading!}
              onClick={redeem}>
              Redeem
          </Button>
    }

    function getResolvingAnswerText() {
        if(question.currentAnswer != null) {
            return <>The current answer is <strong>{getOutcomeFromIndex(question, question.currentAnswer)}</strong>.</>
        }
        return <>Awaiting an answer from reality.eth.</>
    }

    return <YourBet>
        <Heading as="h3" size="md">
            Outcome
        </Heading>

        <p>
            {
                props.data.market.state == 'resolving' 
                ? getResolvingAnswerText()
                : <>The final answer was <strong>{getOutcomeFromIndex(question, question.currentAnswer)}</strong>.</>
            }
        </p>
        
        {action}

        {state.error && state.error.toString()}
    </YourBet>
}

async function checkBalanceAndAllow(
    token: ethers.Contract,
    amount: BigNumber,
    holder: string,
    spender: string,
) {
    let balance = ethers.constants.Zero;
    let allowance = ethers.constants.Zero;
    let error = null;

    try {

        balance = await token.balanceOf(holder);
        if (balance.lt(amount)) {
            error = new Error(`Token balance is too low. Balance: ${balance.toString()}`);
            return [balance, allowance, error];
        }

        allowance = await token.allowance(holder, spender);
        if (allowance.lt(amount)) {
            const res = await token.approve(spender, ethers.constants.MaxUint256, { from: holder });
            await res.wait(1)
        }
    } catch(ex) {
        return [balance, allowance, ex]
    }

    return [balance, allowance, null];
}


const outcomes = ['Not Spam', 'Spam']
const SELECT_OPTION_NONE = ''
const SpamSelector = (props: any) => {
    const { account, library } = useWeb3React();
    const { deployments } = useContractDeployments();
    const balances = useBalances()

    const { tokens } = props

    const [state, setState] = useState({
        loading: false,
        error: ''
    })

    const [balancesLoaded, setBalancesLoaded] = useState(false)
    const { loadBalances } = useBalanceActions()
    useEffect(() => {
        Promise.all([
            loadBalances(tokens.outcomes.spamToken, account!),
            loadBalances(tokens.outcomes.notSpamToken, account!)
        ]).then(() => {
            setBalancesLoaded(true)
        })
    }, [account])

    async function onSelect(ev: any) {
        const { value } = ev.target;
        setState({
            loading: false,
            error: '',
        })
        if(value == SELECT_OPTION_NONE) return
        purchase(value);
    }

    async function purchase(outcome: number) {
        setState({
            loading: true,
            error: ''
        })

        const signer = getSigner(library, account!);
        const buyAmount = toWei('0.1');

        const market = new ethers.Contract(
            props.market,
            require('@curatem/contracts/abis/SpamPredictionMarket.json'),
            signer,
        );
        const spamToken = new ethers.Contract(
            props.spamToken,
            require('@curatem/contracts/abis/ERC20.json'),
            library,
        );
        const notSpamToken = new ethers.Contract(
            props.notSpamToken,
            require('@curatem/contracts/abis/ERC20.json'),
            library,
        );
        const collateralToken = new ethers.Contract(
            props.community.token.id,
            require('@curatem/contracts/abis/ERC20.json'),
            signer,
        );

        const scripts = new ethers.Contract(
            deployments['Scripts'].address,
            require('@curatem/contracts/abis/Scripts.json'),
            getSigner(library, account!),
        );

        const [balance, allowance, error] = await checkBalanceAndAllow(
            collateralToken,
            buyAmount,
            account!,
            scripts.address,
        );
        if (error) {
            setState({
                loading: false,
                error: error.toString()
            })
            return;
        }
        
        try {
            let res = await scripts.buyOutcomeElseProvideLiquidity(
                market.address,
                outcome,
                buyAmount,
                '9',
                '10',
                deployments['UniswapV2Router02'].address,
                '10000',
                '10000',
            )
            await res.wait(1)
        } catch(ex) {
            // Tx refused.
            // TODO: hacky way to handle transactions.
            if(ex.code == 4001) {
                setState({
                    loading: false,
                    error: ''
                })
                return 
            }

            console.error(ex)

            setState({
                loading: false,
                error: ex.toString()
            })
            return
        }

        setState({
            loading: false,
            error: ''
        })
    }


    const lastKnownBet = useMemo(function computeLastKnownBet() {
        let defaultSelection = undefined
        if(!balancesLoaded) return defaultSelection

        const outcomeBalances = [
            balances.tokens[tokens.outcomes.notSpamToken][account!],
            balances.tokens[tokens.outcomes.spamToken][account!]
        ]
        
        let largestIdx = 0
        for(let i = 0; i < outcomeBalances.length; i++) {
            if(outcomeBalances[i].gt(outcomeBalances[largestIdx])) 
                largestIdx = i
        }
        
        // If the largest balance is 0, then default selection remains as undefined.
        if(!outcomeBalances[largestIdx].eq(ethers.constants.Zero)) {
            defaultSelection = largestIdx
        }
        return defaultSelection
    }, [props.tokens, balances, balancesLoaded])

    return (
        <>
            <Select 
                placeholder="None" 
                disabled={state.loading} 
                onChange={onSelect}
                defaultValue={lastKnownBet}>
                    {outcomes.map((outcome, idx) => {
                        return <option key={idx} value={idx}>{outcome}</option>
                    })}
            </Select>

            { state.error }
        </>
    );
};

const ArbitratePane = (props: any) => {
    const { spamPredictionMarket: market, question } = props.data

    const { account, library } = useWeb3React();
    const { deployments, loaded: deploymentsLoaded } = useContractDeployments();

    const { data, isLoading: loading, isIdle, error } = useReactQuery<any, Error>(
        ['load-arbitrator-info', market.id],
        () => load(account, library, market.id),
        { 
            retry: 1,
            // TODO: deployments don't need to be a part of component state.
            // they can easily be loaded using a promise inside of the react-query's.
            enabled: deploymentsLoaded
        },
    );

    async function load(account: any, library: any, marketId: string) {
        const moderatorArbitrator = new ethers.Contract(
            market.community.moderatorArbitrator,
            require('@curatem/contracts/abis/ModeratorArbitratorV1.json'),
            library,
        )
        const moderator = await moderatorArbitrator.moderator()
        return {
            moderator
        }
    }

    if(loading || isIdle) 
        return <>Loading...</>
    
    if(error)
        return <>
            {error.toString()}
        </>
    
    if(data.moderator !== account) {
        return <>
            <LockIcon/> Moderator tools only available to {data.moderator}.
        </>
    }

    if(!question.isPendingArbitration) {
        return <>Question is not pending arbitration.</>
    }

    return <>
        <ModeratorSubmitFinalAnswer data={props.data}/>
    </>
}


const ModeratorSubmitFinalAnswer = (props: any) => {
    const { data } = props
    const { spamPredictionMarket: market } = data
    const [answer, setAnswer] = useState(null)
    const [state, setState] = useState({
        loading: false,
        error: ''
    })

    const { account, library, chainId } = useWeb3React();
    
    async function onSelect(ev: any) {
        const { value } = ev.target;
        setState({
            loading: false,
            error: '',
        })
        if(value == SELECT_OPTION_NONE) return
        setAnswer(value)
    }

    const submitAnswer = useCallback(async function submitAnswer(outcome: number) {
        setState({
            loading: true,
            error: ''
        })
        // const deployments = await resolveContracts(`${chainId}`);
        const signer = getSigner(library, account!);

        const moderatorArbitrator = new ethers.Contract(
            market.community.moderatorArbitrator,
            require('@curatem/contracts/abis/ModeratorArbitratorV1.json'),
            signer,
        )


        try {
            const res = await moderatorArbitrator.submitAnswer(
                market.questionId, 
                ethers.utils.zeroPad(ethers.BigNumber.from(outcome).toHexString(), 32)
            )

            await res.wait(1)
        } catch(ex) {
            // Tx refused.
            // TODO: hacky way to handle transactions.
            if(ex.code == 4001) {
                setState({
                    loading: false,
                    error: ''
                })
                return 
            }

            setState({
                loading: false,
                error: ex.toString()
            })
            return
        }

        setState({
            loading: false,
            error: ''
        })
    }, [account, chainId, library, data, market])

    return <>
        <Select 
            placeholder="None" 
            onChange={onSelect}>
                {outcomes.map((outcome, idx) => {
                    return <option key={idx} value={idx}>{outcome}</option>
                })}
        </Select>
        <Button 
            disabled={state.loading || !answer} 
            onClick={() => submitAnswer(answer!)}>
            Submit final answer
        </Button>

        {state.error && state.error.toString()}
    </>
}