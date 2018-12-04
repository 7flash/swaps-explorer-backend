const config = require('./config')

const redis = require("redis")
const redisClient = redis.createClient(config.redis)

const express = require("express")
const app = express()

const EthState = require('./state')
const state = new EthState({ redisClient, swapsName: config.ethSwaps, swapsBitcoinName: config.btcSwaps, reputationName: config.reputation })

const stateRouter = express.Router()

stateRouter.get('/ethbtc', async (req, res) => {
  const from = req.query.from || -1
  const limit = req.query.limit || 10

  const swaps = await state.fetchSwaps({ from, limit })

  res.json(swaps)
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

app.use('/state', stateRouter)

app.listen(config.port, () => {
  console.log(`/state is available at port ${config.port}`)
})
