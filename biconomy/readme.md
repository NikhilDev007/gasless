## Oddz Finance

## Table of Content

- [Project Description](#project-description)
- [Technologies Used](#technologies-used)
- [Folder Structure](#directory-layout)
- [Install and Run](#install-and-run)

## Project Description 

Create an easily accessible decentralized perpetual futures trading platform where users can long, short, use leverage, use varying order types, and choose between cross- or isolated margins. 

## Technologies Used 

- Solidity
- Openzepplein
- Hardhat
- Chainlink Price Feed

## Directory layout

    .
    ├── contracts               # Smart contracts
    ├── scripts                 # Deployment scripts for smart contracts
    ├── test                    # Test files
    └── README.md
## Install and Setup

### Clone

```
git clone https://github.com/Oddz-code-tech/smart-contracts.git

```
### Installation

Install project's dependencies:

```
cd smart-contracts

npm install

```
### Set up .env

create a new .env file by copying it's content from env.example and filling in your secrets

```
cp .env.example .env

privateKey1=
privateKey2=
privateKey3=
arbitrumApiKey=
alchemyKey=

```

## Building the projects


### compile

Compile the contracts:

```
npm run compile

```

### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```
npm run clean

```

### Testing

Run the tests:

```
npm run test

```

### Coverage

Generate the code coverage report:

```
npm run coverage

```


### Deployment

Deploy the contracts:

```
npm run deploy

```
