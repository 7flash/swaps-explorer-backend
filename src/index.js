const app = require('./app')
const config = require('./config')

app.listen(config.port, () => {
  console.log(`/state is available at port ${config.port}`)
})