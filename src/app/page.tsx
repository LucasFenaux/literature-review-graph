'use client';

import Sidebar from '@/components/Sidebar';
import DetailPanel from '@/components/DetailPanel';
import GraphCanvas from '@/components/GraphCanvas';
import { useEffect, useState } from 'react';
import { useGraphStore } from '@/store/graphStore';

export default function Home() {
  const { fetchCollections, fetchTags, activeCollectionId, loadCollectionGraph, graphData } = useGraphStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchCollections();
    fetchTags();
  }, [fetchCollections, fetchTags]);

  useEffect(() => {
    if (activeCollectionId && graphData.nodes.length === 0) {
      loadCollectionGraph(activeCollectionId);
    }
  }, [activeCollectionId, graphData.nodes.length, loadCollectionGraph]);

  if (!isMounted) return null;

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GraphCanvas />
      <Sidebar />
      <DetailPanel />
    </main>
  );
}
