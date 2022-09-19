const hre = require("hardhat")

const toEther = (n) => hre.ethers.parseEther(n.toString() , "ether")

async function main(){
  const [executor, proposer, voter1, voter2, voter3, voter4, voter5] = await hre.ethers.getSigners()
  console.log("DEPLOYING DAO...")
  const name = "Dapp Univwersity"
  const symbol = "DAPPU"
  const supply = toEther(1000)
  console.log({name , symbol , supply})

  // Deploy token
  console.log("1 of 4 - Deploying token...")
  const Token=await hre.ethers.getContractFactory("Token")
  const token = await Token.deploy()
  const amount = toEther(50)
  await token.transfer(voter1 , amount)
  await token.transfer(voter2 , amount)
  await token.transfer(voter3 , amount)
  await token.transfer(voter4 , amount)
  await token.transfer(voter5 , amount)
  console.log("Deployed")

  // Deploy timelock
  console.log("2 of 4 - Deploying timelock...")
  const minDelay = 1
  const Timelock= await hre.ethers.getContractFactory("Timelock")
  const timelock = await Timelock.deploy(minDelay, [proposer] , [executor])
  console.log("Deployed")

  // Deploy governance
  console.log("3 of 4 - Deploying governance...")
  const quorum = 5 // 5% of total suppply of tokens needed to aprove proposal
  const votingDelay = 0 //voting becomes active inmediatly
  const votingPeriod = 5 //users can vote during 5 blocks
  const Governance=await hre.ethers.getContractFactory("Governance")
  const governance = await Governance.deploy(token.address , timelock.address , quorum , votingDelay, votingPeriod)
  console.log("Deployed")

  //Deploy treasury
  console.log("4 of 4 - Deploying treasury...")
  const funds = toEther(25)
  const Treasury=await hre.ethers.getContractFactory("Treasury")
  const treasury = await Treasury.deploy(executor , {value:funds})
  await treasury.transferOwnership(timelock.address)
  console.log("Deployed")

  // Asign roles
  console.log("Assigning roles...")
  const proposerRole = await timelock.PROPOSER_ROLE() 
  const executorRole = await timelock.EXECUTOR() 

  await timelock.connect(executor).grantRole(proposerRole , governance.address )
  await timelock.connect(executor).grantRole(executorRole , governance.address )
  console.log("DAO DEPLOYED!")


}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});





