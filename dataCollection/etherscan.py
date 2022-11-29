import time
import requests

import datetime

BASE_URL = "https://api.etherscan.io/api"


class Etherscan:
    api_key: str

    def __init__(self, api_key):
        self.api_key = api_key

    def make_request(self, **params: dict):
        params["apikey"] = self.api_key
        time.sleep(0.1)
        res = requests.get(BASE_URL, params=params)
        res.raise_for_status()
        return res.json()

    def get_blocknum_by_datetime(self, timestamp: datetime.datetime):
        ts = int(timestamp.timestamp())
        res_json = self.make_request(
            module="block",
            action="getblocknobytime",
            timestamp=ts,
            closest="after"
        )
        return int(res_json["result"])

    def get_block_by_number(self, blk_num: int, skip_zero_value=True):
        """
        https://api.etherscan.io/api
   ?module=proxy
   &action=eth_getBlockByNumber
   &tag=0x10d4f
   &boolean=true
   &apikey=YourApiKeyToken
        """
        res_json = self.make_request(
            module="proxy",
            action="eth_getBlockByNumber",
            tag=hex(blk_num),
            boolean="true"
        )
        res = res_json["result"]
        if not isinstance(res, dict):
            raise RuntimeError(res_json)
        transactions = []
        for tx in res["transactions"]:
            val = int(tx["value"], 16)
            if val == 0 and skip_zero_value is True:
                continue
            if tx["to"] is None:
                # contract creation
                continue
            transactions.append(
                {
                    "from": tx["from"],
                    "to": tx["to"],
                    "hash": tx["hash"],
                    "value": val,
                }
            )
        return dict(
            num=blk_num,
            hash=res["hash"],
            timestamp=int(res["timestamp"], 16),
            transactions=transactions
        )

    def get_transaction(self, tx_hash: str):
        res_json = self.make_request(
            module="proxy",
            action="eth_getTransactionByHash",
            txhash=tx_hash
        )
        print(res_json)
        res = res_json["result"]
        return {
            "from": res["from"],
            "to": res["to"],
            "hash": res["hash"],
            "value": int(res["value"], 16)
        }
