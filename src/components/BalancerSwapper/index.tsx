
import { Button, NumberInput, NumberInputField, Select } from '@chakra-ui/react'
import styled from 'styled-components'
import React, { Dispatch, Reducer, useCallback, useEffect, useRef, useState } from 'react'
import { createReducer, ThunkAction, Action, createSlice, PayloadAction, combineReducers, getDefaultMiddleware, configureStore, Middleware, MiddlewareArray, applyMiddleware } from '@reduxjs/toolkit'
import { createAction } from '@reduxjs/toolkit'
import { useReducer } from 'react'
import { BigNumber, ethers } from 'ethers'
import { debounce } from 'lodash'
import { useWeb3React } from '@web3-react/core'
import { getSigner } from 'utils/getLibrary'
import { calcOutGivenIn } from './balancerCalcs'
import { fromWei, shortenAddress, toWei } from 'utils'
import { createStoreHook, useDispatch, useSelector } from 'react-redux'

const Row = styled.div`
    display: block;
`

const ERC20 = [
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address marketMaker) external view returns (uint256)',
    'function symbol() external view returns (string)',
    'function name() external view returns (string)',
    'function decimals() external view returns (uint8)',
    'function transferFrom(address sender, address recipient, uint256 amount) public returns (bool)',
    'function transfer(address to, uint256 value) public returns (bool)',
]
  

const ONE = BigNumber.from(10).pow(18)

type State = any
const initialState: State = {
    ready: false,
    loading: true,
    fromToken: null,
    toToken: null,
    tokenInfo: {},
    amountIn: ONE.toString(),
    amountOut: ONE.toString(),
    pool: null,
    swapError: "",
    needsApproval: true
}



const slice = createSlice({
    name: 'balancerSwapper',
    initialState: initialState,
    reducers: {
        doneInitialising(state, { payload: { tokenInfo, fromToken, toToken, pool } }) {
            state.ready = true
            state.tokenInfo = tokenInfo
            state.fromToken = fromToken
            state.toToken = toToken
            state.pool = pool
        },
        startLoading(state) {
            state.loading = true
        },
        updateCalculation(state, { payload }: PayloadAction<any>) {
            const { tokenAmountIn, tokenAmountOut, needsApproval } = payload
            state.loading = false
            state.needsApproval = needsApproval
            state.amountIn = tokenAmountIn.toString()
            state.amountOut = tokenAmountOut.toString()
        },
        executeSwap(state) {
        },
        executeSwapError(state, { payload }) {
            state.swapError = payload.error
        },
        executeApproveSuccess(state) {
            state.needsApproval = false
        },
        executeApproveError(state, { payload }) {
            state.approveError = payload.error
        },
        selectFromToken(state, { payload: { fromToken } }) {
            state.fromToken = fromToken
        }
    }
  })

  const {
    doneInitialising,
    startLoading,
    updateCalculation,
    executeSwapError,
    executeApproveError,
    executeApproveSuccess,
    selectFromToken
  } = slice.actions

export const reducer = slice.reducer

export type AppThunk = ThunkAction<void, typeof initialState, null, Action<string>>

const initialise = (pool: ethers.Contract, erc20Template: ethers.Contract, tokens: string[]): AppThunk => async (dispatch, getState) => {
    const state = selectBalancerSwapperState(getState())

    async function loadToken(tokenAddress: string) {
        const token = erc20Template.attach(tokenAddress)
        const name = await token.symbol()
        return { name }
    }

    let tokenInfo: any = {}
    for(let token of tokens) {
        tokenInfo[token] = await loadToken(token)
    }

    dispatch(doneInitialising({
        tokenInfo,
        fromToken: tokens[0],
        toToken: tokens[1],
        pool: pool.address
    }))

    dispatch(calculate(
        pool,
        erc20Template,
        state.amountIn
    ))
}

function selectBalancerSwapperState(state: any): any {
    // return state.balancerSwapper
    return state
}

const calculate = (pool: ethers.Contract, tokenTemplate: ethers.Contract, amountIn: string): AppThunk => async (dispatch, getState) => {
    dispatch(startLoading())

    const state = selectBalancerSwapperState(getState())

    const tokenIn = state.fromToken
    const tokenAmountIn = amountIn
    const tokenOut = state.toToken
    const minAmountOut = '1' // TODO

    // Get pool info.
    const tokenBalanceIn = await pool.getBalance(tokenIn)
    const tokenWeightIn = await pool.getDenormalizedWeight(tokenIn)
    const tokenBalanceOut = await pool.getBalance(tokenOut)
    const tokenWeightOut = await pool.getDenormalizedWeight(tokenOut)
    const swapFee = await pool.getSwapFee()

    console.debug(`tokenBalanceIn: ${tokenBalanceIn}`)
    console.debug(`tokenWeightIn: ${tokenWeightIn}`)
    console.debug(`tokenBalanceOut: ${tokenBalanceOut}`)
    console.debug(`tokenWeightOut: ${tokenWeightOut}`)
    console.debug(`swapFee: ${swapFee}`)
    
    const tokenAmountOut = calcOutGivenIn(
        BigNumber.from(tokenBalanceIn),
        BigNumber.from(tokenWeightIn),
        BigNumber.from(tokenBalanceOut),
        BigNumber.from(tokenWeightOut),
        BigNumber.from(tokenAmountIn),
        BigNumber.from(swapFee)
    )

    let needsApproval = false
    const token = tokenTemplate.attach(state.fromToken)
    // TODO: ugly
    const account = await token.signer.getAddress()
    const allowance = await token.allowance(account, pool.address)
    if(allowance.lt(ethers.constants.MaxUint256)) {
        needsApproval = true
    }

    dispatch(updateCalculation({ 
        tokenAmountIn,
        tokenAmountOut,
        needsApproval
    }))
}

const executeSwap = (pool: ethers.Contract): AppThunk => async (dispatch, getState) => {
    const state = selectBalancerSwapperState(getState())

    const tokenIn = state.fromToken
    const tokenAmountIn = state.amountIn
    const tokenOut = state.toToken
    const minAmountOut = state.amountOut
    const maxPrice = ethers.constants.MaxUint256

    try {
        await pool.swapExactAmountIn(
            tokenIn,
            tokenAmountIn,
            tokenOut,
            minAmountOut,
            maxPrice.toString()
        )
    } catch(ex) {
        dispatch(executeSwapError({ error: ex.toString() }))
    }
}

const executeApprove = (pool: ethers.Contract, tokenTemplate: ethers.Contract): AppThunk => async (dispatch, getState) => {
    const state = selectBalancerSwapperState(getState())

    try {
        const token = tokenTemplate.attach(state.fromToken)
        await token.approve(
            pool.address,
            ethers.constants.MaxUint256
        )
        dispatch(executeApproveSuccess())
    } catch(ex) {
        dispatch(executeApproveError({ error: ex.toString() }))
    }
}


// 
// Currently, this component requires an external Redux store, instantiated by `configureStore`, with support for thunk actions.
// Ideally, I'd like to encapsulate the store within this component, using useReducer.
// Below, `useReducerWithThunk` was my attempt at doing this - however, it had flaws relating to the state.
// When a thunk action dispatched its own actions, calls to `getState` would refer to the previous, stale state, and not the current state.
// 
function useReducerWithThunk(reducer: Reducer<any,any>, initialState: any) {
    const [ state, dispatch ] = useReducer(reducer, initialState)

    const stateRef = useRef(state)
    stateRef.current = state

    const getState = useCallback(() => stateRef.current, [])

    const thunkDispatch: Dispatch<any> = useCallback(
        (action) => (typeof action === 'function' ? action(thunkDispatch, getState) : dispatch(action)),
        [getState, dispatch],
      )

    return [state, thunkDispatch]
}

// import { useCallback, useReducer, useRef } from 'react'

// export default function useThunkReducer(reducer, initialState) {
//   const [state, dispatch] = useReducer(reducer, initialState)

//   const stateRef = useRef(state)
//   stateRef.current = state

//   const getState = useCallback(() => stateRef.current, [])
//   const thunkDispatch = useCallback(
//     (action) => (typeof action === 'function' ? action(thunkDispatch, getState) : dispatch(action)),
//     [getState, dispatch],
//   )

//   return [state, thunkDispatch]
// }


const useContracts = (pool: string): any => {
    const { library } = useWeb3React()
    const [ contracts, setContracts ] = useState({})

    useEffect(() => {
        const contract = new ethers.Contract(pool, require("@curatem/contracts/abis/IBPool.json"), getSigner(library))
        const erc20 = new ethers.Contract('0x0000000000000000000000000000000000000000', ERC20, getSigner(library))

        setContracts({
            contract,
            erc20
        })
    }, [pool])
    
    return contracts
    // return { contract, erc20 }
}

export function BalancerSwapper(props: any) {
    const { tokens, pool } = props
    if(pool == '0x0000000000000000000000000000000000000000') {
        throw new Error("pool not exist")
    }

    // const state = useSelector<any, any>(state => state.balancerSwapper)
    // const dispatch = useDispatch()
    const [ state, dispatch ] = useReducerWithThunk(slice.reducer, initialState)

    const { contract, erc20 } = useContracts(props.pool)

    useEffect(() => {
        if(contract != null)
            dispatch(initialise(contract, erc20, tokens))
    }, [ dispatch, contract, erc20 ])
    
    const onNumberInputChange1 = useCallback(debounce(
        function onNumberInputChange1(valueString: string) {
            if(valueString == "") return
            
            const parse = (val: string) => val.replace(/^\$/, "")
            const amountEtherFormat = parse(valueString)
            dispatch(calculate(
                contract,
                erc20,
                toWei(amountEtherFormat).toString()
            ))
        },
        350
    ), [ dispatch, contract, erc20 ])

    const doSwap = () => {
        dispatch(executeSwap(contract))
    }

    const doApprove = () => {
        dispatch(executeApprove(contract, erc20))
    }
        
    
    function selectToken(ev: React.ChangeEvent<HTMLSelectElement>) {
        dispatch(selectFromToken({
            fromToken: ev.target.value
        }))
        dispatch(calculate(
            contract,
            erc20,
            state.amountIn
        ))
    }

    if(!state.ready) return <></>

    return <div>
        <Row>
            {/* <strong>From</strong> {state.tokenInfo[state.fromToken]?.name || ''} ({ shortenAddress(state.fromToken) }) */}
            {/* <TokenSelector onChange={selectToken}/> */}
            <Row>
            <strong>From</strong>
            <Select 
                variant="unstyled"
                // value={`${state.tokenInfo[state.fromToken]?.name || ''} (${ shortenAddress(state.fromToken) })}`}
                // TODO: why is value not showing properly?
                onChange={selectToken}>
                {tokens.map((token: string) =>
                    <option key={token} value={token}>{ state.tokenInfo[token]?.name }</option>
                )}
            </Select>
            </Row>
            
            <Row>
            <NumberInput
                inputMode="numeric"
                clampValueOnBlur={false}
                defaultValue={fromWei(state.amountIn)}
                onChange={onNumberInputChange1}>
                <NumberInputField />
            </NumberInput>
            </Row>
        </Row>

        <Row>
            <strong>To</strong> {state.tokenInfo[state.toToken]?.name || ''} ({ shortenAddress(state.toToken) })
            <NumberInput
                value={fromWei(state.amountOut)}>
                <NumberInputField />
            </NumberInput>
        </Row>

        <Row>
            {
                state.needsApproval 
                ? <Button onClick={doApprove}>Approve</Button>
                : <Button onClick={doSwap}>Swap</Button>
            }

            { state.swapError }
            { state.approveError }
        </Row>
        { state.loading && 'Loading' }
    </div>
}