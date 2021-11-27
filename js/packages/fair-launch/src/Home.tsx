import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  CircularProgress,
  Container,
  IconButton,
  Link,
  Slider,
  Snackbar,
} from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import { createStyles, Theme } from '@material-ui/core/styles';
import { PhaseCountdown } from './countdown';
import Dialog from '@material-ui/core/Dialog';
import MuiDialogTitle from '@material-ui/core/DialogTitle';
import MuiDialogContent from '@material-ui/core/DialogContent';
import CloseIcon from '@material-ui/icons/Close';

import Alert from '@material-ui/lab/Alert';

import * as anchor from '@project-serum/anchor';

import { LAMPORTS_PER_SOL } from '@solana/web3.js';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDialogButton } from '@solana/wallet-adapter-material-ui';

import {
  awaitTransactionSignatureConfirmation,
  CandyMachineAccount,
  getCandyMachineState,
  mintOneToken,
} from './candy-machine';

import {
  FairLaunchAccount,
  getFairLaunchState,
  punchTicket,
  purchaseTicket,
  receiveRefund,
} from './fair-launch';

import { formatNumber, getAtaForMint, toDate } from './utils';
import Countdown from 'react-countdown';

const ConnectButton = styled(WalletDialogButton)`
  width: 100%;
  height: 60px;
  margin-top: 2px;
  margin-bottom: 1px;
  background: linear-gradient(180deg, #604ae5 0%, #813eee 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)`
  width: 100%;
  height: 60px;
  margin-top: 2px;
  margin-bottom: 1px;
  background: linear-gradient(180deg, #604ae5 0%, #813eee 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`; // add your styles here

const dialogStyles: any = (theme: Theme) =>
  createStyles({
    root: {
      margin: 0,
      padding: theme.spacing(2),
    },
    closeButton: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
      color: theme.palette.grey[500],
    },
  });

const ValueSlider = styled(Slider)({
  color: '#C0D5FE',
  height: 8,
  '& > *': {
    height: 4,
  },
  '& .MuiSlider-track': {
    border: 'none',
    height: 4,
  },
  '& .MuiSlider-thumb': {
    height: 24,
    width: 24,
    marginTop: -10,
    background: 'linear-gradient(180deg, #604AE5 0%, #813EEE 100%)',
    border: '2px solid currentColor',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: 'inherit',
    },
    '&:before': {
      display: 'none',
    },
  },
  '& .MuiSlider-valueLabel': {
    '& > *': {
      background: 'linear-gradient(180deg, #604AE5 0%, #813EEE 100%)',
    },
    lineHeight: 1.2,
    fontSize: 12,
    padding: 0,
    width: 32,
    height: 32,
    marginLeft: 9,
  },
});

const ValueSlider2 = styled(Slider)({
  color: '#C0D5FE',
  height: 8,
  '& > *': {
    height: 4,
  },
  '& .MuiSlider-track': {
    border: 'none',
    height: 4,
  },
  '& .MuiSlider-thumb': {
    height: 24,
    width: 24,
    marginTop: -10,
    background: 'linear-gradient(180deg, #604AE5 0%, #813EEE 100%)',
    border: '2px solid currentColor',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: 'inherit',
    },
    '&:before': {
      display: 'none',
    },
  },
  '& .MuiSlider-valueLabel': {
    '& > *': {
      background: 'linear-gradient(180deg, #604AE5 0%, #813EEE 100%)',
    },
    lineHeight: 1.2,
    fontSize: 12,
    padding: 0,
    width: 32,
    height: 32,
    marginLeft: 9,
  },
});
const ValueSlider3 = styled(Slider)({
  color: '#C0D5FE',
  height: 8,
  '& > *': {
    height: 4,
  },
  '& .MuiSlider-track': {
    border: 'none',
    height: 4,
  },
  '& .MuiSlider-thumb': {
    height: 24,
    width: 24,
    marginTop: -10,
    background: 'linear-gradient(180deg, #604AE5 0%, #813EEE 100%)',
    border: '2px solid currentColor',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: 'inherit',
    },
    '&:before': {
      display: 'none',
    },
  },
  '& .MuiSlider-valueLabel': {
    '& > *': {
      background: 'linear-gradient(180deg, #604AE5 0%, #813EEE 100%)',
    },
    lineHeight: 1.2,
    fontSize: 12,
    padding: 0,
    width: 32,
    height: 32,
    marginLeft: 9,
  },
});
const ValueSlider4 = styled(Slider)({
  color: '#C0D5FE',
  height: 8,
  '& > *': {
    height: 4,
  },
  '& .MuiSlider-track': {
    border: 'none',
    height: 4,
  },
  '& .MuiSlider-thumb': {
    height: 24,
    width: 24,
    marginTop: -10,
    background: 'linear-gradient(180deg, #604AE5 0%, #813EEE 100%)',
    border: '2px solid currentColor',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: 'inherit',
    },
    '&:before': {
      display: 'none',
    },
  },
  '& .MuiSlider-valueLabel': {
    '& > *': {
      background: 'linear-gradient(180deg, #604AE5 0%, #813EEE 100%)',
    },
    lineHeight: 1.2,
    fontSize: 12,
    padding: 0,
    width: 32,
    height: 32,
    marginLeft: 9,
  },
});
enum Phase {
  Phase0,
  Phase1,
  Phase2,
  Lottery,
  Phase3,
  Phase4,
  Unknown,
}
const Header = (props: {
  phaseName: string;
  desc: string;
  date: anchor.BN | undefined;
  status?: string;
}) => {
  const { phaseName, desc, date, status } = props;
  return (
    <Grid container justifyContent="center">
      <Grid xs={6} justifyContent="center" direction="column">
        <Typography variant="h5" style={{ fontWeight: 600 }}>
          {phaseName}
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {desc}
        </Typography>
      </Grid>
      <Grid xs={6} container justifyContent="flex-end">
        <PhaseCountdown
          date={toDate(date)}
          style={{ justifyContent: 'flex-end' }}
          status={status || 'COMPLETE'}
        />
      </Grid>
    </Grid>
  );
};

function getPhase(
  fairLaunch: FairLaunchAccount | undefined,
  candyMachine: CandyMachineAccount | undefined,
): Phase {
  const curr = new Date().getTime();

    const phaseOne = toDate(fairLaunch?.state.data.phaseOneStart)?.getTime();
    const phaseOneEnd = toDate(fairLaunch?.state.data.phaseOneEnd)?.getTime();
  const phaseTwoEnd = toDate(fairLaunch?.state.data.phaseTwoEnd)?.getTime();
  const candyMachineGoLive = toDate(candyMachine?.state.goLiveDate)?.getTime();


  return Phase.Phase1;
}

export interface HomeProps {
  candyMachineId?: anchor.web3.PublicKey;
  fairLaunchId: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  txTimeout: number;
}

const FAIR_LAUNCH_LOTTERY_SIZE =
  8 + // discriminator
  32 + // fair launch
  1 + // bump
  8; // size of bitmask ones

const isWinner = (
  fairLaunch: FairLaunchAccount | undefined,
  fairLaunchBalance: number,
): boolean => {
  if (fairLaunchBalance > 0) return true;
  if (
    !fairLaunch?.lottery.data ||
    !fairLaunch?.lottery.data.length ||
    !fairLaunch?.ticket.data?.seq ||
    !fairLaunch?.state.phaseThreeStarted
  ) {
    return false;
  }

  const myByte =
    fairLaunch.lottery.data[
      FAIR_LAUNCH_LOTTERY_SIZE +
        Math.floor(fairLaunch.ticket.data?.seq.toNumber() / 8)
    ];

  const positionFromRight = 7 - (fairLaunch.ticket.data?.seq.toNumber() % 8);
  const mask = Math.pow(2, positionFromRight);
  const isWinner = myByte & mask;
  return isWinner > 0;
};

let first = true;
const Home = (props: HomeProps) => {
  const [fairLaunchBalance, setFairLaunchBalance] = useState<number>(0);
  const [yourSOLBalance, setYourSOLBalance] = useState<number | null>(null);

  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
  const [contributed, setContributed] = useState(0);
const [contributed2, setContributed2] = useState(0);
const [contributed3, setContributed3] = useState(0);
const [contributed4, setContributed4] = useState(0);

  const wallet = useWallet();

  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet]);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: undefined,
  });

  const [fairLaunch, setFairLaunch] = useState<FairLaunchAccount>();
  const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();
  const [howToOpen, setHowToOpen] = useState(false);
  const [refundExplainerOpen, setRefundExplainerOpen] = useState(false);
  const [antiRugPolicyOpen, setAnitRugPolicyOpen] = useState(false);
  setTimeout(async function(){
    if (first){
      first = false;
      setHowToOpen(true);
    }
  }, 2000)
  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        if (
          fairLaunch?.ticket.data?.state.unpunched &&
          isWinner(fairLaunch, fairLaunchBalance)
        ) {
          await onPunchTicket();
        }

        const mintTxId = await mintOneToken(candyMachine, wallet.publicKey);

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          'singleGossip',
          false,
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x138')) {
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          window.location.reload();
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      setIsMinting(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (!anchorWallet) {
        return;
      }

      try {
        const balance = await props.connection.getBalance(
          anchorWallet.publicKey,
        );
        setYourSOLBalance(balance);

        const state = await getFairLaunchState(
          anchorWallet,
          props.fairLaunchId,
          props.connection,
        );

        setFairLaunch(state);

        try {
          if (state.state.tokenMint) {
            const fairLaunchBalance =
              await props.connection.getTokenAccountBalance(
                (
                  await getAtaForMint(
                    state.state.tokenMint,
                    anchorWallet.publicKey,
                  )
                )[0],
              );

            if (fairLaunchBalance.value) {
              setFairLaunchBalance(fairLaunchBalance.value.uiAmount || 0);
            }
          }
        } catch (e) {
          console.log('Problem getting fair launch token balance');
          console.log(e);
        }

      } catch (e) {
        console.log('Problem getting fair launch state');
        console.log(e);
      }
      if (props.candyMachineId) {
        try {
          const cndy = await getCandyMachineState(
            anchorWallet,
            props.candyMachineId,
            props.connection,
          );
          setCandyMachine(cndy);
        } catch (e) {
          console.log('Problem getting candy machine state');
          console.log(e);
        }
      } else {
        console.log('No candy machine detected in configuration.');
      }
    })();
  }, [
    anchorWallet,
    props.candyMachineId,
    props.connection,
    props.fairLaunchId,
  ]);
const phaseOneEnd =  toDate(fairLaunch?.state.data.phaseOneEnd)?.getTime();
  const min = formatNumber.asNumber(fairLaunch?.state.data.priceRangeStart);
  const fee = formatNumber.asNumber(fairLaunch?.state.data.fee);
  const max = formatNumber.asNumber(fairLaunch?.state.data.priceRangeEnd);
  const step = formatNumber.asNumber(fairLaunch?.state.data.tickSize);
  const median = formatNumber.asNumber(fairLaunch?.state.currentMedian);
let highest
// @ts-ignore
  if (fairLaunch?.state.currentHighest != undefined){
// @ts-ignore
highest = formatNumber.asNumber(fairLaunch?.state.currentHighest);
  }
  else {
    highest = 1000000000
  } 
  const marks = [
   
    // TODO:L
    {
      value: min || 0,
      label:  `${min} SOL`,
    },
    // display user comitted value
    // {
    //   value: 37,
    //   label: '37°C',
    // },
    {
      value: max || 0,
      label: `${max} SOL`,
    },
  ].filter(_ => _ !== undefined && _.value !== 0) as any;

  const onDeposit = async () => {
    if (!anchorWallet) {
      return;
    }
    console.log('deposit');
    setIsMinting(true);
    try {

    
      if (
  // @ts-ignore
        new Date().getTime() < phaseOneEnd){

      await purchaseTicket(contributed, anchorWallet, fairLaunch);
    }
    else {
            await purchaseTicket(0, anchorWallet, fairLaunch);

    }
      setIsMinting(false);
      setAlertState({
        open: true,
        message: `Congratulations! contribution ${
          fairLaunch?.ticket.data ? 'updated' : 'inserted'
        }!`,
        severity: 'success',
      });
    } catch (e) {
      console.log(e);
      setIsMinting(false);
      setAlertState({
        open: true,
        message: 'Something went wrong.',
        severity: 'error',
      });
    }
  };
  const onRugRefund = async () => {
    if (!anchorWallet) {
      return;
    }

    console.log('refund');
    try {
      setIsMinting(true);
      await receiveRefund(anchorWallet, fairLaunch);
      setIsMinting(false);
      setAlertState({
        open: true,
        message:
          'Congratulations! You have received a refund. This is an irreversible action.',
        severity: 'success',
      });
    } catch (e) {
      console.log(e);
      setIsMinting(false);
      setAlertState({
        open: true,
        message: 'Something went wrong.',
        severity: 'error',
      });
    }
  };
  const onRefundTicket = async () => {

  };

  const onPunchTicket = async () => {
    if (!anchorWallet || !fairLaunch || !fairLaunch.ticket) {
      return;
    }

    console.log('punch');
    setIsMinting(true);
    try {
      await punchTicket(anchorWallet, fairLaunch);
      setIsMinting(false);
      setAlertState({
        open: true,
        message: 'Congratulations! Ticket punched!',
        severity: 'success',
      });
    } catch (e) {
      console.log(e);
      setIsMinting(false);
      setAlertState({
        open: true,
        message: 'Something went wrong.',
        severity: 'error',
      });
    }
  };

  const phase = getPhase(fairLaunch, candyMachine);

  const candyMachinePredatesFairLaunch =
    candyMachine?.state.goLiveDate &&
    fairLaunch?.state.data.phaseTwoEnd &&
    candyMachine?.state.goLiveDate.lt(fairLaunch?.state.data.phaseTwoEnd);

  const notEnoughSOL = false;

  return (
    <Container style={{ marginTop: 0 }}>
    <div>{fee} SOL flat per contribution and 10% of the contribution.</div>
      <Container maxWidth="xs" style={{ position: 'relative' }}>
        <Paper
          style={{ padding: 24, backgroundColor: '#151A1F', borderRadius: 6 }}
        >
          <Grid container justifyContent="center" direction="column">
            {phase === Phase.Phase0 && (
              <Header
                phaseName={'Phase 0'}
                desc={'Anticipation Phase'}
                date={fairLaunch?.state.data.phaseOneStart}
              />
            )}
            {phase === Phase.Phase1 && (
              <div>
              <Header
                phaseName={'This is NOT FLP!'}
                desc={'This is NOT a #FairLaunchProtocol. Anything you contribute goes to the winner, back into the game to seed the next games, dev.'}
                date={fairLaunch?.state.data.phaseOneEnd}
              />

              <Typography variant="h5" style={{ fontWeight: 900 }}>
                    
                    {fairLaunch?.state.authority.toBase58().slice(0, 3) +
                      '...' +
                      fairLaunch?.state.authority
                        .toBase58()
                        .slice(
                          fairLaunch?.state.authority.toBase58().length - 3,
                          fairLaunch?.state.authority.toBase58().length,
                        )}{' '}
                    is Going to Win 1st Prize of ◎{''}

                    { // @ts-ignore
                      formatNumber.format((fairLaunch?.treasury * 0.8) / LAMPORTS_PER_SOL)}! If nobody outcontributions 'em _soon_ 
                     { // @ts-ignore
                      formatNumber.format((fairLaunch?.treasury * 0.2) / LAMPORTS_PER_SOL)}! will be kept in the game, for future rounds...
                  <br />
                  dev share is distributed among tokenholders. You may lose all your $. Risk only what you can afford to lose.
                  </Typography>
                  </div>  
            )}

            {phase === Phase.Phase2 && (
              <Header
                phaseName={'Hey press the mint $'}
                desc={'It\'ll pay the winner, you pay sol fees, then restart this game:)'}
                date={fairLaunch?.state.data.phaseTwoEnd}
              />
            )}

            {phase === Phase.Lottery && (
              <Header
                phaseName={'Phase 3'}
                desc={'Raffle in progress'}
                date={fairLaunch?.state.data.phaseTwoEnd.add(
                  fairLaunch?.state.data.lotteryDuration,
                )}
              />
            )}

            {phase === Phase.Phase3 && !candyMachine && (
              <Header
                phaseName={'Phase 3'}
                desc={'Raffle finished!'}
                date={fairLaunch?.state.data.phaseTwoEnd}
              />
            )}

            {phase === Phase.Phase3 && candyMachine && (
              <Header
                phaseName={'Phase 3'}
                desc={'Minting starts in...'}
                date={candyMachine?.state.goLiveDate}
              />
            )}

            {phase === Phase.Phase4 && (
              <Header
                phaseName={
                  candyMachinePredatesFairLaunch ? 'Phase 3' : 'Phase 4'
                }
                desc={'Candy Time 🍬 🍬 🍬'}
                date={candyMachine?.state.goLiveDate}
                status="LIVE"
              />
            )}

            {fairLaunch && (
              <>
                {[
                  Phase.Phase1,
                  Phase.Phase2,
                  Phase.Phase3,
                  Phase.Lottery,
                ].includes(phase) &&
                  fairLaunch?.ticket?.data?.state.withdrawn && (
                    <div style={{ paddingTop: '15px' }}>
                      <Alert severity="error">
                        Your contribution was withdrawn and cannot be adjusted or
                        re-inserted.
                      </Alert>
                    </div>
                  )}
                {[Phase.Phase1, Phase.Phase2].includes(phase) &&
                  fairLaunch.state.currentMedian &&
                  fairLaunch?.ticket?.data?.amount &&
                  !fairLaunch?.ticket?.data?.state.withdrawn &&
                  fairLaunch.state.currentMedian.gt(
                    fairLaunch?.ticket?.data?.amount,
                  ) && (
                    <div style={{ paddingTop: '15px' }}>
                      <Alert severity="warning">
                        Your contribution is currently below the median and will not be
                        eligible for the raffle.
                      </Alert>
                    </div>
                  )}
                {[Phase.Phase3, Phase.Lottery].includes(phase) &&
                  fairLaunch.state.currentMedian &&
                  fairLaunch?.ticket?.data?.amount &&
                  !fairLaunch?.ticket?.data?.state.withdrawn &&
                  fairLaunch.state.currentMedian.gt(
                    fairLaunch?.ticket?.data?.amount,
                  ) && (
                    <div style={{ paddingTop: '15px' }}>
                      <Alert severity="error">
                        Your contribution was below the median and was not included in
                        the raffle. You may click <em>Withdraw</em> when the
                        raffle ends or you will be automatically issued one when
                        the Fair Launch authority withdraws from the treasury.
                      </Alert>
                    </div>
                  )}
                {notEnoughSOL && (
                  <Alert severity="error">
                    You do not have enough SOL in your account to place this
                    contribution.
                  </Alert>
                )}
              </>
            )}

            {[Phase.Phase1, Phase.Phase2].includes(phase) && (
              <>
                <Grid style={{ marginTop: 40, marginBottom: 20 }}>
                  <ValueSlider
                    min={min}
                    marks={marks}
                    max={max}
                    step={step}
                    value={contributed}
                    onChange={(ev, val) => setContributed(val as any)}
                    valueLabelDisplay="auto"
                    style={{
                      width: 'calc(100% - 40px)',
                      marginLeft: 20,
                      height: 30,
                    }}
                  />
                </Grid>
              </>
            )}

            {!wallet.connected ? (
              <ConnectButton>
                Connect{' '}
                {[Phase.Phase1].includes(phase) ? 'to contribution' : 'to see status'}
              </ConnectButton>
            ) : ( 
              <div>
                {[Phase.Phase1, Phase.Phase2].includes(phase) && (
                  <>
                    <MintButton
                      onClick={onDeposit}
                      variant="contained"
                      disabled={
                        false 
                      }
                    >
                      {isMinting ? (
                        <CircularProgress />
                      ) : !fairLaunch?.ticket.data ? (
                        'Place contribution'
                      ) : (
                        'New contributions != adjusting.'
                      )}
                      {}
                    </MintButton>
                  </>
                )}
                 

                {[Phase.Phase3].includes(phase) && (
                  <>
                    {isWinner(fairLaunch, fairLaunchBalance) && (
                      <MintButton
                        onClick={onPunchTicket}
                        variant="contained"
                        disabled={
                          fairLaunch?.ticket.data?.state.punched !== undefined
                        }
                      >
                        {isMinting ? <CircularProgress /> : 'Punch Ticket'}
                      </MintButton>
                    )}

                    {!isWinner(fairLaunch, fairLaunchBalance) && (
                      <MintButton
                        onClick={onRefundTicket}
                        variant="contained"
                        disabled={
                          isMinting ||
                          fairLaunch?.ticket.data === undefined ||
                          fairLaunch?.ticket.data?.state.withdrawn !== undefined
                        }
                      >
                        {isMinting ? <CircularProgress /> : 'Withdraw'}
                      </MintButton>
                    )}
                  </>
                )}

                {phase === Phase.Phase4 && (
                  <>
                    {(!fairLaunch ||
                      isWinner(fairLaunch, fairLaunchBalance)) && (
                      <MintContainer>
                        <MintButton
                          disabled={
                            candyMachine?.state.isSoldOut ||
                            isMinting ||
                            !candyMachine?.state.isActive ||
                            (fairLaunch?.ticket?.data?.state.punched &&
                              fairLaunchBalance === 0)
                          }
                          onClick={onMint}
                          variant="contained"
                        >
                          {fairLaunch?.ticket?.data?.state.punched &&
                          fairLaunchBalance === 0 ? (
                            'MINTED'
                          ) : candyMachine?.state.isSoldOut ? (
                            'SOLD OUT'
                          ) : isMinting ? (
                            <CircularProgress />
                          ) : (
                            'MINT'
                          )}
                        </MintButton>
                      </MintContainer>
                    )}

                    {!isWinner(fairLaunch, fairLaunchBalance) && (
                      <MintButton
                        onClick={onRefundTicket}
                        variant="contained"
                        disabled={
                          isMinting ||
                          fairLaunch?.ticket.data === undefined ||
                          fairLaunch?.ticket.data?.state.withdrawn !== undefined
                        }
                      >
                        {isMinting ? <CircularProgress /> : 'Withdraw'}
                      </MintButton>
                    )}
                  </>
                )}
              </div>
            )}

            <Grid
              container
              justifyContent="space-between"
              color="textSecondary"
            >
              <Link
                component="button"
                variant="body2"
                color="textSecondary"
                align="left"
                onClick={() => {
                  setHowToOpen(true);
                }}
              >
                Wat is this
              </Link>

            </Grid>
            <Dialog
              open={refundExplainerOpen}
              onClose={() => setRefundExplainerOpen(false)}
              PaperProps={{
                style: { backgroundColor: '#222933', borderRadius: 6 },
              }}
            >
              <MuiDialogContent style={{ padding: 24 }}>
                During raffle phases, or if you are a winner, or if this website
                is not configured to be a fair launch but simply a candy
                machine, refunds are disallowed.
              </MuiDialogContent>
            </Dialog>
            <Dialog
              open={antiRugPolicyOpen}
              onClose={() => {
                setAnitRugPolicyOpen(false);
              }}
              PaperProps={{
                style: { backgroundColor: '#222933', borderRadius: 6 },
              }}
            >
              <MuiDialogContent style={{ padding: 24 }}>
                {!fairLaunch?.state.data.antiRugSetting && (
                  <span>This Fair Launch has no anti-rug settings.</span>
                )}
                {fairLaunch?.state.data.antiRugSetting &&
                  fairLaunch.state.data.antiRugSetting.selfDestructDate && (
                    <div>
                      <h3>Anti-Rug Policy</h3>
                      <p>
                        This raffle is governed by a smart contract to prevent
                        the artist from running away with your money.
                      </p>
                      <p>How it works:</p>
                      This project will retain{' '}
                      {fairLaunch.state.data.antiRugSetting.reserveBp / 100}% (◎{' '}
                      {(fairLaunch?.treasury *
                        fairLaunch.state.data.antiRugSetting.reserveBp) /
                        (LAMPORTS_PER_SOL * 10000)}
                      ) of the pledged amount in a locked state until all but{' '}
                      {fairLaunch.state.data.antiRugSetting.tokenRequirement.toNumber()}{' '}
                      NFTs (out of up to{' '}
                      {fairLaunch.state.data.numberOfTokens.toNumber()}) have
                      been minted.
                      <p>
                        If more than{' '}
                        {fairLaunch.state.data.antiRugSetting.tokenRequirement.toNumber()}{' '}
                        NFTs remain as of{' '}
                        {toDate(
                          fairLaunch.state.data.antiRugSetting.selfDestructDate,
                        )?.toLocaleDateString()}{' '}
                        at{' '}
                        {toDate(
                          fairLaunch.state.data.antiRugSetting.selfDestructDate,
                        )?.toLocaleTimeString()}
                        , you will have the option to get a refund of{' '}
                        {fairLaunch.state.data.antiRugSetting.reserveBp / 100}%
                        of the cost of your token.
                      </p>
                      {fairLaunch?.ticket?.data &&
                        !fairLaunch?.ticket?.data.state.withdrawn && (
                          <MintButton
                            onClick={onRugRefund}
                            variant="contained"
                            disabled={
                              !!!fairLaunch.ticket.data ||
                              !fairLaunch.ticket.data.state.punched ||
                              Date.now() / 1000 <
                                fairLaunch.state.data.antiRugSetting.selfDestructDate.toNumber()
                            }
                          >
                            {isMinting ? (
                              <CircularProgress />
                            ) : Date.now() / 1000 <
                              fairLaunch.state.data.antiRugSetting.selfDestructDate.toNumber() ? (
                              <span>
                                Refund in...
                                <Countdown
                                  date={toDate(
                                    fairLaunch.state.data.antiRugSetting
                                      .selfDestructDate,
                                  )}
                                />
                              </span>
                            ) : (
                              'Refund'
                            )}
                            {}
                          </MintButton>
                        )}
                      <div style={{ textAlign: 'center', marginTop: '-5px' }}>
                        {fairLaunch?.ticket?.data &&
                          !fairLaunch?.ticket?.data?.state.punched && (
                            <small>
                              You currently have a ticket but it has not been
                              punched yet, so cannot be refunded.
                            </small>
                          )}
                      </div>
                    </div>
                  )}
              </MuiDialogContent>
            </Dialog>
            <Dialog
              open={howToOpen}
              onClose={() => setHowToOpen(false)}
              PaperProps={{
                style: { backgroundColor: '#222933', borderRadius: 6 },
              }}
            >
              <MuiDialogTitle
                disableTypography
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Link
                  component="button"
                  variant="h6"
                  color="textSecondary"
                  onClick={() => {
                    setHowToOpen(true);
                  }}
                >
                  How it works
                </Link>
                <IconButton
                  aria-label="close"
                  className={dialogStyles.closeButton}
                  onClick={() => setHowToOpen(false)}
                >
                  <CloseIcon />
                </IconButton>
              </MuiDialogTitle>
              <MuiDialogContent>

  <Typography variant="h4">
                  TL;DR: Any contribution of any amount will let you win, if nobody contributions before the timer runs out. Glhf.
                </Typography>
                

                <Typography variant="h6">
                  There is one phase.
                </Typography>
                <Typography gutterBottom color="textSecondary">
                  You contribute. When you do for a particular game the ranges increase and the entry into all games is reduced a bit.
                </Typography>
                <Typography variant="h6">Phase 2 - Not Really</Typography>
                <Typography gutterBottom color="textSecondary">
                 Anyone can press the magic button, release winnings to our lucky frien, 10% stays behind to seed the next game tho.
                </Typography>
 <Typography variant="h6">Btw</Typography>
                <Typography gutterBottom color="textSecondary">
                Any contribution of any amount will let you win, if nobody contributions before the timer runs out. Glhf.
                </Typography>
                  <Typography gutterBottom color="textSecondary">
                Nothng I should ever do or say is not financial advice of any kind, I'm not qualified. 
                </Typography>
              </MuiDialogContent>
            </Dialog>

            {/* {wallet.connected && (
              <p>
                Address: {shortenAddress(wallet.publicKey?.toBase58() || '')}
              </p>
            )}

            {wallet.connected && (
              <p>Balance: {(balance || 0).toLocaleString()} SOL</p>
            )} */}
          </Grid>
        </Paper>
      </Container>

      {fairLaunch && (
        <Container
          maxWidth="xs"
          style={{ position: 'relative', marginTop: 10 }}
        >
          <div style={{ margin: 20 }}>
            <Grid container direction="row" wrap="nowrap">
              <Grid container md={4} direction="column">
                <Typography variant="body2" color="textSecondary">
                  contributions
                </Typography>
                <Typography
                  variant="h6"
                  color="textPrimary"
                  style={{ fontWeight: 'bold' }}
                >
                  {fairLaunch?.state.numberTicketsSold.toNumber() || 0}
                </Typography>
              </Grid>
              <Grid container md={4} direction="column">
                <Typography variant="body2" color="textSecondary">
                  Median contribution
                </Typography>
                <Typography
                  variant="h6"
                  color="textPrimary"
                  style={{ fontWeight: 'bold' }}
                >
                  ◎ {formatNumber.format(median)}
                </Typography>
              </Grid>
              <Grid container md={4} direction="column">
                <Typography variant="body2" color="textSecondary">
                  Total raised
                </Typography>
                <Typography
                  variant="h6"
                  color="textPrimary"
                  style={{ fontWeight: 'bold' }}
                >
                  ◎{' '}
                  {formatNumber.format(
                    (fairLaunch?.treasury || 0) / LAMPORTS_PER_SOL,
                  )}
                </Typography>
              </Grid>
            </Grid>
          </div>
        </Container>
      )}
      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error' | undefined;
}

export default Home;