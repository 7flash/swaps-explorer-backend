const EthCrypto = require("eth-crypto")
const sinon = require("sinon")
const expect = require("chai").expect
const redis = require("fakeredis")
const setupMockDatabase = require('./setupMockDatabase')
const State = require('../src/state')

describe('Swaps', () => {
  const swapsName = 'ethbtc'
  const reputationName = 'swaps'

  let redisClient = null
  let swaps = null

  before(async () => {
    redisClient = redis.createClient({ fast: true })

    swaps = randomSwaps(10)
    swaps.push({ ...swaps[0] })
    await setupMockDatabase({ redisClient, swaps, swapsName, reputationName })
  })

  describe('Ratings State', () => {
    it('should fetch reputation of ethereum address from redis database', async () => {
      const state = new State({ redisClient, reputationName })

      const reputation2 = await state.fetchReputation(swaps[0].buyer)
      const reputation1 = await state.fetchReputation(swaps[1].buyer)

      expect(reputation2).to.be.equal(2)
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
      const state = new State({ redisClient, swapsName })

      const result = await state.fetchSwaps()

      expect(result).to.be.deep.equal(swaps)
    })

    it('should fetch range of ETHBTC swaps from redis database', async () => {
      const state = new State({ redisClient, swapsName })

      const result = await state.fetchSwaps({ from: 8, limit: 2 })

      expect(result).to.be.deep.equal([{ ...swaps[8] }, { ...swaps[9] }])
    })
  })

  describe('Swaps API', () => {
    it('should fetch swaps from redis database with additional information from external resources', () => {
    })
  })
})