
export const generateRealityEthLink = (questionId: string) => `https://reality.eth.link/app/#!/question/${questionId}`

export const generateUniswapTradeLink = (inputToken: string, outputToken: string) =>
    `https://app.uniswap.org/#/swap?inputCurrency=${inputToken}&outputCurrency=${outputToken}`

export function generateEtherscanLink(type = 'address', val: string) {
    return `https://etherscan.io/address/${val}`
}