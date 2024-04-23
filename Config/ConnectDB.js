const mongoose = require  ('mongoose')


const connectDB = ()=>{

    // MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("DB connected"))
.catch((err) => console.log(err));
};

module.exports= connectDB