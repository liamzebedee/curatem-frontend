import { AbstractConnector } from '@web3-react/abstract-connector'
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core'
import { darken, lighten } from 'polished'
import React, { useMemo } from 'react'
import { Activity } from 'react-feather'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'
import CoinbaseWalletIcon from '../../assets/images/coinbaseWalletIcon.svg'
import FortmaticIcon from '../../assets/images/fortmaticIcon.png'
import PortisIcon from '../../assets/images/portisIcon.png'
import WalletConnectIcon from '../../assets/images/walletConnectIcon.svg'
import { fortmatic, injected, portis, walletconnect, walletlink } from '../../connectors'
import { NetworkContextName } from '../../constants'
// import { isTransactionRecent, useAllTransactions } from '../../state/transactions/hooks'
// import { TransactionDetails } from '../../state/transactions/reducer'
import { shortenAddress } from '../../utils'
import Loader from '../Loader'

import Web3Modal from 'web3modal'

// import { RowBetween } from '../Row'
// import WalletModal from '../WalletModal'

const Web3StatusConnected = styled.div<{ pending?: boolean }>`
  ${({ pending }) => null}
`
const Web3StatusConnect = styled.div<{ faded?: boolean }>`
  ${({ faded }) => null}
`
const Web3StatusError = styled.div``


function useWalletModalToggle() {}


function Web3StatusInner() {
  const { t } = useTranslation()
  const { account, connector, error } = useWeb3React()

  // const allTransactions = useAllTransactions()

  // const sortedRecentTransactions = useMemo(() => {
  //   const txs = Object.values(allTransactions)
  //   return txs.filter(isTransactionRecent).sort(newTransactionsFirst)
  // }, [allTransactions])

  // const pending = sortedRecentTransactions.filter(tx => !tx.receipt).map(tx => tx.hash)

  // const hasPendingTransactions = !!pending.length
  // const toggleWalletModal = useWalletModalToggle()
  async function toggleWalletModal() {
    const providerOptions = {
      // Example with injected providers
      injected: {
        display: {
          // logo: "data:image/gif;base64,INSERT_BASE64_STRING",
          name: "Injected",
          description: "Connect with the provider in your Browser"
        },
        package: null
      },
    }

    const web3Modal = new Web3Modal({
      network: "mainnet", // optional
      cacheProvider: true, // optional
      providerOptions // required
    });
    
    const provider = await web3Modal.connect();
    
    // const web3 = new Web3(provider);
  }

  if (account) {
    return (
      <Web3StatusConnected id="web3-status-connected" onClick={toggleWalletModal}>
        { shortenAddress(account) }
        {/* {hasPendingTransactions ? (
          <RowBetween>
            <Text>{pending?.length} Pending</Text> <Loader stroke="white" />
          </RowBetween>
        ) : (
          <>
            {hasSocks ? SOCK : null}
            <Text>{ENSName || shortenAddress(account)}</Text>
          </>
        )}
        {!hasPendingTransactions && connector && <StatusIcon connector={connector} />} */}
      </Web3StatusConnected>
    )
  } else if (error) {
    return (
      <Web3StatusError onClick={toggleWalletModal}>
        {error instanceof UnsupportedChainIdError ? 'Wrong Network' : 'Error'}
      </Web3StatusError>
    )
  } else {
    return (
      <Web3StatusConnect id="connect-wallet" onClick={toggleWalletModal} faded={!account}>
        Connect to a wallet
      </Web3StatusConnect>
    )
  }
}

export default function Web3Status() {
  const { active, account } = useWeb3React()
  const contextNetwork = useWeb3React(NetworkContextName)

  // const allTransactions = useAllTransactions()

  // const sortedRecentTransactions = useMemo(() => {
  //   const txs = Object.values(allTransactions)
  //   return txs.filter(isTransactionRecent).sort(newTransactionsFirst)
  // }, [allTransactions])

  // const pending = sortedRecentTransactions.filter(tx => !tx.receipt).map(tx => tx.hash)
  // const confirmed = sortedRecentTransactions.filter(tx => tx.receipt).map(tx => tx.hash)

  if (!contextNetwork.active && !active) {
    return null
  }

  return (
    <>
      <Web3StatusInner />
      {/* <WalletModal ENSName={ENSName ?? undefined} pendingTransactions={pending} confirmedTransactions={confirmed} /> */}
    </>
  )
}
