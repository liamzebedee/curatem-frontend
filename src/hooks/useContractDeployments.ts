import { resolveContracts } from '../utils/contracts'
import { useActiveWeb3React } from '.'
import { useEffect, useState } from 'react'
import { Web3Provider } from '@ethersproject/providers'
import { ContractDeployments } from 'utils/resolver'

export const contracts = [
    'RedditCommunity1',
    'WETH9',
    'Scripts'
]

export function useContractDeployments() {
    const { active, library, chainId } = useActiveWeb3React()
    const [ deployments, setDeployments ] = useState<ContractDeployments>({})
    
    async function load() {
        const deployments = await resolveContracts(`${chainId}`, contracts)
        setDeployments(deployments)
    }

    useEffect(() => {
        if(!library) return
        if(deployments !== {}) return
        load()
    }, [chainId, library])
    
    return { deployments }
}