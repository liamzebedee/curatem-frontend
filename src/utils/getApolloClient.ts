// import { InMemoryCache } from 'apollo-cache-inmemory'
// import { ApolloClient } from 'apollo-client'
import { ApolloClient, HttpLink, from, InMemoryCache } from '@apollo/client';

// import { from, split } from 'apollo-link'
// import { HttpLink } from 'apollo-link-http'
import apolloLogger from 'apollo-link-logger';
import { WebSocketLink } from 'apollo-link-ws';
import { getGraphUris, getCuratemGraphUris } from '../constants';

export const getApolloClient = (networkId: number) => {
    const { httpUri, wsUri } = getGraphUris(networkId);
    const links = [apolloLogger];

    if (httpUri) {
        const httpLink = new HttpLink({
            uri: httpUri,
        });
        links.push(httpLink);
    }

    // TODO: disable in production.
    // if(wsUri) {
    //     const wsLink = new WebSocketLink({
    //         uri: wsUri,
    //         options: {
    //           reconnect: true,
    //         },
    //       })
    //     links.push(wsLink)
    // }

    return new ApolloClient({
        link: from(links),
        cache: new InMemoryCache(),
    });
};

export function getCuratemApolloClient(networkId: number) {
    const { httpUri, wsUri } = getCuratemGraphUris(networkId);
    const links = [apolloLogger];

    if (httpUri) {
        const httpLink = new HttpLink({
            uri: httpUri,
        });
        links.push(httpLink);
    }

    // TODO: disable in production.
    // if(wsUri) {
    //     const wsLink = new WebSocketLink({
    //         uri: wsUri,
    //         options: {
    //           reconnect: true,
    //         },
    //       })
    //     links.push(wsLink)
    // }

    return new ApolloClient({
        link: from(links),
        cache: new InMemoryCache(),
    });
}
