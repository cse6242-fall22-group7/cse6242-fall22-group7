import React, { useEffect, useRef, useState } from 'react';
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
  value: number,
}

type GraphData = {
  nodes: Array<AddressNode>,
  links: Array<Link>,
}

const TYPE1_QUERY = `
MATCH (source:Address {type: 1} )-->(target:Address) RETURN source, target
ORDER BY source.type DESC, target.type DESC
LIMIT $limit
`;

const ADDRESS_QUERY = `
MATCH (source:Address {addr: $address})--(target:Address) return source, target
LIMIT $limit
`;

const ALL_ADDRESS_QUERY = `
MATCH (source:Address)-->(target:Address) return source, target
LIMIT $limit
`

export default function App() {
  const driver: Driver = neo4j.driver(
    "bolt://anomaly-detection-neo4j.eastus.cloudapp.azure.com:7687",
    neo4j.auth.basic("neo4j", "Abcd1234"),
    { disableLosslessIntegers: true }
  )

  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [addressesMap, setAddressesMap] = useState<Map<string, AddressNode>>();
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [recordLimit, setRecordLimit] = useState(1000);
  const [hoveredAddress, setHoveredAddress] = useState<AddressNode | null>(null);
  const ref = useRef();

  const handleData = (result: QueryResult<Dict<PropertyKey, any>>) => {
    if (!result.records.length) {
      alert("No results");
      return;
    }
    const links: Array<Link> = result.records.map((r) => {
      return {
        source: r.get("source").properties.addr,
        target: r.get("target").properties.addr,
        value: 1,
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
    // setHoveredAddress(null);
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
    session.run(ADDRESS_QUERY, { address: selectedAddress, limit: neo4j.int(recordLimit) })
      .then(handleData).then(() => { session.close() });
  }

  const queryAllAddresses = () => {
    var session = driver.session({ defaultAccessMode: neo4j.session.READ });
    session.run(ALL_ADDRESS_QUERY, { limit: neo4j.int(recordLimit) })
      .then(handleData).then(() => { session.close() });
  }

  const queryHoveredAddress = () => {
    if (hoveredAddress) {
      var session = driver.session({ defaultAccessMode: neo4j.session.READ });
      // session.run(ADDRESS_QUERY, { address: hoveredAddress.id, limit: neo4j.int(recordLimit) })
      //   .then(handleData).then(() => { session.close() });
      session.run(ADDRESS_QUERY, { address: hoveredAddress.id, limit: neo4j.int(recordLimit) })
        .then(
          (result) => {
            const addresses = addressesMap!;
            var addItems = Array<AddressNode>();
            var addLinks = Array<Link>();
            result.records.forEach(record => {
              var addLink = true;

              var { addr, type } = record.get("source").properties;
              var sAddr = addr;
              if (!addresses.has(addr)) {
                addresses.set(addr, { id: addr, type: type });
                addItems.push(addresses.get(addr)!);
                addLink = true;
              }
              var { addr, type } = record.get("target").properties;
              var tAddr = addr;
              if (!addresses.has(addr)) {
                addresses.set(addr, { id: addr, type: type });
                addItems.push(addresses.get(addr)!);
                addLink = true;
              }
              if (addLink) {
                addLinks.push({ source: sAddr, target: tAddr, value: 1 });
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
        ).then(() => { session.close() });
    }
  }

  const queryAbnormalAddresses = () => {
    var session = driver.session({ defaultAccessMode: neo4j.session.READ });
    session.run(TYPE1_QUERY, { limit: neo4j.int(recordLimit) })
      .then(handleData).then(() => { session.close() });
  }

  const showNodeLabel = (node: any) => {
    return `${utils.getAddress(node.id)}`;
  }

  const handleNodeClick = (node: any) => {
    if (node) {
      setHoveredAddress({ id: node.id, type: node.type });
    } else {
      setHoveredAddress(null);
    }
  }

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
          <div>{hoveredAddress.id}</div>
          <div> {hoveredAddress.type === 1 ? "Abnormal" : "Normal"} Address
            <button onClick={() => { window.open(`https://etherscan.io/address/${hoveredAddress.id}`, '_blank'); }}>
              Open in Etherscan </button>
            <button onClick={() => { queryHoveredAddress(); }}>Expand this node</button>
          </div>
        </div>
      )}
    </div>
  );
}
