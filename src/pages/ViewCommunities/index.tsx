import { useQuery } from '@apollo/client';
import DynamicTable from '@atlaskit/dynamic-table';
import { Button, Heading, LinkOverlay } from '@chakra-ui/react';
import { NETWORK_CHAIN_ID } from 'connectors';
import gql from 'graphql-tag';
import React, { useMemo } from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import { getCuratemApolloClient } from 'utils/getApolloClient';
import { useContractDeployments } from '../../hooks/useContractDeployments';
import styled from 'styled-components';
import { Community } from 'data/types';

const ViewCommunitiesWrapper = styled.div`
    display: block;
    width: 1000px;
`;

const head = {
    cells: [
        {
            content: 'Name',
        },
        {
            content: 'Token',
        },
        {
            content: '',
        },
    ],
};

function buildRows(data: any) {
    const { communities } = data;
    return communities.map((community: Community) => {
        return {
            cells: [
                {
                    // TODO:
                    content: 'Reddit',
                },
                {
                    // TODO:
                    content: community.token.symbol,
                },
                {
                    // TODO:
                    content: (
                        <>
                            <Link to={`/communities/${community.id}/markets`}>
                                <Button size="md">{community.spamMarkets.length} Markets</Button>
                            </Link>
                        </>
                    ),
                },
            ],
        };
    });
}

const query = gql`
    query GetCommunities {
        communities {
            id
            moderatorArbitrator
            token {
                id
                name
                symbol
                decimals
            }
            spamMarkets {
                id
            }
        }
    }
`;

const client = getCuratemApolloClient(NETWORK_CHAIN_ID);

export default function ViewCommunities(props: RouteComponentProps & any) {
    const { data, error, loading, refetch } = useQuery<{ communities: Community[] }>(query, {
        client,
    })

    const rows = useMemo(() => (data ? buildRows(data) : []), [data]);

    if (loading) return null;

    if (error) return <>{error.toString()}</>;

    if (data!.communities === null) {
        throw new Error('Unexpected error - subgraph could not load communities.');
    }

    return (
        <ViewCommunitiesWrapper>
            <Heading as="h1" size="lg">
                Communities
            </Heading>
            {data!.communities.length} communities
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
        </ViewCommunitiesWrapper>
    );
}
