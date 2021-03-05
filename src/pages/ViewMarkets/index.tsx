import { useGraphMarketMakerData } from 'hooks/useGraphMarketData';
import React, { useEffect, useMemo, useState } from 'react';
import { RouteComponentProps } from '@reach/router';
import { getCuratemApolloClient } from 'utils/getApolloClient';
import gql from 'graphql-tag';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { Button, Heading } from '@chakra-ui/react';
import { NETWORK_CHAIN_ID } from 'connectors';
import DynamicTable from '@atlaskit/dynamic-table';
import { DateTime, Duration } from 'luxon';
import styled from 'styled-components';
import { toRelativeTs } from 'utils';

const ViewMarketsWrapper = styled.div`
    display: block;
    width: 1200px;
`;

interface ViewMarketsProps extends RouteComponentProps {
    community?: string;
}

const query = gql`
    query GetCommunity($id: ID!) {
        community(id: $id) {
            id
            moderatorArbitrator
            token
            spamMarkets {
                id
                questionId
                itemUrl
                createdAt
            }
        }
    }
`;

const client = getCuratemApolloClient(NETWORK_CHAIN_ID);



function buildRows(data: any) {
    const markets = data.community.spamMarkets;

    return markets.map((market: any, i: number) => {
        return {
            key: `row-${i}-${market.id}`,
            cells: [
                {
                    content: (
                        <Link to={`/communities/${data.community.id}/markets/${market.id}`}>
                            {market.itemUrl}
                        </Link>
                    ),
                },
                {
                    content: '',
                },
                {
                    content: toRelativeTs(market.createdAt),
                },
                {
                    content: '',
                },
            ].map((cell, j) => {
                return {
                    ...cell,
                    key: `${i}-column-${j}`,
                };
            }),
        };
    });
}

const ActionRow = styled.div`
    display: flex;
`;

export default function ViewMarkets(props: any) {
    const { community } = props.match.params as ViewMarketsProps;

    const { data, error, loading, refetch } = useQuery(query, {
        variables: {
            id: community?.toLowerCase(),
        },
        client,
    });

    const rows = useMemo(() => (data ? buildRows(data) : []), [data]);

    if (loading) return null;

    if (error) return <>{error.toString()}</>;

    if (data.community === null) {
        return <>No community found.</>;
    }

    const head = {
        cells: [
            {
                key: 'post',
                content: 'Post',
                isSortable: false,
            },
            {
                key: 'Author',
                content: 'Author',
                isSortable: false,
            },
            {
                key: 'Created',
                content: 'Created',
                isSortable: false,
            },
            {
                key: 'Volume',
                content: 'Volume',
                isSortable: false,
            },
        ],
    };

    return (
        <ViewMarketsWrapper>
            <div>
                <Heading as="h1" size="lg">
                    Markets
                </Heading>

                <ActionRow>
                    <span>{data.community.spamMarkets.length} markets</span>
                    {/* <Button>Search by URL</Button> */}
                </ActionRow>

                <DynamicTable
                    head={head}
                    rows={rows}
                    rowsPerPage={10}
                    defaultPage={1}
                    loadingSpinnerSize="large"
                    isLoading={false}
                    isFixedSize
                    // defaultSortKey="term"
                    defaultSortOrder="ASC"
                    onSort={() => console.log('onSort')}
                    onSetPage={() => console.log('onSetPage')}
                />
            </div>
        </ViewMarketsWrapper>
    );
}
