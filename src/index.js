const config = require('./config')

const redis = require("redis")
const redisClient = redis.createClient(config.redis)

const express = require("express")
const bodyParser = require('body-parser')
const app = express()

const EthState = require('./state')
const state = new EthState({ redisClient, swapsName: config.ethSwaps, swapsBitcoinName: config.btcSwaps, reputationName: config.reputation })

const stateRouter = express.Router()

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(config.web3))

app.use(bodyParser.json())

stateRouter.get('/ethbtc', async (req, res) => {
  const from = req.query.from || -1
  const limit = req.query.limit || 10

  const swaps = await state.fetchSwaps({ from, limit })

  res.json(swaps)
})

stateRouter.get('/swap/:secretHash', async (req, res) => {
  const secretHash = req.params.secretHash.toString()

  const swap = await state.fetchSwapRaw(secretHash)

  res.json({ swap })
})

stateRouter.get('/reputation/:address', async (req, res) => {
  let address = req.params.address.toString()
  if (address.startsWith('0x')) {
    address = address.toLowerCase()
  }

  let reputation = await state.fetchReputation(address)
  if (Number.parseInt(reputation)) {
    reputation = Number.parseInt(reputation)
  } else {
    reputation = 0
  }

  res.json({
    address, reputation
  })
})

stateRouter.post('/reputation/', async (req, res) => {
  const { address, addressOwnerSignature } = req.body

  // todo: recover signature, whether it is eth or btc

  const addressFormatted = address.startsWith('0x') ? address.toLowerCase() : address
  const reputation = await state.fetchReputation(addressFormatted)

  const hash = web3.utils.soliditySha3(JSON.stringify({ address, reputation }))
  const reputationOracleSignature = web3.eth.accounts.sign(hash, config.oraclePrivateKey).signature

  res.json({ address, reputation, reputationOracleSignature })
})

app.use('/state', stateRouter)

app.listen(config.port, () => {
  console.log(`/state is available at port ${config.port}`)
})
