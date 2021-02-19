import { ethers } from "ethers"
import { join } from "path"
import { ContractDeployment, ContractDeployments, ContractResolver, DeploymentsJsonResolver } from "./resolver"

export async function resolveContracts(networkId: string, contracts: string[]): Promise<ContractDeployments> {
    let resolver: ContractResolver = new DeploymentsJsonResolver(networkId, undefined, require('@curatem/contracts/deployments.json'))
    return contracts
      .reduce((deployments: ContractDeployments, contract: string) => {
        deployments[contract] = resolver.resolve(contract)
        return deployments
      }, {})
  }




//   export async function resolveContracts(provider: ethers.providers.Provider): Promise<ContractAddresses> {
//     let networkId: number
//     let network = await provider.getNetwork()
//     networkId = network.chainId
//     console.log(networkId)
  
//     let resolver: ContractResolver
//     let resolver2: ContractResolver
    
//     if(networkId == 31337) {
//       // This is a development network.
//       // Load the addresses from the build artifacts.
//       resolver = new GanacheArtifactResolver(networkId, join(__dirname, '../../omen-subgraph/build/contracts/'))
//       resolver2 = new GanacheArtifactResolver(networkId, join(__dirname, '../../balancer-core/build/contracts/'))
//     }

//     const omenContracts = [
//       'Realitio',
//       'RealitioProxy',
//       'ConditionalTokens',
//       'FPMMDeterministicFactory',
//       'WETH9'
//     ]
//     const balancerContracts = [
//       'BFactory'
//     ]

//     function resolveWithResolver(contracts: string[], resolver: ContractResolver) {
//       return contracts
//         .reduce((addresses: ContractAddresses, contract: string) => {
//           addresses[contract] = resolver.resolve(contract)
//           return addresses
//         }, {})
//     }
    
//     return {
//       ...resolveWithResolver(omenContracts, resolver),
//       ...resolveWithResolver(balancerContracts, resolver2)
//     }   
// }