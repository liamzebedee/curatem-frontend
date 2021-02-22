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
    networkId: number

    constructor(networkId: number, path: string) {
        this.networkId = networkId
        this.path = path
    }

    resolve(contract: string) {
        let address: string
        const artifactPath = `${this.path}/${contract}.json`
        try {
            const artifact = require(artifactPath)
            address = artifact.networks[this.networkId].address
            // TODO: lookup transactionHash.
        } catch (ex) {
            throw new Error(`Could not resolve contract ${contract} from Ganache artifact at ${artifactPath}`)
        }
        return {
            address,
            blockNumber: undefined
        }
    }
}

