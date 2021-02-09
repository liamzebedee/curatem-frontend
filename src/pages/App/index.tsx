import { ChakraProvider } from '@chakra-ui/react'
import ViewMarket from 'pages/ViewMarket'
import React, { StrictMode } from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'
import styled from 'styled-components'
import Header from '../../components/Header'
import Web3ReactManager from '../../components/Web3ReactManager'
import ViewCommunities from '../ViewCommunities'
import ViewMarkets from '../ViewMarkets'

const AppWrapper = styled.div`
  display: flex;
  flex-flow: column;
  align-items: flex-start;
  overflow-x: hidden;
`

const HeaderWrapper = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  width: 100%;
  justify-content: space-between;
`

const BodyWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding-top: 100px;
  align-items: center;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 10;

  z-index: 1;
`

export default function App() {
    return (
        <ChakraProvider>
            <Web3ReactManager>
        <AppWrapper>
                <HeaderWrapper>
                    <Header />
                </HeaderWrapper>
                <BodyWrapper>
                        <Switch>
                            <Route exact strict path="/communities/:community/markets/:market" component={ViewMarket} />
                            <Route exact strict path="/communities/:community/markets" component={ViewMarkets} />
                            <Route exact strict path="/communities/:community" component={ViewCommunities} />
                            <Route exact strict path="/communities" component={ViewCommunities} />
                            <Redirect to="/communities"/>
                        </Switch>
                </BodyWrapper>
            </AppWrapper>
            </Web3ReactManager>
        </ChakraProvider>
    )
}