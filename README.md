# CSE6242 Fall 2022 Group 7 Project
## Ethereum Transaction Network Visualization and Anomaly Detection

Jinyang Han, Zongen Li, Ho Cheong Tang, Wenxuan Zhang, Xiaoyue Zhang

Ethereum is a blockchain platform that enables transactions to be conducted in a currency called Ether (ETH). It is a major network in the cryptocurrency world with a market cap of \$161 billion, second only to Bitcoin. In contrast to conventional fiat currencies, Ethereum’s decentralized network provides a popular alternative payment system. However, its pseudonymous nature gives rise to many financial crimes, which are often hard to trace and detect.

Cryptocurrency exchanges now comprise a considerable fraction of the financial industry. As with any other financial product, criminal activities, such as malicious transactions, money laundering, etc. exist in cryptocurrency transactions. Being able to easily identify suspicious transactions is beneficial to various users in the crypto community including individual users, traders, and account managers, etc.

Therefore, in this project, we create an interactive interface to visualize the relationship between Ethereum accounts, and additionally detect accounts that are involved in suspicious transaction activity.

## Visualization
Access our visualization [here!](https://cse6242-fall22-group7.github.io/eth-anomaly-detection/visualization/)

## Running our code
1. Do [data collection](https://github.com/cse6242-fall22-group7/eth-anomaly-detection/tree/main/dataCollection) to collect transactions
2. Perform [data analysis](https://github.com/cse6242-fall22-group7/eth-anomaly-detection/tree/main/dataAnalysis) on transactions
3. Create Neo4j database and import the data using `dataAnalysis/neo4j-import.ipynb`
