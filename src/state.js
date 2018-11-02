const { promisify } = require("util")

class State {
  constructor({ redisClient, swapsName, reputationName }) {
    this.redisClient = redisClient
    this.swapsName = swapsName
    this.reputationName = reputationName

    this.get = promisify(this.redisClient.get).bind(this.redisClient)
    this.hgetall = promisify(this.redisClient.hgetall).bind(this.redisClient)
    this.lrange = promisify(this.redisClient.lrange).bind(this.redisClient)
  }

  async fetchReputation(address) {
    const reputation = await this.get(`${this.reputationName}:${address}`)

    return reputation
  }

  async fetchSwap(swapSecretHash) {
    let swap = {
      status: 'waiting'
    }

    const swapDepositEvent = await this.hgetall(`${this.swapsName}:${swapSecretHash}:deposit`)
    const swapWithdrawEvent = await this.hgetall(`${this.swapsName}:${swapSecretHash}:withdraw`)
    const swapRefundEvent = await this.hgetall(`${this.swapsName}:${swapSecretHash}:refund`)

    if (swapDepositEvent) {
      const buyerAddress = swapDepositEvent.buyer
      const sellerAddress = swapDepositEvent.seller

      const buyerReputation = await this.fetchReputation(buyerAddress)
      const sellerReputation = await this.fetchReputation(sellerAddress)

      swap.alice = {
        from: {
          address: sellerAddress,
          reputation: sellerReputation
        }
      }

      swap.bob = {
        to: {
          address: buyerAddress,
          reputation: buyerReputation
        }
      }
    }

    if (swapWithdrawEvent) {
      swap.status = 'success'
    }

    if (swapRefundEvent) {
      swap.status = 'refund'
    }

    return swap
  }

  async fetchSwaps({ from = 0, limit = 0 } = {}) {
    let swaps = []

    let hasEnded = false
    let index = from
    while(!hasEnded) {
      const swapSecretHash = await this.lrange(this.swapsName, index, index)

      if (swapSecretHash[0]) {
        const swap = await this.fetchSwap(swapSecretHash[0])
        swaps.push(swap)

        if (limit === 0 || swaps.length < limit) {
          index++
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
