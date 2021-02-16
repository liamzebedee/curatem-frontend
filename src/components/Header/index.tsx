import React from 'react'
import Web3Status from '../Web3Status'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'
import useBreadcrumbs from 'use-react-router-breadcrumbs';

function BreadcrumbNavigation(props: any) {
    // console.log(props)

    // const routeConfig = [
    //     {
    //       path: "/communities",
    //       breadcrumb: 'Communities'
    //     },
    //     {
    //         path: "/communities/:communityId"
    //     },
    //     {
    //         path: "/communities/:communityId/markets",
    //         breadcrumb: "Markets"
    //     }
    //   ];
    
    const breadcrumbs = useBreadcrumbs();

    return <Breadcrumb separator={<></>}>
        {breadcrumbs.map(({ breadcrumb, match }) => <span key={match.url}>
            <BreadcrumbItem>
                <BreadcrumbLink href={`/#${match.url}`}>{breadcrumb}</BreadcrumbLink>
            </BreadcrumbItem>
            
            <ChevronRightIcon/>
        </span>)}
    </Breadcrumb>
}

export default () => {
    return <>
        <Web3Status />
        <BreadcrumbNavigation/>
 
    </>
}