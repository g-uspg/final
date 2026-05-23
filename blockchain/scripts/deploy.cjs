const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Desplegando con:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  const Factory = await ethers.getContractFactory('ParkingAuditLog');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('\n✅ ParkingAuditLog desplegado en:', address);

  // Guardar address en archivo para que el webapp lo lea
  const envLine = `BLOCKCHAIN_CONTRACT_ADDRESS="${address}"`;
  const envPath = path.join(__dirname, '../../webapp/.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('BLOCKCHAIN_CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(/BLOCKCHAIN_CONTRACT_ADDRESS=".*"/, envLine);
  } else {
    envContent += `\n${envLine}`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log('Address guardado en .env.local');
}

main().catch((e) => { console.error(e); process.exit(1); });
