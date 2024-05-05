const SmeeClient = require('smee-client')
require('dotenv').config();
const smee = new SmeeClient({
  source: process.env.SMEE_URL,
  target: `http://localhost:${process.env.PORT}/webhook`,
  logger: console
})

const events = smee.start()

// Stop forwarding events
// events.close()