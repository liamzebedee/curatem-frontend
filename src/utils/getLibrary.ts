import { Web3Provider, JsonRpcSigner } from '@ethersproject/providers'

export default function getLibrary(provider: any): Web3Provider {
  const library = new Web3Provider(provider, 'any')
  library.pollingInterval = 15000
  return library
}

// account is not optional
export function getSigner(library: Web3Provider, account?: string): JsonRpcSigner {
  return library.getSigner(account).connectUnchecked()
}