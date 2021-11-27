import './App.css';
import { useMemo } from 'react';

import Home from './Home';

import * as anchor from '@project-serum/anchor';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  getPhantomWallet,
  getSolflareWallet,
  getSolletWallet,
} from '@solana/wallet-adapter-wallets';

import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';

import { WalletDialogProvider } from '@solana/wallet-adapter-material-ui';
import { ThemeProvider, createTheme } from '@material-ui/core';
import { ConfettiProvider } from './confetti';

const theme = createTheme({
  palette: {
    type: 'dark',
  },
});

const candyMachineId = process.env.REACT_APP_CANDY_MACHINE_ID
  ? new anchor.web3.PublicKey(process.env.REACT_APP_CANDY_MACHINE_ID)
  : undefined;

const fairLaunchId = new anchor.web3.PublicKey(
  process.env.REACT_APP_FAIR_LAUNCH_ID!,
);

const fairLaunchId2 = new anchor.web3.PublicKey(
  process.env.REACT_APP_FAIR_LAUNCH_ID2!,
);
const fairLaunchId3 = new anchor.web3.PublicKey(
  process.env.REACT_APP_FAIR_LAUNCH_ID3!,
);
const fairLaunchId4 = new anchor.web3.PublicKey(
  process.env.REACT_APP_FAIR_LAUNCH_ID4!,
);
const network = process.env.REACT_APP_SOLANA_NETWORK as WalletAdapterNetwork;

const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST!;
const connection = new anchor.web3.Connection(rpcHost);

const startDateSeed = parseInt(process.env.REACT_APP_CANDY_START_DATE!, 10);

const txTimeout = 30000; // milliseconds (confirm this works for your project)

const App = () => {
  const endpoint = useMemo(() => clusterApiUrl(network), []);

  const wallets = useMemo(
    () => [getPhantomWallet(), getSolflareWallet(), getSolletWallet()],
    [],
  );

  return (
    <ThemeProvider theme={theme}>
    <div>whoever contributes any contribution in the range last wins. the timer resets anyone contributes, and the range mins and maxes increase. These all reset back to og. values when a game is won.</div>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletDialogProvider>
            <div
              className="container-div"
              style={{ margin: 0, alignItems: 'center' }}
            >
              <div style={{ display: 'inline' }}>
                <div style={{ textAlign: 'center' }}>Team 1</div>
                <ConfettiProvider>
                  <Home
                    candyMachineId={candyMachineId}
                    fairLaunchId={fairLaunchId}
                    connection={connection}
                    startDate={startDateSeed}
                    txTimeout={txTimeout}
                  />
                </ConfettiProvider>
              </div>
              <div style={{ display: 'inline' }}>
                <div style={{ textAlign: 'center' }}>Team 2</div>
                <ConfettiProvider>
                  <Home
                    candyMachineId={candyMachineId}
                    fairLaunchId={fairLaunchId2}
                    connection={connection}
                    startDate={startDateSeed}
                    txTimeout={txTimeout}
                  />
                </ConfettiProvider>
              </div>
            </div>
            <div
              className="container-div"
              style={{ margin: 0, alignItems: 'center' }}
            >
              <div style={{ display: 'inline' }}>
                <div style={{ textAlign: 'center' }}>Team 3</div>
                <ConfettiProvider>
                  <Home
                    candyMachineId={candyMachineId}
                    fairLaunchId={fairLaunchId3}
                    connection={connection}
                    startDate={startDateSeed}
                    txTimeout={txTimeout}
                  />
                </ConfettiProvider>
              </div>
              <div style={{ display: 'inline' }}>
                <div style={{ textAlign: 'center' }}>Team 4</div>
                <ConfettiProvider>
                  <Home
                    candyMachineId={candyMachineId}
                    fairLaunchId={fairLaunchId4}
                    connection={connection}
                    startDate={startDateSeed}
                    txTimeout={txTimeout}
                  />
                </ConfettiProvider>
              </div>
            </div>
          </WalletDialogProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  );
};

export default App;
