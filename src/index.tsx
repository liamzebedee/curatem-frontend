import { createWeb3ReactRoot, Web3ReactProvider } from '@web3-react/core';
import { ApolloProviderWrapper } from 'contexts/apollo';
import 'inter-ui';
import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import ReactGA from 'react-ga';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { NetworkContextName } from './constants';
import App from './pages/App';
import store from './state';
import getLibrary from './utils/getLibrary';
import "intl-relative-time-format";

const Web3ProviderNetwork = createWeb3ReactRoot(NetworkContextName);

if ('ethereum' in window) {
    (window.ethereum as any).autoRefreshOnNetworkChange = false;
}

// const GOOGLE_ANALYTICS_ID: string | undefined = process.env.REACT_APP_GOOGLE_ANALYTICS_ID
// if (typeof GOOGLE_ANALYTICS_ID === 'string') {
//   ReactGA.initialize(GOOGLE_ANALYTICS_ID)
//   ReactGA.set({
//     customBrowserType: !isMobile ? 'desktop' : 'web3' in window || 'ethereum' in window ? 'mobileWeb3' : 'mobileRegular'
//   })
// } else {
//   ReactGA.initialize('test', { testMode: true, debug: true })
// }

// window.addEventListener('error', error => {
//   ReactGA.exception({
//     description: `${error.message} @ ${error.filename}:${error.lineno}:${error.colno}`,
//     fatal: true
//   })
// })

// function Updaters() {
//   return (
//     <>
//       <ListsUpdater />
//       <UserUpdater />
//       <ApplicationUpdater />
//       <TransactionUpdater />
//       <MulticallUpdater />
//     </>
//   )
// }

ReactDOM.render(
    <StrictMode>
        <Web3ReactProvider getLibrary={getLibrary}>
            <Web3ProviderNetwork getLibrary={getLibrary}>
                <ApolloProviderWrapper>
                    <Provider store={store}>
                        <HashRouter>
                            <App />
                        </HashRouter>
                    </Provider>
                </ApolloProviderWrapper>
            </Web3ProviderNetwork>
        </Web3ReactProvider>
    </StrictMode>,
    document.getElementById('root'),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
