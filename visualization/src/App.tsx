import React, { useEffect, useRef, useState } from 'react';
import { ForceGraph2D, ForceGraph3D } from "react-force-graph";
import neo4j, { Driver } from 'neo4j-driver';
import { utils } from 'ethers';
import DummyData from './graph.json';
import './App.css';

type AddressNode = {
  id: string;
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

export default function App() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const ref = useRef();

  useEffect(() => {

    var driver: Driver = neo4j.driver(
      "bolt://anomaly-detection-neo4j.eastus.cloudapp.azure.com:7687",
      neo4j.auth.basic("neo4j", "Abcd1234")
    )
    var session = driver.session({ defaultAccessMode: neo4j.session.READ })
    session.run(
      `MATCH (source:Address)-->(target:Address) RETURN source, target
      LIMIT $limit`, { limit: neo4j.int(10000) }
    ).then((result) => {
      const links: Array<Link> = result.records.map((r: any) => {
        return {
          source: r.get("source").properties.addr,
          target: r.get("target").properties.addr,
          value: 1,
        }
      });
      const addresses = new Set<string>();
      links.forEach(link => {
        addresses.add(link.source);
        addresses.add(link.target);
      });
      setData(
        {
          nodes: (Array.from(addresses) as Array<string>).map(addr => {
            return { id: addr }
          }),
          links: links
        }
      )
    });
  }, []);

  const showNodeLabel = (node: any) => {
    return utils.getAddress(node.id);
  }

  const handleNodeClick = (node: any) => {
    window.open(`https://etherscan.io/address/${node.id}`, '_blank');
  }

  return (
    <div className="App">
      <ForceGraph3D
        ref={ref}
        graphData={data}
        enableNodeDrag={false}
        cooldownTime={10000}
        linkWidth={1}
        nodeLabel={showNodeLabel}
        linkOpacity={0.2}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}
