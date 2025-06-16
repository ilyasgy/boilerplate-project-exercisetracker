const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

// Basic middleware
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('public'))

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// --- Add your code below ---

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

// Schemas and Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
})

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body
    const newUser = new User({ username })
    const savedUser = await newUser.save()
    res.json({ username: savedUser.username, _id: savedUser._id })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('username _id')
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Add exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params
    const { description, duration, date } = req.body
    const user = await User.findById(_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const exerciseDate = date ? new Date(date) : new Date()

    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    })
    const savedEx = await newExercise.save()

    res.json({
      username: user.username,
      description: savedEx.description,
      duration: savedEx.duration,
      _id: user._id,
      date: savedEx.date.toDateString()
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exercise' })
  }
})

// Get exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params
    const { from, to, limit } = req.query
    const user = await User.findById(_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    let filter = { userId: user._id }

    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from)
      if (to)   filter.date.$lte = new Date(to)
    }

    let query = Exercise.find(filter).select('description duration date')
    if (limit) query = query.limit(parseInt(limit))

    const logs = await query.exec()

    const logArr = logs.map(item => ({
      description: item.description,
      duration: item.duration,
      date: item.date.toDateString()
    }))

    res.json({
      username: user.username,
      count: logArr.length,
      _id: user._id,
      log: logArr
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// --- End of your code ---

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
