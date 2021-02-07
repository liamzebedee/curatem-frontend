
export interface Community {
    type: 'subreddit'
    name: string
    title: string
    curationType: 'spam-filter'
    token: string
    moderatorMultisig: string
}

export interface Item {
    postedIn: Community
    type: 'post' | 'comment'
    link: string
}

export interface Market {
    address: string
    quesitonId: string
    state: MarketState
}

enum MarketState {
    OPEN,
    PENDING_RESOLUTION,
    PENDING_ARBITRATION,
    CLOSED
}


