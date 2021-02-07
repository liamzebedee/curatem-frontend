import React from 'react'
import Web3Status from '../Web3Status'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'
import { Route, useRouteMatch } from "react-router";
import { useParams } from "react-router-dom"

function BreadcrumbNavigation() {
    // let crumbs = []

    // const location = useLocation()

    let params = useParams() as any
    console.log(params)

    return <>
            <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="gray.500" />}>
                <Route path='/communities'>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="#/communities/">Communities</BreadcrumbLink>
                    </BreadcrumbItem>

                    <ChevronRightIcon/>
                </Route>

                <Route path='/communities/:communityId/'>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="#/communities/ethtrader/">{ params.communityId }</BreadcrumbLink>
                    </BreadcrumbItem>

                    <ChevronRightIcon/>
                </Route>

                <Route path='/communities/:communityId/markets'>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="#/communities/ethtrader/markets">Markets</BreadcrumbLink>
                    </BreadcrumbItem>

                    <ChevronRightIcon/>
                </Route>

                <Route path='/communities/:communityId/markets/:marketId'>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="#/communities/ethtrader/markets/marketId">{ params.marketId }</BreadcrumbLink>
                    </BreadcrumbItem>
                </Route>
            </Breadcrumb>

        
    </>
}

export default () => {
    return <>
        <Web3Status />
        <BreadcrumbNavigation/>
 
    </>
}