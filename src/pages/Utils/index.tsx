import { Button, Heading, NumberInput, NumberInputField } from '@chakra-ui/react'
import { useWeb3React } from '@web3-react/core'
import { BalancerSwapper } from 'components/BalancerSwapper'
import { ethers } from 'ethers'
import { useContractDeployments } from 'hooks/useContractDeployments'
import React, { useMemo } from 'react'
import { getSigner } from 'utils/getLibrary'
import { toWei } from '../../utils'





export default function Utils(props: any) {
    const { account, library } = useWeb3React()
    const { deployments } = useContractDeployments()

    async function buyWeth() {
        const weth9 = new ethers.Contract(
            deployments!['WETH9'].address,
            require('@curatem/contracts/abis/WETH9.json'),
            getSigner(library, account!)
        )
        await weth9.deposit({
            value: toWei('5')
        })
    }

    return <div>
        <Heading as="h1" size="lg">Utilities</Heading>
        {/* <Button onClick={buyWeth}>Buy WETH</Button> */}

        <BalancerSwapper tokens={[
                "0xd567aef25f09eb31d3a42a7e7fc682203885c994",
                "0x3ea11a499e9dda30ce7972630a178293666e4036"
            ]} pool="0x04b81008d5eb862c733e79b8C26933B2eB2257FC" />

    </div>
}