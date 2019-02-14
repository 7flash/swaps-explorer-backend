const { promisify } = require("util")

class State {
  constructor({ redisClient, swapsName, swapsBitcoinName, swapsTokensName, reputationName }) {
    this.redisClient = redisClient
    this.swapsName = swapsName
    this.swapsBitcoinName = swapsBitcoinName
    this.swapsTokensName = swapsTokensName
    this.reputationName = reputationName

    this.get = promisify(this.redisClient.get).bind(this.redisClient)
    this.hgetall = promisify(this.redisClient.hgetall).bind(this.redisClient)
    this.lrange = promisify(this.redisClient.lrange).bind(this.redisClient)
    this.llen = promisify(this.redisClient.llen).bind(this.redisClient)
  }

  async fetchReputation(address) {
    const reputation = await this.get(`${this.reputationName}:${address}`)

    return Number.parseInt(reputation) || null
  }

  async fetchSwapRaw(swapSecretHash) {
    const bitcoin = await this.hgetall(`${this.swapsBitcoinName}:${swapSecretHash.replace(/^0x/, '')}`)

    const deposit = await this.hgetall(`${this.swapsName}:${swapSecretHash}:deposit`)
    const withdraw = await this.hgetall(`${this.swapsName}:${swapSecretHash}:withdraw`)
    const refund = await this.hgetall(`${this.swapsName}:${swapSecretHash}:refund`)

    const tokensDeposit = await this.hgetall(`${this.swapsTokensName}:${swapsSecretHash}:deposit`)
    const tokensWithdraw = await this.hgetall(`${this.swapsTokensName}:${swapsSecretHash}:withdraw`)
    const tokensRefund = await this.hgetall(`${this.swapsTokensName}:${swapsSecretHash}:refund`)

    return {
      bitcoin, deposit, withdraw, refund, tokensDeposit, tokensWithdraw, tokensRefund
    }
  }

  async aggregateSwap({ swapBitcoin, swapDepositEvent, swapWithdrawEvent, swapRefundEvent }) {
    const swapAggregated = {
      status: 'waiting',
      alice: {},
      bob: {}
    }

    if (swapDepositEvent) {
      const buyerAddress = swapDepositEvent.buyer
      const sellerAddress = swapDepositEvent.seller
      const value = swapDepositEvent.value

      const buyerReputation = await this.fetchReputation(buyerAddress)
      const sellerReputation = await this.fetchReputation(sellerAddress)

      swapAggregated.alice = {
        asset: 'ETH',
        value: value,
        from: {
          address: sellerAddress,
          reputation: sellerReputation
        }
      }

      swapAggregated.bob = {
        asset: 'BTC',
        to: {
          address: buyerAddress,
          reputation: buyerReputation
        }
      }
    }

    if (swapWithdrawEvent) {
      swapAggregated.status = 'success'
    }

    if (swapRefundEvent) {
      swapAggregated.status = 'refund'
    }

    if (swapBitcoin) {
      const { buyer: buyerAddress, seller: sellerAddress, secret, secretHash, timeLock, withdrawTx, fundingAddress, withdrawFee, value } = swapBitcoin

      const buyerReputation = await this.fetchReputation(buyerAddress)
      const sellerReputation = await this.fetchReputation(sellerAddress)

      swapAggregated.alice = { ...swapAggregated.alice, ...{
        to: {
          address: buyerAddress,
          reputation: buyerReputation
        }
      }}

      swapAggregated.bob = { ...swapAggregated.bob, ...{
        value: value,
        fee: withdrawFee,
        from: {
          address: sellerAddress,
          reputation: sellerReputation
        },
        transactions: { withdrawTx, fundingAddress }
      }}
    }

    return swapAggregated
  }

  async fetchTokensSwap(swapSecretHash) {
    const {
      bitcoin: swapBitcoin,
      tokensDeposit: swapDepositEvent,
      tokensWithdraw: swapWithdrawEvent,
      tokensRefund: swapRefundEvent
    }

    const aggregatedSwap = await aggregateSwap({ swapBitcoin, swapDepositEvent, swapWithdrawEvent, swapRefundEvent })

    return {
      ...aggregatedSwap,
      alice: {
        ...aggregatedSwap.alice,
        asset: 'Token'
      }
    }
  }

  async fetchSwap(swapSecretHash) {
    const {
      bitcoin: swapBitcoin,
      deposit: swapDepositEvent,
      withdraw: swapWithdrawEvent,
      refund: swapRefundEvent
    } = await this.fetchSwapRaw(swapSecretHash)

    return aggregateSwap({ swapBitcoin, swapDepositEvent, swapWithdrawEvent, swapRefundEvent })
  }

  async fetchTokensSwaps({ from = -1, limit = 0 } = {}) {
    return fetchSwaps({
      fetchSwap: this.fetchTokensSwap,
      swapsName: this.swapsTokensName,
      from, limit
    })
  }

  async fetchEthereumSwaps({ from = -1, limit = 0 } = {}) {
    return fetchSwaps({
      fetchSwap: this.fetchSwap,
      swapsName: this.swapsName,
      from, limit
    })
  }

  async fetchSwaps({ from = -1, limit = 0, swapsName, fetchSwap } = {}) {
    let swaps = []

    let index = from
    if (from === -1) {
      index = await this.llen(swapsName) - 1
    }

    let hasEnded = false

    while(!hasEnded) {
      const swapSecretHash = await this.lrange(swapsName, index, index)

      if (swapSecretHash[0]) {
        const swap = await fetchSwap(swapSecretHash[0])

        swaps.push(swap)

        if ((limit === 0 || swaps.length < limit) && (from !== -1 || index > 0)) {
          if (from == -1) {
            index--
          } else {
            index++
          }
        } else {
          hasEnded = true
        }
      } else {
        hasEnded = true
      }

    }

    return swaps
  }
}

module.exports = State
