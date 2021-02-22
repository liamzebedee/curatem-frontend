import { AbstractConnector } from '@web3-react/abstract-connector';
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core';
import { darken, lighten } from 'polished';
import React, { useMemo } from 'react';
import { Activity } from 'react-feather';
import { useTranslation } from 'react-i18next';
import styled, { css } from 'styled-components';
import CoinbaseWalletIcon from '../../assets/images/coinbaseWalletIcon.svg';
import FortmaticIcon from '../../assets/images/fortmaticIcon.png';
import PortisIcon from '../../assets/images/portisIcon.png';
import WalletConnectIcon from '../../assets/images/walletConnectIcon.svg';
import { fortmatic, injected, portis, walletconnect, walletlink } from '../../connectors';
import { NetworkContextName } from '../../constants';
import { shortenAddress } from '../../utils';
import Loader from '../Loader';

import Web3Modal from 'web3modal';
import { Button } from '@chakra-ui/react';

const Web3StatusConnected = styled.div<{ pending?: boolean }>`
    ${({ pending }) => null}
`;
const Web3StatusConnect = styled.div<{ faded?: boolean }>`
    ${({ faded }) => null}
`;
const Web3StatusError = styled.div``;

function Web3StatusInner() {
    const { t } = useTranslation();
    const { account, connector, error, activate, chainId } = useWeb3React();

    async function toggleWalletModal() {
        // const providerOptions = {
        //   // Example with injected providers
        //   injected: {
        //     display: {
        //       // logo: "data:image/gif;base64,INSERT_BASE64_STRING",
        //       name: "Injected",
        //       description: "Connect with the provider in your Browser"
        //     },
        //     package: null
        //   },
        // }

        // const web3Modal = new Web3Modal({
        //   // network: "mainnet", // optional
        //   // cacheProvider: true, // optional
        //   providerOptions // required
        // });

        // const provider = await web3Modal.connect();

        // const web3 = new Web3(provider);

        const connector = injected;
        connector &&
            activate(connector, undefined, true).catch((error) => {
                if (error instanceof UnsupportedChainIdError) {
                    activate(connector); // a little janky...can't use setError because the connector isn't set
                }
            });
    }

    if (account) {
        return (
            <Web3StatusConnected id="web3-status-connected" onClick={toggleWalletModal}>
                {shortenAddress(account)}
            </Web3StatusConnected>
        );
    } else if (error) {
        return (
            <Web3StatusError onClick={toggleWalletModal}>
                {error instanceof UnsupportedChainIdError ? (
                    <>
                        <span>Wrong Network (only Hardhat is supported)</span>
                    </>
                ) : (
                    'Error'
                )}
            </Web3StatusError>
        );
    } else {
        return (
            <Button colorScheme="blue" onClick={toggleWalletModal}>
                Connect to a wallet
            </Button>
        );
    }
}

export default function Web3Status() {
    const { active, account } = useWeb3React();
    const contextNetwork = useWeb3React(NetworkContextName);

    if (!contextNetwork.active && !active) {
        return null;
    }

    return (
        <>
            <Web3StatusInner />
        </>
    );
}
