const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASSWORD}@cluster0.gwyrdqg.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


app.get('/', (req, res)=>{
    res.send('fasal-bridge server is running successfully');
})

async function run() {
  try {
    await client.connect();

    const db = client.db('fasalbridge_db');
    const cropsCollection = db.collection('crops');
   app.get('/crops', async(req, res)=>{
    const cursor = cropsCollection.find();
    const result = await cursor.toArray();
    res.send(result);
   })

   app.get('/latest-crops', async(req, res)=>{
    const cursor = cropsCollection.find().sort({posted_date: -1}).limit(6);
    const result = await cursor.toArray();
    res.send(result);
   })

   app.get('/search', async(req, res)=>{
    const search_text = req.query.search;
    const result = await cropsCollection.find({name: {$regex: search_text, $options: 'i'}}).toArray();
    res.send(result);
   })

   

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, ()=>{
    console.log(`fasal-bridge server is running on port: ${port}`);
    
})