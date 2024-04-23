
const express    = require("express");
const app        = express();
const jwt        = require("jsonwebtoken");
const mongoose   = require("mongoose");
const multer     = require("multer");
const path       = require("path");
const cors       = require("cors");
const { verify } = require("crypto");
const { log }    = require("console");
const dotenv     = require('dotenv');

dotenv.config({path:"./Config/.env"})
const connectDB = require ("./Config/ConnectDB")
port = process.env.PORT|| 5000
connectDB()


app.use(express.json());
app.use(cors());






app.get('/',(req,res)=>{
    res.send("Express is Running")
})



// Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

app.use('/images', express.static('upload/images'));

app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `https://malek.onrender.com/images/${req.file.filename}`
    });
});

// Create schema for creating Product
const Product = mongoose.model("Product",{
    id:{
        type:Number,
        require:true
        },
        
    name:{
        type: String,
        require:true
        },
    image:{
        type: String,
        require:true
           },
        category:{
        type: String,
        require:true
           },
        new_price:{
            type: Number,
           require:true,
           },
        old_price:{
            type: Number,
           require:true,
           },
        date:{
            type: Date,
           require:true,
           default:Date.now, 
           },
        avilable:{
            type:Boolean,
            default:true,
        },
})

// Endpoint pour ajouter un produit
app.post('/addproduct', async (req, res) => {
    try {
        // Créez une nouvelle instance de produit à partir des données reçues
        const newProduct = new Product({
            name: req.body.name,
            image: req.body.image,
            category: req.body.category,
            new_price: req.body.new_price,
            old_price: req.body.old_price
        });

        // Sauvegardez le nouveau produit dans la base de données
        await newProduct.save();

        // Répondre avec un message de succès
        res.json({ success: true, message: 'Product added successfully.' });
    } catch (error) {
        // En cas d'erreur, répondre avec un message d'erreur
        res.status(500).json({ success: false, message: 'Failed to add product.' });
    }
});
// Endpoint to get all products

app.get("/allproducts", async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products", error });
  }
});

// Endpoint pour supprimer un produit
app.delete('/removeproduct/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        // Remove the product from the database based on the ID
        await Product.findByIdAndDelete(productId);
        res.status(200).json({ success: true, message: 'Product removed successfully.' });
    } catch (error) {
        console.error('Failed to remove product:', error);
        res.status(500).json({ success: false, message: 'Failed to remove product. Please try again later.' });
    }
});

  
// Shema for Users Model
const Users = mongoose.model('Users',{
    name:{
        type:String,
        unique:true,
    },
    email:{
        type:String
    },
    password:{
        type:String,

    },
    cartData:{
        type:Object,
        
    },
    Date:{
        type:Date,
        default:Date.now,
    }
       
})

// Creating Endpoint for registreing the user 
app.post('/signup', async (req, res)=>{

    let chek = await Users.findOne({email:req.body.email});
    if (chek) {
        return res.status(400).json({success:false, errors:"Existing user found with same Email"})
    }

    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }
   const  user = new Users({
          name:req.body.username,
          email:req.body.email,
          password:req.body.password,
          cartData:cart
   })
   await  user.save();
   const data = {
    user:{
        id:user.id
    }
   }
   const token =jwt.sign(data,'secret_ecom  ');
   res.json({success:true,token})

})


// Creating Endpoint for  user Login

 app.post('/login', async (req, res)=>{
    let user = await Users.findOne({email:req.body.email});
    if (user) {
        const passCompare = req.body.password === user.password;
    if (passCompare) {
        const data = {
            user:{
                id:user.id
            }
        }
        const token = jwt.sign(data,'secret_ecom');
        res.json({success:true,token});

    }
    else{
        res.json({success:false,errors:"wrong Password"});
    }
        }
        else {
        res.json({success:false,errors:"wrong Email ID"});    
        }
 })



// Creating Endpoint for NewCollection Data

app.get('/newCollections', async (req,res)=>{
    let product = await Product.find ({});
    let newcollection = product.slice (1).slice(-8);
    console.log("Newcollection Fetched");
    res.send(newcollection);

})

// Creating Endpoint for Popular in women Data

app.get('/popularinwomen', async (req,res)=>{
    let products = await Product.find ({category:"women"});
    let popular_in_women = products.slice (0,4);
    console.log("Popular in women Fetched");
    res.send(popular_in_women);

})

// Creating Endpoint for Popular in mens Data

app.get('/popularinman', async (req,res)=>{
    let products = await Product.find ({category:"men"});
    let popular_in_men = products.slice (0,4);
    console.log("Popular in men Fetched");
    res.send(popular_in_men);

})
// Creating middelware to fetch user
const fetchUser = async (req,res,next)=>{
const token     = req.header ('auth-token');
if (!token ) {
    res.status(401).send({errors:"Please authenticate using valid TOKEN"})
}
else{
    try{
        const data =jwt.verify(token, 'secret-ecom');
        req.user = data.user;
        next ();
    } catch (error){
        res.status(401).send({errors:"Please authenticate using valid TOKEN "})
     }       
    }
   }


// Creating Endpoint for Adding product in cartdata.
app.post('/addtocart', async (req,res)=>{
let userData = await Users.findOne({_id:req.user.id});
userData.cartData[req.body.itemId] += 1;
await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData });  
res.send("Added")
})

// Creating Endpoint remove product from cartdata.
app.post('/removefromcart', fetchUser,async (req,res)=>{
    console.log("Added",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData });  
    res.send("Remove")
    })

app.get('/Latestcollection', async (req, res) => {
        try {
 // Récupérer tous les produits et les trier par date (du plus récent au plus ancien)
            const products = await Product.find({}).sort({ date: -1 });
            res.json(products);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch products", error });
        }
    });
    

// Server Run

app.listen(port, (error) => {
    if (!error) {
        console.log("Server running on Port " + port);
    } else {
        console.log("Error: " + error);
    }
});
