const Router = require('express').Router
const { launch, interaction, dial } = require('./handler')

const router = new Router()

router.post('/interaction', async (req, res) => {
  const { Called, Caller, SpeechResult, Digits } = req.body
  res.send(await interaction(Called, Caller, SpeechResult, Digits))
})

router.post('/launch', async (req, res) => {
  const { Called, Caller } = req.body
  res.send(await launch(Called, Caller))
})

router.post('/test', async (req, res) => {
  const { question } = req.body
  res.send(await test(question))
})

module.exports = router
