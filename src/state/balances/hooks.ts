import { useWeb3React } from "@web3-react/core";
import { BigNumber, ethers } from "ethers";
import { useDispatch, useSelector } from "react-redux";
import { AppState } from "state";
import { updateBalances } from "./actions";

let contracts = {}
let watching: Record<string,boolean> = {}

export function useBalanceActions() {
    const { account, library, chainId } = useWeb3React();
    const dispatch = useDispatch();

    async function loadBalances(tokenAddress: string, user: string) {
        dispatch(updateBalances({
            token: tokenAddress,
            balances: {
                [user]: BigNumber.from(0)
            }
        }))
        
        const token = new ethers.Contract(
            tokenAddress,
            require('@curatem/contracts/abis/ERC20.json'),
            library,
        );

        async function pollBalance () {
            const balance = await token.balanceOf(user)
            dispatch(updateBalances({
                token: tokenAddress,
                balances: {
                    [user]: balance
                }
            }))
        }
        
        if(!watching[`${tokenAddress},${user}`]) {
            watching[`${tokenAddress},${user}`] = true
            const fromFilter = token.filters.Transfer(user, null)
            const toFilter = token.filters.Transfer(null, user)
            token.on(fromFilter, pollBalance)
            token.on(toFilter, pollBalance)
        }
        pollBalance()
    }
    
    return {
        loadBalances
    }
}

export function useBalances(): AppState['balances'] {
    return useSelector<AppState, AppState['balances']>((state) => state.balances)
}

// export function useTokenBalance(token: string) {
//     const balances = useSelector<AppState, AppState['balances']>((state) => state.balances)
//     return balances.tokens[token] || {}
// }