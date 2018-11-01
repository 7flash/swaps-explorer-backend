const { promisify } = require("util")

const randomSwaps = (count) => {
  let result = []

  for (let i = 0; i < count; i++) {
    const buyer = EthCrypto.createIdentity().address
    const seller = EthCrypto.createIdentity().address
    const value = Math.round(Math.random() * 1000).toString()

    result.push({ buyer, seller, value })
  }

  return result
}

const setupMockDatabase = async ({ redisClient, swaps, swapsName, reputationName }) => {
  const hmset = promisify(redisClient.hmset).bind(redisClient)
  const incrby = promisify(redisClient.INCRBY).bind(redisClient)

  for (let i = 0; i < swaps.length; i++) {
    const buyer = swaps[i]['buyer']
    const seller = swaps[i]['seller']

    await hmset(`${swapsName}:${i}`, swaps[i])
    await incrby(`${reputationName}:${buyer}`, 1)
    await incrby(`${reputationName}:${seller}`, 1)
  }
}

const setupMockDatabase = async ({ redisClient }) => {
  await hmset(`ethbtc:0`, {
    buyer: '0x1',
    seller: '0x2',
    value: '100'
  })

  await hmset(`btceth:0`, {
    buyer:
  })
}

const swaps = ({ count }) => {

}


const expectedResponses = ({ swaps }) => {

}

module.exports = { setupMockDatabase, randomSwaps, expectedResponses }