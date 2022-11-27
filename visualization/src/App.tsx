import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ForceGraph3D } from "react-force-graph";
import neo4j, { Driver, QueryResult } from 'neo4j-driver';
import { utils } from 'ethers';
import './App.css';
import { Dict } from 'neo4j-driver-core/types/record';

type AddressNode = {
  id: string,
  type: number,
}

type Link = {
  source: string,
  target: string,
  count: number,
  total_amount: number,
}

type GraphData = {
  nodes: Array<AddressNode>,
  links: Array<Link>,
}

type AddressDetail = {
  total_received: number,
  total_sent: number,
  num_received: number,
  num_sent: number,
}

const TYPE1_QUERY = `
MATCH (source:Address {type: 1} )-[r:SENT]-(target:Address) RETURN source, r, (startNode(r) = source) as isFromSource, target
ORDER BY source.type DESC, target.type DESC
LIMIT $limit
`;

const ADDRESS_QUERY = `
MATCH (source:Address {addr: $address})-[r:SENT]-(target:Address) RETURN source, r, (startNode(r) = source) as isFromSource, target
LIMIT $limit
`;

const ALL_ADDRESS_QUERY = `
MATCH (source:Address)-[r:SENT]-(target:Address) RETURN source, r, (startNode(r) = source) as isFromSource, target
LIMIT $limit
`

const ADDRESS_DETAILS_QUERY = `
MATCH (source:Address {addr: $address} )-[r:SENT]-(:Address) RETURN (startNode(r) = source) as isFromSource, sum(r.count) as count, sum(r.total_amount) as total_amount;
`

export default function App() {
  const driver: Driver = neo4j.driver(
    "bolt://anomaly-detection-neo4j.eastus.cloudapp.azure.com:7687",
    neo4j.auth.basic("neo4j", "Abcd1234"),
    { disableLosslessIntegers: true }
  )

  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [addressesMap, setAddressesMap] = useState<Map<string, AddressNode>>();
  const [clickedAddressDetail, setClickedAddressDetail] = useState<AddressDetail>();
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recordLimit, setRecordLimit] = useState(1000);
  const [hoveredAddress, setHoveredAddress] = useState<AddressNode | null>(null);
  const ref = useRef();

  const handleError = (e: any) => {
    alert(e);
    setIsLoading(false);
  }

  const handleData = (result: QueryResult<Dict<PropertyKey, any>>) => {
    if (!result.records.length) {
      alert("No results");
      return;
    }
    const links: Array<Link> = result.records.map((r) => {
      if (r.get("isFromSource") === true) {
        var source = r.get("source"); var target = r.get("target");
      } else {
        var source = r.get("target"); var target = r.get("source");
      }
      const rel = r.get("r")
      return {
        source: source.properties.addr,
        target: target.properties.addr,
        total_amount: rel.properties.total_amount,
        count: rel.properties.count,
      }
    });
    const addresses = new Map<string, AddressNode>();
    result.records.forEach((record) => {
      var { addr, type } = record.get("source").properties
      addresses.set(addr, { id: addr, type: type });
      var { addr, type } = record.get("target").properties
      addresses.set(addr, { id: addr, type: type });
    });
    setAddressesMap(addresses);
    setData(
      {
        nodes: Array.from(addresses.values()),
        links: links,
      }
    )
  };

  useEffect(() => {
    setRecordLimit(recordLimit | 0);
    queryAbnormalAddresses();
  }, []);

  const handleAddressChange = (e: any) => {
    setSelectedAddress(e.target.value);
  }

  const handleRecordLimitChange = (e: any) => {
    try {
      setRecordLimit(parseInt(e.target.value));
    } catch (err) { };
  }

  const queryAddress = () => {
    if (!selectedAddress) {
      return;
    }
    try {
      utils.getAddress(selectedAddress);
    } catch (err) {
      alert(`Invalid address: ${selectedAddress}`);
      return;
    }
    var session = driver.session({ defaultAccessMode: neo4j.session.READ });
    setIsLoading(true);
    session.run(ADDRESS_QUERY, { address: selectedAddress.toLowerCase(), limit: neo4j.int(recordLimit) })
      .then(handleData).then(() => { session.close(); setIsLoading(false); }).catch(handleError);
  }

  const queryAllAddresses = () => {
    var session = driver.session({ defaultAccessMode: neo4j.session.READ });
    setIsLoading(true);
    session.run(ALL_ADDRESS_QUERY, { limit: neo4j.int(recordLimit) })
      .then(handleData).then(() => { session.close(); setIsLoading(false); }).catch(handleError);
  }

  const expandSelectedAddress = () => {
    if (hoveredAddress) {
      setIsLoading(true);
      var session = driver.session({ defaultAccessMode: neo4j.session.READ });
      session.run(ADDRESS_QUERY, { address: hoveredAddress.id, limit: neo4j.int(recordLimit) })
        .then(
          (result) => {
            const addresses = addressesMap!;
            var addItems = Array<AddressNode>();
            var addLinks = Array<Link>();
            result.records.forEach(record => {
              var addLink = true;

              var { addr, type } = record.get("isFromSource") ? record.get("source").properties : record.get("target").properties;
              var sAddr = addr;
              if (!addresses.has(addr)) {
                addresses.set(addr, { id: addr, type: type });
                addItems.push(addresses.get(addr)!);
                addLink = true;
              }
              var { addr, type } = !record.get("isFromSource") ? record.get("source").properties : record.get("target").properties;
              var tAddr = addr;
              if (!addresses.has(addr)) {
                addresses.set(addr, { id: addr, type: type });
                addItems.push(addresses.get(addr)!);
                addLink = true;
              }
              if (addLink) {
                addLinks.push({ source: sAddr, target: tAddr, count: record.get("r").properties.count, total_amount: record.get("r").properties.total_amount });
              }

            });
            if (addItems.length) {
              setData(
                {
                  nodes: [...data.nodes, ...addItems],
                  links: [...data.links, ...addLinks],
                }
              );
            } else {
              alert("No new connections found");
            }
          }
        ).then(() => { session.close(); setIsLoading(false); }).catch(handleError);
    }
  }

  const queryAbnormalAddresses = () => {
    var session = driver.session({ defaultAccessMode: neo4j.session.READ });
    setIsLoading(true);
    session.run(TYPE1_QUERY, { limit: neo4j.int(recordLimit) })
      .then(handleData).then(() => { session.close(); setIsLoading(false); }).catch(handleError);
  }

  const showNodeLabel = (node: any) => {
    return `${utils.getAddress(node.id)}`;
  }

  const showLinkLabel = (link: any) => {
    return `# TXs: ${link.count}, Amt: ${link.total_amount}ETH`
  }

  const handleNodeClick = useCallback((node: any) => {
    if (node) {
      var session = driver.session({ defaultAccessMode: neo4j.session.READ });
      setIsLoading(true);
      session.run(ADDRESS_DETAILS_QUERY, { address: node.id })
        .then((result) => {
          var total_received = 0, total_sent = 0;
          var num_received = 0, num_sent = 0;
          result.records.forEach(record => {
            record.get("isFromSource") ? total_sent = record.get("total_amount") : total_received = record.get("total_amount");
            record.get("isFromSource") ? num_sent = record.get("count") : num_received = record.get("count");
            setClickedAddressDetail(
              { total_received: total_received, total_sent: total_sent, num_received: num_received, num_sent: num_sent }
            )
          });
        }).then(() => { session.close(); setIsLoading(false); }).catch(handleError);

      const distance = 500;
      const distRatio = 1 + (distance) / Math.hypot(node.x, node.y, node.z);
      (ref.current! as any).cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        500
      );
      setHoveredAddress({ id: node.id, type: node.type });
    } else {
      setHoveredAddress(null);
    }
  }, [ref]);

  return (
    <div className="app">
      <div className="graph">
        <ForceGraph3D
          ref={ref}
          graphData={data}
          enableNodeDrag={false}
          cooldownTime={10000}
          linkWidth={1}
          nodeLabel={showNodeLabel}
          linkLabel={showLinkLabel}
          nodeColor={(node: any) => (selectedAddress === node.id || hoveredAddress?.id === node.id) ? "red" : node.type === 1 ? "orange" : "lightblue"}
          onNodeClick={handleNodeClick}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
        />
      </div>
      <div className="header overlay" style={{
        position: "absolute",
        top: "24px",
        left: "32px",
        zIndex: 2
      }}>
        <h1 className="center">
          Ethereum Transaction Graph Visualization
        </h1>
        <div>
          <div>
            Search Address:
            <input className="address" type="text" value={selectedAddress}
              placeholder="0x0f6d8da6942519c51d1da26e16d1b44e2e891b4a"
              onChange={handleAddressChange} />
            <button onClick={() => { queryAddress(); }}>Search</button>
          </div>
          <div>
            Query Limit:
            <input type="number" value={recordLimit}
              placeholder={"1000"} onChange={handleRecordLimitChange} />
          </div>
          <div>
            <button onClick={() => { queryAbnormalAddresses(); }}>Show Abnormal Addresses</button>
            <button onClick={() => { queryAllAddresses(); }}>Show All Addresses</button>
          </div>
        </div>
      </div>
      {hoveredAddress && (
        <div className="overlay"
          style={{
            position: "absolute",
            bottom: "100px",
            left: "32px",
            zIndex: 3,
          }}>
          <div style={{ fontFamily: "monospace", fontSize: "20px" }}>{utils.getAddress(hoveredAddress.id)}</div>
          {
            clickedAddressDetail && (
              <div>
                {clickedAddressDetail.num_received > 0 && (<div>Received {clickedAddressDetail.num_received} times, total {clickedAddressDetail.total_received.toFixed(4)} ETH</div>)}
                {clickedAddressDetail.num_sent > 0 && (<div>Sent {clickedAddressDetail.num_sent} times, total {clickedAddressDetail.total_sent.toFixed(4)} ETH</div>)}
              </div>
            )
          }
          <div> {hoveredAddress.type === 1 ? "Abnormal" : "Normal"} Address
          </div>
          <div>
            <button onClick={() => { window.open(`https://etherscan.io/address/${hoveredAddress.id}`, '_blank'); }}>
              Open in Etherscan </button>
            <button onClick={() => { expandSelectedAddress(); }}>Expand this node</button>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="overlay"
          style={{
            position: "absolute",
            bottom: "100px",
            right: "32px",
            zIndex: 4,
          }}>
          <div className="spinner-container">
            <div className="loading-spinner"></div>
          </div>
        </div>
      )
      }
    </div>
  );
}
