export interface MarketData {
    state?: 'open' | 'resolving' | 'resolved';
}

export interface Community {
    id: string
    moderatorArbitrator: string
    token: Token
    spamMarkets: SpamPredictionMarket[]
}
export interface Token {
    id: string
    name: string
    symbol: string
    decimals: number
}
export interface SpamPredictionMarket {
    id: string;
    questionId: string;
    itemUrl: string;
    spamToken: string;
    notSpamToken: string;
    community: Community;
    finalized: boolean
    sharesMinted: number
    sharesRedeemed: number
}

export interface SpamPredictionMarketData {
    spamPredictionMarket: SpamPredictionMarketData
}