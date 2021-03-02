export interface Deployments {
    [networkId: string]: ContractDeployments
}

export interface ContractDeployments {
    [key: string]: ContractDeployment
}

export interface ContractDeployment {
    address: string
    blockNumber?: string
}

export interface ContractResolver {
    resolve(contract: string): ContractDeployment
}


export async function resolveContracts(networkId: string, contracts: string[]): Promise<ContractDeployments> {
  const deployments = require('@curatem/contracts/deployments.json')
  console.log(`Resolving contracts from deployments`, deployments, `on network ${networkId}`)

  const resolver: ContractResolver = new DeploymentsJsonResolver(networkId, undefined, require('@curatem/contracts/deployments.json'))
//   const resolver2: GanacheArtifactResolver = new GanacheArtifactResolver(networkId, 'omen-subgraph/build/contracts')
  
  return contracts
    .reduce((deployments: ContractDeployments, contract: string) => {
      deployments[contract] = resolver.resolve(contract)
      return deployments
    }, {})
  }

export class DeploymentsJsonResolver implements ContractResolver {
    deployments: Deployments
    networkId: string

    constructor(networkId: string, path?: string, deployments?: Deployments) {
        try {
            this.networkId = networkId
            /* eslint-disable @typescript-eslint/no-var-requires */
            this.deployments = deployments || require(path!) as Deployments
        } catch (ex) {
            throw new Error(`Could not find deployments.json at ${path}: ${ex.toString()}`)
        }
    }

    resolve(contract: string) {
        let data: ContractDeployment
        try {
            data = this.deployments[this.networkId][contract]
        } catch (ex) {
            throw new Error(`Could not resolve contract ${contract} from deployments: ${ex.toString()}`)
        }
        return data
    }
}

class GanacheArtifactResolver implements ContractResolver {
    path: string
    networkId: string

    constructor(networkId: string, path: string) {
        this.networkId = networkId
        this.path = path
    }

    resolve(contract: string) {
        let address: string
        try {
            const artifact = require(`${this.path}/${contract}.json`)
            address = artifact.networks[this.networkId].address
            // TODO: lookup transactionHash.
        } catch (ex) {
            throw new Error(`Could not resolve contract ${contract} from Ganache artifact at ${`${this.path}/${contract}.json`}: ${ex.toString()}`)
        }
        return {
            address,
            blockNumber: undefined
        }
    }
}

