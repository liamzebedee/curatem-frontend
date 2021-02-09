import React from 'react'
import { Link, RouteComponentProps } from 'react-router-dom'
import { useContractDeployments } from '../../hooks/useContractDeployments'

export default function ViewCommunities(props: RouteComponentProps & any) {
    const { deployments } = useContractDeployments()
    
    if(!deployments) {
        return null
    }

    console.log(deployments && deployments.RedditCommunity1)

    return <>
        Communities
        <Link to={`/communities/${deployments.RedditCommunity1.address}/markets`}>{deployments.RedditCommunity1.address}</Link>
    </>
}