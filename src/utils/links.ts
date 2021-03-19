
export const generateRealityEthLink = (questionId: string) => `https://reality.eth.link/app/#!/question/${questionId}`

export const generateUniswapTradeLink = (inputToken: string, outputToken: string) =>
    `https://app.uniswap.org/#/swap?inputCurrency=${inputToken}&outputCurrency=${outputToken}`

type Network = 'rinkeby' | 'kovan' | 'mainnet'
let networks: { [k: string]: Network } = {
    4: 'rinkeby',
    3: 'kovan',
    1: 'mainnet',
}

export function generateEtherscanLink(type = 'address', val: string, chainId: string | number) {
    const network = networks[chainId] || 'mainnet'
    const chainSubdomain = network == 'mainnet' ? '' : `${network}.`
    return `https://${chainSubdomain}etherscan.io/address/${val}`
}

export function generateEtherscanTokenLink(token: string, holder: string, chainId: string | number) {
    const network = networks[chainId] || 'mainnet'
    const chainSubdomain = network == 'mainnet' ? '' : `${network}.`
    return `https://${chainSubdomain}etherscan.io/address/${token}?a=${holder}`
}