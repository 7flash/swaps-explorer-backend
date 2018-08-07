const { promisify } = require("util")

class State {
  constructor({ redisClient, swapsName, reputationName }) {
    this.redisClient = redisClient
    this.swapsName = swapsName
    this.reputationName = reputationName

    this.get = promisify(this.redisClient.get).bind(this.redisClient)
    this.hgetall = promisify(this.redisClient.hgetall).bind(this.redisClient)
  }

  async fetchReputation(address) {
    const reputation = await this.get(`${this.reputationName}:${address}`)

    return reputation
  }

  async fetchSwaps({ from = 0, limit = 0 } = {}) {
    let swaps = []

    let hasEnded = false
    let index = from
    while(!hasEnded) {
      const swap = await this.hgetall(`${this.swapsName}:${index}`)

      if (swap !== null) {
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