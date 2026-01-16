import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;
const BONUS_AMOUNT = Number(process.env.BONUS_AMOUNT) || 10;

// MyBookie URLs for each sport
const LEAGUES = {
  NFL: process.env.MYBOOKIE_NFL_URL,
  NBA: process.env.MYBOOKIE_NBA_URL,
  MLB: process.env.MYBOOKIE_MLB_URL,
  NHL: process.env.MYBOOKIE_NHL_URL,
  NCAA_FB: process.env.MYBOOKIE_NCAA_FB_URL,
  NCAA_BB: process.env.MYBOOKIE_NCAA_BB_URL
};

// Blocked states
const RESTRICTED_STATES = ["NY","NJ","MD","DE","TN","MI","PA","DC"];

let users = [];
let nextUserId = 1;

app.get("/", (req,res)=>res.send("TicketTime backend running ✅"));

// REGISTER
app.post("/register",(req,res)=>{
  const { email,password,state }=req.body;
  if(RESTRICTED_STATES.includes(state)) return res.json({success:false,error:"State restricted"});
  if(users.find(u=>u.email===email)) return res.json({success:false,error:"Email exists"});
  const newUser = {id:nextUserId++,email,password,balance:0,bonus:BONUS_AMOUNT,slips:[],referralUsed:false,state:state||null};
  users.push(newUser);
  res.json({success:true,user:newUser});
});

// LOGIN
app.post("/login",(req,res)=>{
  const user=users.find(u=>u.email===req.body.email && u.password===req.body.password);
  if(!user) return res.json({success:false,error:"Invalid credentials"});
  if(RESTRICTED_STATES.includes(user.state)) return res.json({success:false,error:"State restricted"});
  res.json({success:true,user});
});

// DEPOSIT
app.post("/deposit",(req,res)=>{
  const { userId, amount } = req.body;
  const user = users.find(u=>u.id===userId);
  if(!user) return res.json({success:false,error:"User not found"});
  if(RESTRICTED_STATES.includes(user.state)) return res.json({success:false,error:"State restricted"});
  user.balance += amount;
  res.json({success:true,balance:user.balance});
});

// WITHDRAW
app.post("/withdraw",(req,res)=>{
  const { userId, amount } = req.body;
  const user = users.find(u=>u.id===userId);
  if(!user) return res.json({success:false,error:"User not found"});
  if(user.balance < amount) return res.json({success:false,error:"Insufficient funds"});
  user.balance -= amount;
  res.json({success:true,balance:user.balance});
});

// REFERRAL
app.post("/apply-referral",(req,res)=>{
  const { userId } = req.body;
  const user = users.find(u=>u.id===userId);
  if(!user) return res.json({success:false,error:"User not found"});
  if(user.referralUsed) return res.json({success:false,error:"Already used referral"});
  user.balance += BONUS_AMOUNT;
  user.referralUsed = true;
  res.json({success:true,balance:user.balance});
});

// FETCH ALL GAMES
app.get("/games",async(req,res)=>{
  try{
    let allGames=[];
    for(const [sport,url] of Object.entries(LEAGUES)){
      if(!url) continue;
      const response=await fetch(url);
      const data=await response.json();
      if(!data?.games) continue;
      const games = data.games.map(g=>({
        sport,
        gameId: g.id,
        matchup: g.name,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        startTime: g.startTime,
        lines: g.lines||g.odds
      }));
      allGames.push(...games);
    }
    res.json({success:true,games:allGames});
  }catch(err){console.error(err);res.status(500).json({success:false,error:err.message});}
});

// PLACE PICK
app.post("/place-bet",(req,res)=>{
  const { userId, slip } = req.body;
  const user = users.find(u=>u.id===userId);
  if(!user) return res.json({success:false,error:"User not found"});
  if(RESTRICTED_STATES.includes(user.state)) return res.json({success:false,error:"State restricted"});

  let totalStake = slip.reduce((a,b)=>a+b.amount,0);
  if(user.balance < totalStake) return res.json({success:false,error:"Insufficient funds"});

  user.balance -= totalStake;
  user.slips.push({slip,timestamp:new Date()});
  res.json({success:true,slipTracked:true,redirect:AFFILIATE_LINK});
});

app.listen(PORT,()=>console.log(`🚀 TicketTime backend running on port ${PORT}`));
