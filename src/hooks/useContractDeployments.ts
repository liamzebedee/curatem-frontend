import { resolveContracts } from '../utils/contracts';
import { useActiveWeb3React } from '.';
import { useEffect, useState } from 'react';
import { Web3Provider } from '@ethersproject/providers';
import { ContractDeployments, contracts } from 'utils/resolver';

export function useContractDeployments() {
    const { active, library, chainId } = useActiveWeb3React();
    const [state, setState] = useState<Record<string, any>>({
        deployments: {},
        loaded: false,
    });

    async function load() {
        const deployments = await resolveContracts(`${chainId}`);
        console.log(`Loaded deployments`, deployments);
        setState({
            deployments,
            loaded: true,
        });
    }

    useEffect(() => {
        if (!library) return;
        if (state.loaded) return;
        load();
    }, [chainId, library, state]);

    return state;
}
