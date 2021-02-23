export const NetworkContextName = 'NETWORK'

const {
    REACT_APP_GNOSIS_GRAPHQL_ENDPOINT_HTTP,
    REACT_APP_GNOSIS_GRAPHQL_ENDPOINT_WS,

    REACT_APP_CURATEM_GRAPHQL_ENDPOINT_HTTP,
    REACT_APP_CURATEM_GRAPHQL_ENDPOINT_WS
} = process.env

interface GraphQLConfig {
    httpUri: string | undefined
    wsUri: string | undefined
}

export function getGraphUris(networkId: number): GraphQLConfig {
    if(!process.env.REACT_APP_GNOSIS_GRAPHQL_ENDPOINT_HTTP) {
        throw new Error("REACT_APP_GNOSIS_GRAPHQL_ENDPOINT_HTTP must be defined")
    }
    if(!process.env.REACT_APP_GNOSIS_GRAPHQL_ENDPOINT_WS) {
        throw new Error("REACT_APP_GNOSIS_GRAPHQL_ENDPOINT_WS must be defined")
    }

    return {
        httpUri: REACT_APP_GNOSIS_GRAPHQL_ENDPOINT_HTTP,
        wsUri: REACT_APP_GNOSIS_GRAPHQL_ENDPOINT_WS
    }
}

export function getCuratemGraphUris(networkId: number): GraphQLConfig {
    if(!process.env.REACT_APP_CURATEM_GRAPHQL_ENDPOINT_HTTP) {
        throw new Error("REACT_APP_CURATEM_GRAPHQL_ENDPOINT_HTTP must be defined")
    }
    if(!process.env.REACT_APP_CURATEM_GRAPHQL_ENDPOINT_WS) {
        throw new Error("REACT_APP_CURATEM_GRAPHQL_ENDPOINT_WS must be defined")
    }

    return {
        httpUri: REACT_APP_CURATEM_GRAPHQL_ENDPOINT_HTTP,
        wsUri: REACT_APP_CURATEM_GRAPHQL_ENDPOINT_WS
    }
}

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'