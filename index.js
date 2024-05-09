const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app  = express();
require('dotenv').config()
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin:['http://localhost:5173','https://car-doctor-64025.web.app','https://car-doctor-64025.firebaseapp.com'],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());


console.log(process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t86vw4m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
console.log(uri);
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middle ware
const logger = async(req, res, next) =>{
  console.log('called',req.host ,req.originalUrl);
  next();
}

const verifyToken = async(req,res,next)=>{
  const token = req.cookies?.token;
  console.log('value of token',token);
  if(!token){
    return res.status(401).send({massage:'forbidden'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECREAT,(err,decoded)=>{
    //error
  if(err){
    console.log(err);
    return res.status(401).send({massage:'unauthorized'})
  }

    //decoding

    console.log('value odf decodimg',decoded);
    req.user = decoded;
    next();
  })
}

const cookieOption={
  httpOnly:true,
  secure:process.env.NODE_ENV === 'production' ? true : false,
  sameSite:process.env.NODE_ENV === 'production' ? 'none':'strict'
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    
    const serviceCollection = client.db('carDoc').collection('services');
    const bookingCoolection = client.db('carDoc').collection('bookings')
 

//auth related api
app.post('/jwt',logger, async(req,res)=>{
  const user = req.body;
  console.log(user);
  const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECREAT,{expiresIn:'1h'})

  res
  .cookie('token',token,cookieOption)
  .send({success :true})
})

    app.get('/services',logger,async(req,res)=>{
    const cursor= serviceCollection.find();
    const result = await cursor.toArray();
    res.send(result);

 })

 app.get('/services/:id',async(req,res)=>{
   const id = req.params.id;
   const query = {_id:new ObjectId(id)}
   const options = {
    projection: { title: 1, price: 1 ,service_id:1 , img: 1},
  };
   const result = await serviceCollection.findOne(query,options)
   res.send(result)
 })


 //booking


 app.get('/bookings',logger,verifyToken,async(req,res)=>{
  console.log(req.query.email);
  console.log('user in valid tokrn',req.user);
  if(req.query.email !== req.user.email){
    return res.status(403).send({massage :'forbidden'})
  }
  // console.log('token find',req.cookies.token);
  let query = {};
if(req.query?.email){
  query ={email: req.query.email}
}
  const result = await bookingCoolection.find(query).toArray();
  res.send(result);
 })

 app.post('/bookings',async(req,res)=>{
  const booking = req.body;
  console.log(booking);
  const result = await bookingCoolection.insertOne(booking);
  res.send(result);

 });

app.patch('/bookings/:id',async(req,res)=>{
  const id = req.params.id;
  const filter ={_id:new ObjectId(id) }
  const updated = req.body;
  console.log(updated);
const updateDoc = {

  $set:{
    status : updated.status
  },
};
const result = await bookingCoolection.updateOne(filter,updateDoc);
res.send(result);

})


 app.delete('/bookings/:id',async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await bookingCoolection.deleteOne(query);
  res.send(result)
 })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/',(req,res)=>{
    res.send('doctor is running')
})


app.listen(port,()=>{
    console.log(`car doctor server is running${port}`);
})