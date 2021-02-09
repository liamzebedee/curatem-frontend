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

