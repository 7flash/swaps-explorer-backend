const EthCrypto = require("eth-crypto")
const sinon = require("sinon")
const expect = require("chai").expect
const redis = require("fakeredis")
const { promisify } = require("util")
const crypto = require("crypto")

const randomSwaps = (count) => {
  let result = []

  for (let i = 0; i < count; i++) {
    const buyer = EthCrypto.createIdentity().address
    const seller = EthCrypto.createIdentity().address
    const value = Math.round(Math.random() * 1000).toString()
    const secretHash = crypto.randomBytes(32).toString('hex')

    const btc = { buyer, seller, secret: '0x1', secretHash, timeLock: 10, withdrawTx: '0x1', fundingAddress: buyer, withdrawFee: 10, value }

    result.push({ buyer, seller, value, secretHash, btc })
  }

  return result
}

const setupMockDatabase = async ({ redisClient, swaps, swapsName, reputationName }) => {
  const hmset = promisify(redisClient.hmset).bind(redisClient)
  const incrby = promisify(redisClient.INCRBY).bind(redisClient)
  const rpush = promisify(redisClient.rpush).bind(redisClient)

  for (let i = 0; i < swaps.length; i++) {
    const { buyer, seller, secretHash, value } = swaps[i]

    await rpush(swapsName, secretHash)

    await hmset(`${swapsName}:${swaps[i].btc.secretHash.replace(/^0x/, '')}`, swaps[i].btc)
    await hmset(`${swapsName}:${secretHash}:deposit`, { buyer, seller, value, secretHash })
    await hmset(`${swapsName}:${secretHash}:withdraw`, { buyer, seller })

    await incrby(`${reputationName}:${buyer}`, 1)
    await incrby(`${reputationName}:${seller}`, 1)
  }
}

const expectedResponse = (swaps) => {
  const response = swaps.map((swap) => {
    const { buyer, seller, value } = swap
    const { buyer: buyerBtc, seller: sellerBtc, value: valueBtc, withdrawFee } = swap.btc

    return {
      status: 'success',
      alice:{
        asset: 'ETH',
        value: value,
        from: {
          address: seller,
          reputation: 1
        },
        to: {
          address: buyerBtc,
          reputation: 1
        }
      },
      bob: {
        asset: 'BTC',
        value: valueBtc,
        fee: `${withdrawFee}`,
        to: {
          address: buyer,
          reputation: 1
        },
        from: {
          address: sellerBtc,
          reputation: 1
        },
        transactions: {
          withdrawTx: '0x1',
          fundingAddress: buyerBtc
        }
      },
    }
  }).reverse()

  return response
}

const State = require('../src/state')

describe('Swaps', () => {
  const swapsName = 'ethbtc'
  const reputationName = 'swaps'

  let redisClient = null
  let swaps = null

  before(async () => {
    redisClient = redis.createClient({ fast: true })

    swaps = randomSwaps(10)
    // swaps.push({ ...swaps[0] })
    await setupMockDatabase({ redisClient, swaps, swapsName, reputationName })
  })

  describe('Ratings State', () => {
    it('should fetch reputation of ethereum address from redis database', async () => {
      const state = new State({ redisClient, reputationName })

      const reputation2 = await state.fetchReputation(swaps[0].buyer)
      const reputation1 = await state.fetchReputation(swaps[1].buyer)

      expect(reputation2).to.be.equal(1)
      expect(reputation1).to.be.equal(1)
    })

    it('should return null when fetching bitcoin address', async () => {
      const state = new State({ redisClient, reputationName })

      const reputation = await state.fetchReputation('1C77sWp5AJoHzL7CF7Ccvqb1CMuPsWmMgG')

      expect(reputation).to.be.equal(null)
    })
  })

  describe('Swaps State', () => {
    it('shold fetch all ETHBTC swaps from redis database', async () => {
      const state = new State({ redisClient, swapsName, swapsBitcoinName: swapsName, reputationName })

      const result = await state.fetchSwaps()

      expect(result).to.be.deep.equal(expectedResponse(swaps))
    })

    it('should fetch range of ETHBTC swaps from redis database', async () => {
      const state = new State({ redisClient, swapsName, swapsBitcoinName: swapsName, reputationName })

      const result = await state.fetchSwaps({ from: 1, limit: 1 })

      expect(result).to.be.deep.equal(expectedResponse([{ ...swaps[1] }, ]))
    })
  })

  describe('Swaps API', () => {
    it('should fetch swaps from redis database with additional information from external resources', () => {
    })
  })
})
