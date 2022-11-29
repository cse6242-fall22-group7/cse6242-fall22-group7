import json
import datetime
import sqlite3
from sqlite3 import Error

from etherscan import Etherscan
from sqlite import Sqlite

API_KEY = "<ETHERSCAN_APIKEY>"
DB_FILE = "db.sqlite"
FROM_TIME = 1522540800
TO_TIME = 1525132800

if __name__ == "__main__":
    start = datetime.datetime.utcfromtimestamp(FROM_TIME)
    end = datetime.datetime.utcfromtimestamp(TO_TIME)
    etherscan = Etherscan(API_KEY)
    client = Sqlite(DB_FILE)
    start_block = etherscan.get_blocknum_by_datetime(start)
    end_block = etherscan.get_blocknum_by_datetime(end)
    for num in range(start_block, end_block):
        if client.block_exists(num):
            continue
        block = etherscan.get_block_by_number(num)
        print(num, block["hash"])
        client.insert_block(block)
