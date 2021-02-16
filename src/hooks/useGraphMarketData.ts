import { Status } from '@chakra-ui/react'
// import gql from 'graphql-tag'
// import { useQuery } from '@apollo/react-hooks'
import { gql, useQuery } from '@apollo/client'
import { BigNumber } from 'ethers'
import { AnswerItem, BondItem, INVALID_ANSWER_ID, Question } from 'utils/types'
import Big from 'big.js'

import { useEffect, useState } from 'react'

function bigNumberify(val: any) {
    return BigNumber.from(val)
}

export const getOutcomes = (networkId: number, templateId: number) => {
    const isBinary = templateId === 0
    const isNuancedBinary = (networkId === 1 && templateId === 6) || (networkId === 4 && templateId === 5)
    const isScalar = templateId === 1
    if (isBinary || isNuancedBinary) {
      return ['No', 'Yes']
    } else if (isScalar) {
      return []
    } else {
      throw new Error(`Cannot get outcomes for network '${networkId}' and template id '${templateId}'`)
    }
  }

const query = gql`
  query GetMarket($id: ID!) {
    fixedProductMarketMaker(id: $id) {
      id
      creator
      collateralToken
      fee
      collateralVolume
      outcomeTokenAmounts
      outcomeTokenMarginalPrices
      condition {
        id
        payouts
        oracle
      }
      templateId
      title
      outcomes
      category
      language
      lastActiveDay
      runningDailyVolume
      arbitrator
      creationTimestamp
      openingTimestamp
      timeout
      resolutionTimestamp
      currentAnswer
      currentAnswerTimestamp
      currentAnswerBond
      answerFinalizedTimestamp
      scaledLiquidityParameter
      runningDailyVolumeByHour
      isPendingArbitration
      arbitrationOccurred
      runningDailyVolumeByHour
      curatedByDxDao
      curatedByDxDaoOrKleros
      question {
        id
        data
        answers {
          answer
          bondAggregate
        }
      }
      klerosTCRregistered
      curatedByDxDaoOrKleros
      curatedByDxDao
      submissionIDs {
        id
        status
      }
      scalarLow
      scalarHigh
    }
  }
`

type GraphResponseFixedProductMarketMaker = {
  id: string
  answerFinalizedTimestamp: Maybe<string>
  arbitrator: string
  category: string
  collateralToken: string
  collateralVolume: string
  condition: {
    id: string
    payouts: Maybe<string[]>
    oracle: string
  }
  creator: string
  currentAnswer: string
  fee: string
  lastActiveDay: string
  runningDailyVolume: string
  language: string
  creationTimestamp: string
  openingTimestamp: string
  outcomeTokenAmounts: string[]
  outcomeTokenMarginalPrices: string[]
  outcomes: Maybe<string[]>
  isPendingArbitration: boolean
  arbitrationOccurred: boolean
  currentAnswerTimestamp: string
  currentAnswerBond: Maybe<BigNumber>
  runningDailyVolumeByHour: BigNumber[]
  question: {
    id: string
    data: string
    answers: {
      answer: string
      bondAggregate: BigNumber
    }[]
  }
  resolutionTimestamp: string
  templateId: string
  timeout: string
  title: string
  scaledLiquidityParameter: string
  klerosTCRregistered: boolean
  curatedByDxDao: boolean
  curatedByDxDaoOrKleros: boolean
//   submissionIDs: KlerosSubmission[]
  scalarLow: Maybe<string>
  scalarHigh: Maybe<string>
}

type GraphResponse = {
  fixedProductMarketMaker: Maybe<GraphResponseFixedProductMarketMaker>
}

export type GraphMarketMakerData = {
  address: string
  answerFinalizedTimestamp: Maybe<BigNumber>
  arbitratorAddress: string
  collateralAddress: string
  creationTimestamp: string
  collateralVolume: BigNumber
  creator: string
  lastActiveDay: number
  dailyVolume: BigNumber
  conditionId: string
  payouts: Maybe<Big[]>
  fee: BigNumber
  question: Question
  scaledLiquidityParameter: number
  klerosTCRregistered: boolean
  curatedByDxDao: boolean
  curatedByDxDaoOrKleros: boolean
  runningDailyVolumeByHour: BigNumber[]
//   submissionIDs: KlerosSubmission[]
  oracle: string
  scalarLow: Maybe<BigNumber>
  scalarHigh: Maybe<BigNumber>
  outcomeTokenMarginalPrices: string[]
}

type Result = {
  marketMakerData: Maybe<GraphMarketMakerData>
}

const getBondedItems = (outcomes: string[], answers: AnswerItem[]): BondItem[] => {
  const bondedItems: BondItem[] = outcomes.map((outcome: string, index: number) => {
    const answer = answers.find(
      answer => answer.answer !== INVALID_ANSWER_ID && BigNumber.from(answer.answer).toNumber() === index,
    )
    if (answer) {
      return {
        outcomeName: outcome,
        bondedEth: BigNumber.from(answer.bondAggregate),
      } as BondItem
    }
    return {
      outcomeName: outcome,
      bondedEth: BigNumber.from(0),
    }
  })

  const invalidAnswer = answers.find(answer => answer.answer === INVALID_ANSWER_ID)

  bondedItems.push({
    outcomeName: 'Invalid',
    bondedEth: invalidAnswer ? BigNumber.from(invalidAnswer.bondAggregate) : BigNumber.from(0),
  })

  // add invalid outcome

  return bondedItems
}

const wrangleResponse = (data: GraphResponseFixedProductMarketMaker, networkId: number): GraphMarketMakerData => {
  const outcomes = data.outcomes ? data.outcomes : getOutcomes(networkId, +data.templateId)
  debugger

  return {
    address: data.id,
    answerFinalizedTimestamp: data.answerFinalizedTimestamp ? bigNumberify(data.answerFinalizedTimestamp) : null,
    arbitratorAddress: data.arbitrator,
    collateralAddress: data.collateralToken,
    creationTimestamp: data.creationTimestamp,
    collateralVolume: bigNumberify(data.collateralVolume),
    creator: data.creator,
    lastActiveDay: Number(data.lastActiveDay),
    dailyVolume: bigNumberify(data.runningDailyVolume),
    conditionId: data.condition.id,
    payouts: data.condition.payouts ? data.condition.payouts.map(payout => new Big(payout)) : null,
    oracle: data.condition.oracle,
    fee: bigNumberify(data.fee),
    scaledLiquidityParameter: parseFloat(data.scaledLiquidityParameter),
    runningDailyVolumeByHour: data.runningDailyVolumeByHour,
    question: {
      id: data.question.id,
      templateId: +data.templateId,
      raw: data.question.data,
      title: data.title,
      category: data.category,
      resolution: new Date(1000 * +data.openingTimestamp),
      arbitratorAddress: data.arbitrator,
      outcomes,
      isPendingArbitration: data.isPendingArbitration,
      arbitrationOccurred: data.arbitrationOccurred,
      currentAnswerTimestamp: data.currentAnswerTimestamp ? bigNumberify(data.currentAnswerTimestamp) : null,
      currentAnswerBond: data.currentAnswerBond,
      answers: data.question.answers,
      bonds: getBondedItems(outcomes, data.question.answers),
    },
    curatedByDxDao: data.curatedByDxDao,
    klerosTCRregistered: data.klerosTCRregistered,
    curatedByDxDaoOrKleros: data.curatedByDxDaoOrKleros,
    // submissionIDs: data.submissionIDs,
    scalarLow: data.scalarLow ? bigNumberify(data.scalarLow || 0) : null,
    scalarHigh: data.scalarHigh ? bigNumberify(data.scalarHigh || 0) : null,
    outcomeTokenMarginalPrices: data.outcomeTokenMarginalPrices,
  }
}

let needRefetch = false

/**
 * Get data from the graph for the given market maker. All the information returned by this hook comes from the graph,
 * other necessary information should be fetched from the blockchain.
 */
export const useGraphMarketMakerData = (marketMakerAddress: string, networkId: number): Result => {
  const [marketMakerData, setMarketMakerData] = useState<Maybe<GraphMarketMakerData>>(null)

  const { data, error, loading, refetch } = useQuery<GraphResponse>(query, {
    variables: { id: marketMakerAddress },
  })

  useEffect(() => {
    if (data && data.fixedProductMarketMaker && data.fixedProductMarketMaker.id === marketMakerAddress) {
      const rangledValue = wrangleResponse(data.fixedProductMarketMaker, networkId)
      setMarketMakerData(rangledValue)
    }
  }, [data])

  return {
    marketMakerData: error ? null : marketMakerData,
  }
}