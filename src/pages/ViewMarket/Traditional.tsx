import { Button, Heading, Progress, Select } from '@chakra-ui/react';
import { RouteComponentProps } from '@reach/router';
import { CurrencyAmount, TokenAmount } from '@uniswap/sdk';
import { useWeb3React } from '@web3-react/core';
import { loadMarket } from 'data/market';
import { BigNumber, ethers } from 'ethers';
import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useQuery as useReactQuery } from 'react-query';
import { useRedditPostAPI, useRedditState } from 'state/reddit/hooks';
import styled from 'styled-components';
import { fromWei, shortenAddress, toPercent, toWei } from 'utils';
import { getSigner } from 'utils/getLibrary';
import { generateRealityEthLink } from 'utils/links';
import { useContractDeployments } from '../../hooks/useContractDeployments';

interface ViewMarketProps extends RouteComponentProps {
    market?: string;
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

    > * {
        margin-bottom: 0.5rem;
    }
`;

const MarketOverview = styled.div`
    display: block;
    border: 1px solid #ddd;
    padding: 1em;
    width: 1000px;
    justify-self: left;

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

const MarketTableRow = styled.div`
    display: flex;
    flex-direction: row;
    flex: 1;
`


const TokenSwapper = styled.div`
    display: block;
    flex: 1 0;
    align-self: start;

    border: 1px solid #ddd;
    padding: 1em;
    width: 400px;
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

export default function ViewMarket(props: any) {
    const { market } = props.match.params;

    const { account, library, chainId } = useWeb3React();
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

                        <div>
                            <InlineList>
                                <li>
                                    <MarketStateIcon state={data.market.state} />
                                </li>
                                
                                <li>
                                    { data.market.state !== 'resolved' 
                                    ? <p><strong>Closes in</strong>: {data.question.openingTimestamp}</p> 
                                    : null }
                                </li>
                                
                                <li>
                                    <strong>Total volume</strong>: {CurrencyAmount.ether(data.totalVolume).toFixed(6)}
                                </li>

                                <li>
                                    <strong>Oracle:</strong> <a href={generateRealityEthLink(data.question.id)}>reality.eth</a>
                                </li>
                                
                                <li>
                                    <strong>Adjudicator</strong>: moderator multisig ({ shortenAddress(data.spamPredictionMarket.community.moderator) })
                                </li>
                            </InlineList>
                        </div>

                        <br/>

                        <div style={{ margin: '0 -1rem' }}>
                            <table>
                                <thead>
                                    <th>Outcome/probability</th>
                                    <th>Liquidity</th>
                                    {/* <th>Volume</th> */}
                                    <th>My shares</th>
                                    <th>My LP shares</th>
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
                                                myLPShares: CurrencyAmount.ether(data.amm.lpshares.spam)
                                            },
                                            {
                                                outcomeName: "Not Spam",
                                                outcomeTokenSymbol: "NOT-SPAM",
                                                odds: toPercent(data.amm.prices.notspam),
                                                reserves: data.amm.reserves.notspam,
                                                myShares: CurrencyAmount.ether(data.user.notSpamToken_balance),
                                                myLPShares: CurrencyAmount.ether(data.amm.lpshares.notspam)
                                            }
                                        ].map(({ outcomeName, outcomeTokenSymbol, odds, reserves, myShares, myLPShares }) => <tr>
                                            <td width={400}>
                                                <MarketTableRow>
                                                    <header style={{ flex: 1 }} className="outcome">{ outcomeName }</header>
                                                    <span className="odds">{ odds }%</span>
                                                </MarketTableRow>
        
                                                <MarketTableRow>
                                                    <div style={{ flex: 1 }}>
                                                        <Progress colorScheme="green" size="sm" value={parseFloat(odds)} />
                                                    </div>
                                                </MarketTableRow>
                                            </td>
                                            
                                            <td width={100}>
                                                {reserves}
                                            </td>
        
                                            <td width={125}>
                                                <p>{myShares.toFixed(6)}</p>
                                            </td>

                                            <td width={125}>
                                                <p>{myLPShares.toFixed(6)}</p>
                                            </td>
                                        </tr>)
                                    }
                                    
                                </tbody>
                            </table>
                        </div>

                    </MarketOverview>
                </Column>

                <Column>
                    <YourBet>
                        <Heading as="h3" size="md">
                            Your bet
                        </Heading>
                        
                        <SpamSelector 
                            balances={[data.user.notSpamToken_balance, data.user.spamToken_balance]}
                            {...data.spamPredictionMarket} 
                            market={data.spamPredictionMarket.id} />
                    </YourBet>

                    <TokenSwapper>
                        <Heading as="h3" size="md">
                            Trade
                        </Heading>

                        {/* <p>{fromWei(data.user.spamToken_balance)} SPAM</p>
                        <p>{fromWei(data.user.notSpamToken_balance)} NOT-SPAM</p> */}
                    </TokenSwapper>
                </Column>
            </Row>

            <Row></Row>
        </>
    );
}

async function checkBalanceAndAllow(
    token: ethers.Contract,
    amount: BigNumber,
    holder: string,
    spender: string,
) {
    let balance = ethers.constants.Zero;
    let allowance = ethers.constants.Zero;
    let error;

    balance = await token.balanceOf(holder);
    if (balance.lt(amount)) {
        error = new Error(`Token balance is too low. Balance: ${balance.toString()}, minimum buy: 1,000,000`);
        return [balance, allowance, error];
    }

    allowance = await token.allowance(holder, spender);
    if (allowance.lt(amount)) {
        await token.approve(spender, ethers.constants.MaxUint256, { from: holder });
    }

    return [balance, allowance, null];
}

const outcomes = ['Not Spam', 'Spam']
const SpamSelector = (props: any) => {
    const { account, library } = useWeb3React();
    const { deployments } = useContractDeployments();

    const [state, setState] = useState({
        loading: false,
        error: ''
    })

    async function onSelect(ev: any) {
        const { value } = ev.target;
        purchase(value);
    }

    async function purchase(outcome: number) {
        setState({
            loading: true,
            error: ''
        })

        const outcomes = ['notspam', 'spam'];
        const signer = getSigner(library, account!);
        const buyAmount = toWei('1');

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
            props.community.token,
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

            setState({
                loading: false,
                error: ex.toString()
            })
        }

        setState({
            loading: false,
            error: ''
        })
    }

    const lastKnownBet = useMemo(function computeLastKnownBet() {
        const balances = props.balances

        let defaultSelection = undefined
        let largestIdx = 0
        for(let i = 0; i < balances.length; i++) {
            if(balances[i].gt(balances[largestIdx])) 
                largestIdx = i
        }
        
        // If the largest balance is 0, then default selection remains as undefined.
        if(!balances[largestIdx].eq(ethers.constants.Zero)) {
            defaultSelection = largestIdx
        }
        return defaultSelection
    }, props.balances)

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
