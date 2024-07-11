const express = require('express')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const port = process.env.PORT || 5000;


// middleware
  app.use(cors());
  app.use(express.json());


  

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d6oiejw.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const brandCollection = client.db('BikeDB').collection('brand') 
    const productCollection = client.db('BikeDB').collection('product') 
    const cartCtCollection = client.db('BikeDB').collection('carts') 

    // barnd get
app.get('/brand', async (req, res)=>{
   const result = await brandCollection.find().toArray()
   res.send(result)
})

  // product get

app.get('/product', async (req, res)=>{
   const result = await productCollection.find().toArray()
   res.send(result)
})

// product info
app.get('/products/brand/:id', async (req, res)=>{
  const id = req.params.id;
  const result = await productCollection.find({brand: id.toLowerCase()}).toArray()
  res.send(result)

})

// product detail

app.get('/product/:id', async (req, res)=>{
  const id = req.params.id
  const result = await productCollection.findOne({_id: new ObjectId(id)})
  res.send(result)

})


// Shoping Cart Collection

app.post('/carts', async(req, res)=>{
   const cartItem = req.body;
   const result = await cartCtCollection.insertOne(cartItem)
   res.send(result)
})

// Shoping Cart Collection get

app.get('/carts', async(req, res)=>{
   const email = req.query.email
   const query = {email: email}
    const result = await cartCtCollection.find(query).toArray()
    res.send(result)
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




  app.get('/', (req, res) => {
    res.send('Hello from Bike Word..')
  })

  app.listen(port, () => {
    console.log(`Bike Word is running on port ${port}`)
  })







