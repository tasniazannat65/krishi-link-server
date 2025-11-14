const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");
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



const serviceAccount = require("./fasal-bridge-firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


app.get('/', (req, res)=>{
    res.send('fasal-bridge server is running successfully');
})


const verifyFirebaseToken = async(req, res, next)=>{
  const authorization = req.headers.authorization;
  

  
  if(!authorization){
    return res.status(401).send({
      message: 'Unauthorized access.'
    })
  }
  const token = authorization.split(' ')[1]
  try{
    await admin.auth().verifyIdToken(token)
    next()
  }
  catch(error){
    res.status(401).send({
      message: 'Unauthorized access.'
    })

  }
}

async function run() {
  try {
    await client.connect();

    const db = client.db('fasalbridge_db');
    const cropsCollection = db.collection('crops');
    const usersCollection = db.collection('users');
   app.get('/crops', async(req, res)=>{
    const cursor = cropsCollection.find();
    const result = await cursor.toArray();
    res.send(result);
   })

   app.get('/latest-crops', async(req, res)=>{
    const cursor = cropsCollection.find().sort({_id: -1}).limit(6);
    const result = await cursor.toArray();
    res.send(result);
   })

   app.get('/search', async(req, res)=>{
    const search_text = req.query.search;
    const result = await cropsCollection.find({name: {$regex: search_text, $options: 'i'}}).toArray();
    res.send(result);
   })

   app.get('/hero-slider', async(req, res)=>{
    const cursor = cropsCollection.find().sort({_id: 1}).limit(6);
    const result = await cursor.toArray();
    res.send(result);
   })

   app.post('/register-user', async(req, res)=>{
    const newUser = req.body;
    const result = await usersCollection.insertOne(newUser);
    res.send(result);
   })
   
   app.post('/crops', async(req, res)=>{
    const newCrop = req.body;
    const result = await cropsCollection.insertOne(newCrop);
    res.send(result);
   })

   app.get('/crops/:id', verifyFirebaseToken, async(req, res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await cropsCollection.findOne(query);
    res.send(result);
   })

   app.get('/my-posts', verifyFirebaseToken, async(req, res)=>{
    const email = req.query.email;
    const result = await cropsCollection.find({"owner.ownerEmail": email}).toArray();
    res.send(result);
   })

   app.put('/crops/:id', verifyFirebaseToken, async(req, res)=>{
    const updatedCrops = req.body;
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const update = {
      $set: updatedCrops
    }
    const result = await cropsCollection.updateOne(query, update);
    res.send(result);
   })

   app.delete('/crops/:id', verifyFirebaseToken, async(req, res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await cropsCollection.deleteOne(query);
    res.send(result);
   })

   app.put('/users/:id', verifyFirebaseToken, async(req, res)=>{
    const updateUserProfile = req.body;

    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const update = {
      $set: updateUserProfile
    }


    const result = await usersCollection.updateOne(query, update);
    res.send(result);
   })


    app.get('/users', verifyFirebaseToken, async(req, res)=>{
    const email = req.query.email;
    const result = await usersCollection.findOne({email: email});
    res.send(result);
   })

   app.post('/crops/:id/interest', verifyFirebaseToken, async(req, res)=>{
    const id = req.params.id;
    const interestedData = req.body;
    const interestId = new ObjectId();
    const newInterest = {_id: interestId, ...interestedData};
    const result = await cropsCollection.updateOne(
      {_id: new ObjectId(id)},
      {$push: {interests: newInterest}}
    )
    res.send(result);
   })

   app.put('/crops/:id/interest/:interestId', verifyFirebaseToken, async(req, res)=>{
    const {id, interestId} = req.params;
    const {status} = req.body;
    const crop = await cropsCollection.findOne({_id: new ObjectId(id)});
    const interestData = crop.interests.find(interest=>interest._id.toString() === interestId);
    const updateInterest = {'interests.$.status': status};
    if(status === 'accepted'){
      const newQuantity = crop.quantity - interestData.quantity;
      updateInterest.quantity = newQuantity >= 0 ? newQuantity : 0;
    }

    const result = await cropsCollection.updateOne({
      _id: new ObjectId(id), 'interests._id': new ObjectId(interestId)},
     {$set: updateInterest}
    )
    res.send(result);

   })

   app.get('/my-interests', verifyFirebaseToken, async(req, res)=>{
    const userEmail = req.query.email;
    const result = await cropsCollection.find({"interests.userEmail": userEmail}).toArray();
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