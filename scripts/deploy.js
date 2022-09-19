const hre = require("hardhat")

const toEther = (n) => hre.ethers.utils.parseEther(n.toString() , "ether")

async function main(){
  const [executor, proposer, voter1, voter2, voter3, voter4, voter5] =  await hre.ethers.getSigners()
  console.log("DEPLOYING DAO...")
  const name = "Dapp Univwersity"
  const symbol = "DAPPU"
  const supply = toEther(1000)
  console.log({name , symbol , supply})

  // Deploy token
  console.log("1 of 4 - Deploying token...")
  const Token=await hre.ethers.getContractFactory("MyToken")
  const token = await Token.deploy()
  const amount = toEther(50)
  await token.transfer(voter1.address , amount)
  await token.transfer(voter2.address , amount)
  await token.transfer(voter3.address , amount)
  await token.transfer(voter4.address , amount)
  await token.transfer(voter5.address , amount)
  console.log("Deployed")

  // Deploy timelock
  console.log("2 of 4 - Deploying timelock...")
  const minDelay = 1
  const Timelock= await hre.ethers.getContractFactory("TimeLock")
  const timelock = await Timelock.deploy(minDelay, [proposer.address] , [executor.address])
  console.log("Deployed")

  // Deploy governance
  console.log("3 of 4 - Deploying governance...")
  const Governance=await hre.ethers.getContractFactory("MyGovernor")
  const governance = await Governance.deploy(token.address , timelock.address)
  console.log("Deployed")

  //Deploy treasury
  console.log("4 of 4 - Deploying treasury...")
  const funds = toEther(25)
  const Treasury=await hre.ethers.getContractFactory("Treasury")
  const treasury = await Treasury.deploy(executor.address , {value:funds})
  await treasury.transferOwnership(timelock.address)
  console.log("Deployed")

  // Asign roles
  console.log("Assigning roles...")
  const proposerRole = await timelock.PROPOSER_ROLE() 
  const executorRole = await timelock.EXECUTOR_ROLE() 

  await timelock.connect(executor).grantRole(proposerRole , governance.address )
  await timelock.connect(executor).grantRole(executorRole , governance.address )
  console.log("DAO DEPLOYED!")

  return [executor, proposer, voter1, voter2, voter3, voter4, voter5] , governance , treasury , timelock
}

async function CreateProposal([executor, proposer, voter1, voter2, voter3, voter4, voter5] , governance, token, treasury , timelock){
  let isReleased, funds, blockNumber, proposalState, vote

  const amount = toEther(5)

  await token.connect(voter1).delegate(voter1.address)
  await token.connect(voter2).delegate(voter2.address)
  await token.connect(voter3).delegate(voter3.address)
  await token.connect(voter4).delegate(voter4.address)
  await token.connect(voter5).delegate(voter5.address)

  isReleased = await treasury.isReleased()
  console.log(`Funds released? ${isReleased}`)

  funds = await hre.ethers.getBalance(treasury.address)
  console.log(`Funds inside of treasury: ${hre.ethers.formatUnits(funds , "gwei")} ETH\n`)

  //ENCODE ABI
  const encodedFunction = await treasury.interface.functions.encodereleaseFunds()
  const description = "Release Funds from Treasury"

  const tx = await governance.connect(proposer).propose([treasury.address], [0], [encodedFunction], description)

  const id = tx.logs[0].args.proposalId
  console.log(`Created Proposal: ${id.toString()}\n`)

  proposalState = await governance.state.call(id)
  console.log(`Current state of proposal: ${proposalState.toString()} (Pending) \n`)

  const snapshot = await governance.proposalSnapshot.call(id)
  console.log(`Proposal created on block ${snapshot.toString()}`)

  const deadline = await governance.proposalDeadline.call(id)
  console.log(`Proposal deadline on block ${deadline.toString()}\n`)

  blockNumber = await hre.ethers.getBlockNumber()
  console.log(`Current blocknumber: ${blockNumber}\n`)

  const quorum = await governance.quorum(blockNumber - 1)
  console.log(`Number of votes required to pass: ${hre.ethers.utils.parseUnits(quorum.toString(), 'gwei')}\n`)

  // Vote
  console.log(`Casting votes...\n`)

  // 0 = Against, 1 = For, 2 = Abstain
  vote = await governance.connect(voter1).castVote(id, 1)
  vote = await governance.connect(voter2).castVote(id, 1)
  vote = await governance.connect(voter3).castVote(id, 1)
  vote = await governance.connect(voter4).castVote(id, 0)
  vote = await governance.connect(voter5).castVote(id, 2)

  // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
  proposalState = await governance.state.call(id)
  console.log(`Current state of proposal: ${proposalState.toString()} (Active) \n`)

  // NOTE: Transfer serves no purposes, it's just used to fast foward one block after the voting period ends
  await token.transfer(proposer, amount, { from: executor })

  const { againstVotes, forVotes, abstainVotes } = await governance.proposalVotes.call(id)
  console.log(`Votes For: ${hre.ethers.utils.formatUnits(forVotes.toString(),"gwei")}`)
  console.log(`Votes Against: ${hre.ethers.utils.formatUnits(againstVotes.toString(),"gwei")}`)
  console.log(`Votes Neutral: ${hre.ethers.utils.formatUnits(abstainVotes.toString(),"gwei")}\n`)

  blockNumber = await hre.ethers.getBlockNumber()
  console.log(`Current blocknumber: ${blockNumber}\n`)

  proposalState = await governance.state.call(id)
  console.log(`Current state of proposal: ${proposalState.toString()} (Succeeded) \n`)

  // Queue 
  const hash = hre.ethers.utils.keccak256("Release Funds from Treasury")
  await governance.queue([treasury.address], [0], [encodedFunction], hash, { from: executor })

  proposalState = await governance.state.call(id)
  console.log(`Current state of proposal: ${proposalState.toString()} (Queued) \n`)

  // Execute
  await governance.execute([treasury.address], [0], [encodedFunction], hash, { from: executor })

  proposalState = await governance.state.call(id)
  console.log(`Current state of proposal: ${proposalState.toString()} (Executed) \n`)

  isReleased = await treasury.isReleased()
  console.log(`Funds released? ${isReleased}`)

  funds = await hre.ethers.getBalance(treasury.address)
  console.log(`Funds inside of treasury: ${hre.ethers.formatUnits(funds , "gwei")} ETH\n`)

}


main()
  .then(CreateProposal)
  .catch((error) => {
  console.error(error);
  process.exitCode = 1;
});





