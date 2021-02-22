import React from 'react';
import { getApolloClient } from 'utils/getApolloClient';
import { ApolloProvider } from '@apollo/client';
import { NETWORK_CHAIN_ID } from 'connectors';

export const ApolloProviderWrapper = ({ children }: { children: React.ReactChildren }) => {
    const client = React.useMemo(() => getApolloClient(NETWORK_CHAIN_ID), [NETWORK_CHAIN_ID]);
    return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
