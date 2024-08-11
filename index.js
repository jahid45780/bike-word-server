const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const SSLCommerzPayment = require('sslcommerz-lts')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const { default: axios } = require('axios');
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

const store_id = process.env.STORE_ID
const store_passwd = process.env.STORE_PASS
const is_live = false //true for live, false for sandbox

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const brandCollection = client.db('BikeDB').collection('brand') 
    const productCollection = client.db('BikeDB').collection('product') 
    const cartCtCollection = client.db('BikeDB').collection('carts') 
    const userCollection = client.db('BikeDB').collection('users') 
    const OrderCollection = client.db('BikeDB').collection('order') 

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

 //  admin save a Product a database
 app.post('/product',  async (req, res)=>{
  const product = req.body
  const result = await productCollection.insertOne(product)
  res.send(result)
})

// admin save a product a database

app.post('/brand', async (req, res)=>{
    const brand = req.body
    const result = await brandCollection.insertOne(brand)
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

app.delete('/carts/:id', async(req, res)=>{
   const id = req.params.id
   const query = {_id: new ObjectId(id)}
   const result = await cartCtCollection.deleteOne(query)
   res.send(result)
})



// Save user DB
app.put('/users/:email', async (req, res) => {
  const email = req.params.email
  const user = req.body
  const query = {email: email}
  const options = {upsert: true}
  const  isExist = await userCollection.findOne(query)
  console.log('User found?----->', isExist)
  if(isExist) {
    if(user?.status === 'Requested'){
        const result = await userCollection.updateOne(
          query,
          {
            $set:user
          },
          options 
        )
        return res.send(result)
    } else{
      return res.send(isExist)
    }
  }
  const result = await userCollection.updateOne(
   query,{
     $set: {...user, timestamp: Date.now()}
   },
   options,
)
res.send(result)
 })

//  api jwt
app.post('/jwt', async(req, res)=>{
  const user = req.body 
   const token = jwt.sign(user, process.env.ASSEN_TOKEN,{expiresIn:'365h'})
   res.send({token})
})

// middleware very token

const verifyToken = (req, res, next)=>{
  // console.log(req.headers.authorization);
  
  if(!req.headers.authorization){
    return res.status(401).send({message: 'forbidden access' })
  }
  const token = req.headers.authorization.split(' ')[1]
   jwt.verify(token, process.env.ASSEN_TOKEN, (err, decoded)=>{
         if(err){
            return res.status(401).send({message: 'forbidden access'})
         }
         req.decoded = decoded
         next()
   })
  
   
}

// veryfiy admin 

const verifyAdmin = async (req, res, next)=>{
    const email = req.decoded.email
    const query = {email: email}
    const user = await userCollection.findOne(query)
    const isAdmin = user?.role === 'admin'
    if(!isAdmin){
      return res.status(403).send({message:'forbidden-access'})
    }
    next()
}

//  get user
app.get('/users', verifyToken, verifyAdmin, async(req,res)=>{  
    const result = await userCollection.find().toArray()
    res.send(result)
})

// admin user delete api

app.delete('/users/:id',  verifyToken, async(req,res)=>{
     const id = req.params.id
     const query = {_id: new ObjectId(id)}
     const result = await userCollection.deleteOne(query)
     res.send(result)
})

// admin product delete api
app.delete('/product/:id', async (req, res)=>{
   const id = req.params.id
   const query = {_id: new ObjectId(id)}
   const result = await productCollection.deleteOne(query)
   res.send(result)
})

// use admin api
app.get('/user/admin/:email', verifyToken,  async(req, res)=>{
     const email = req.params.email
     if(email !== req.decoded.email){
      return res.status(403).send({message:'unauthorized message'})
     }
    const query = {email: email}
    const user = await userCollection.findOne(query)
    let admin = false
    if(user){
      admin = user?.role === 'admin'
    } 
    res.send({ admin })
})

// make admin api

app.patch('/users/admin/:id', async(req, res)=>{
    const id = req.params.id
    const filter = {_id: new ObjectId(id)}
    const updateDoc = {
       $set: {
         role:'admin'
       }
    }
    const result = await userCollection.updateOne(filter, updateDoc)
    res.send(result)
}) 

// payment code

const tran_id = new ObjectId().toString()

app.post('/create-payment', async(req,res)=>{
 const paymentInfo = req.body
  const data = {
    total_amount: paymentInfo.amount,
    currency: paymentInfo.currency,
    tran_id: tran_id, // use unique tran_id for each api call
    success_url: `http://localhost:5000/success-payment/${tran_id}`,
    fail_url: `http://localhost:5000/success-fail/${tran_id}`,
    cancel_url: 'http://localhost:3030/cancel',
    ipn_url: 'http://localhost:3030/ipn',
    shipping_method: 'Courier',
    product_name: 'Hero',
    product_category: 'Bike',
    product_profile: 'general',
    cus_name: 'Customer Name',
    cus_email: paymentInfo.name,
    cus_add1: paymentInfo.email,
    cus_add2: 'Dhaka',
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: '01711111111',
    cus_fax: '01711111111',
    ship_name: 'Customer Name',
    ship_add1: 'Dhaka',
    ship_add2: 'Dhaka',
    ship_city: 'Dhaka',
    ship_state: 'Dhaka',
    ship_postcode: 1000,
    ship_country: 'Bangladesh',
};
// console.log(data);
const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
sslcz.init(data).then(apiResponse => {
    // Redirect the user to payment gateway
    let GatewayPageURL = apiResponse.GatewayPageURL
    res.send({PaymentUrl: GatewayPageURL})

   const finalOrder ={
        paymentInfo,
       paidStatus:false,
       tranjectionId:tran_id
   }

  const result = OrderCollection.insertOne(finalOrder) 

    console.log('Redirecting to: ', GatewayPageURL)
});

})

app.post('/success-payment/:tranId', async(req,res)=>{
      console.log(req.params.tranId);
      const result = await OrderCollection.updateOne({tranjectionId:req.params.tranId},{
         $set:{
          paidStatus:true
         }
      })
       
     if(result.modifiedCount>0){
        res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`)
     }
})

app.post('/success-fail/:tranId',async (req,res)=>{
    const result = await OrderCollection.deleteOne({tranjectionId:req.params.tranId})
    if(result.deletedCount){
      res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
    }
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







