const proxyquire = require("proxyquire")
const expect = require("chai").expect
const request = require("supertest")
const redis = require("fakeredis")
const config = require('../src/config')
const setupMockDatabase = require('./setupMockDatabase')
const app = proxyquire('../src/app.js', {
  'redis': redis
})

const example = {
  swaps: [
    {
      id: 'txid',
      status: 'success',
      started: 'date of creation',
      ended: 'date of withdrawal',
      rate: 'amount of eth per btc',
      buyer: {
        asset: 'BTC',
        value: 'bitcoin value (satoshi)',
        buyerFee: 'tx fee for funding',
        sellerFee: 'tx fee for withdrawal',
        from: {
          address: 'buyer-bitcoin-address',
          rating: 'integer'
        },
        to: {
          address: 'seller-bitcoin-address',
          rating: 'integer'
        }
      },
      seller: {
        asset: 'ETH',
        value: 'eth value (wei)',
        fee: 'eth total fee (wei)',
        from: {
          address: 'seller-eth-address',
          rating: 'integer'
        },
        to: {
          address: 'buyer-eth-address',
          rating: 'integer'
        }
      }
    }
  ]
}

const expected = {
  ethbtc: [
    {

    }
  ]
}

describe('API Integration tests', () => {
  let redisClient
  let server

  before(async () => {
    server = app.listen(config.port)

    // return the same instance that is being used in app
    redisClient = redis.createClient(config.redis)

    await setupMockDatabase({ redisClient, })
  })

  describe('/state/ethbtc', () => {
    it('should respond with json', async () => {
      await request(app)
        .get('/state/ethbtc')
        .expect(200, expected.ethbtc)
    })
  })

  describe('/state/btceth', () => {

  })

  describe('/state/reputation/:address', () => {

  })

  describe('/api/ethbtc', () => {

  })

  after(() => {
    server.close()
  })
})