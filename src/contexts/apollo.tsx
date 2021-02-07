import React from 'react'
import { networkId } from '../constants'
import { getApolloClient } from 'utils/getApolloClient'
import { ApolloProvider } from '@apollo/client';

export const ApolloProviderWrapper: React.FC = ({ children }) => {
    const client = React.useMemo(() => getApolloClient(networkId), [networkId])
    return <ApolloProvider client={client}>
        {children} 
    </ApolloProvider>
}