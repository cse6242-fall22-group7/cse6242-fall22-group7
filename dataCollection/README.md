# CSE6242 Fall 2022 Group 7 Project
## Data Collection

This code performs data collection by scraping the Etherscan API for transactions within a time range. The data is saved in Sqlite with the following schema:

```
CREATE TABLE block (
 	num INTEGER PRIMARY KEY,
	block_time int NOT NULL, -- unix time
	block_hash text NOT NULL -- lowercase hex string
);
CREATE UNIQUE INDEX block_time_idx ON block (block_time);

CREATE TABLE tx (
	tx_hash text NOT NULL PRIMARY KEY,
	block_num INTEGER NOT NULL,
	from_addr text NOT NULL, -- lowercase hex string
	to_addr text NOT NULL,  -- lowercase hex string
	amount text NOT NULL, -- integer
	FOREIGN KEY(block_num) REFERENCES block(num)
);
```

### Prerequisites
1. Python3 with SQLite3 installed
1. A valid Etherscan API key

### Running
1. Set the `API_KEY, DB_FILE, FROM_TIME, TO_TIME` to appropriate values:
- `API_KEY`: Etherscan API Key
- `DB_FILE`: Filepath for sqlite3 file
- `FROM_TIME, TO_TIME`: Unix timestamp for the time range for transactions
2. Run the program:
```
python3 crawl.py
```
3. The sqlite file can then be exported as csv via:
```
sqlite> .headers on
sqlite> .mode csv
sqlite> .output transaction.csv
sqlite> SELECT * FROM tx;
sqlite> .output block.csv
sqlite> SELECT * FROM block;
```
