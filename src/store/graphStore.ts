import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Paper } from '@/lib/openalex';

export interface GraphNode extends Paper {
  x?: number;
  y?: number;
  val?: number; // size in graph
  status?: string;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
}

interface GraphState {
  collections: Collection[];
  activeCollectionId: string | null;
  exploreMode: boolean; // toggle for cross-collection citations
  searchQuery: string;
  relatedFilter: string;
  edgeFilter: number;
  searchResults: Paper[];
  graphData: GraphData;
  selectedNode: GraphNode | null;
  focusedNodeId: string | null;
  
  setCollections: (collections: Collection[]) => void;
  setActiveCollectionId: (id: string | null) => void;
  setExploreMode: (mode: boolean) => void;
  setSearchQuery: (query: string) => void;
  setRelatedFilter: (query: string) => void;
  setEdgeFilter: (filter: number) => void;
  setSearchResults: (results: Paper[]) => void;
  setGraphData: (data: GraphData) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setFocusedNodeId: (id: string | null) => void;
  
  fetchCollections: () => Promise<void>;
  loadCollectionGraph: (collectionId: string) => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  addSeedPaper: (paper: Paper) => Promise<void>;
  removeNode: (id: string) => Promise<void>;
  clearRelatedNodes: () => Promise<void>;
  expandNode: (id: string, type?: 'citations' | 'references' | 'both') => Promise<void>;
  bulkExpand: (type: 'citations' | 'references') => Promise<void>;
  rebuildEdges: () => Promise<void>;
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      collections: [],
      activeCollectionId: null,
      exploreMode: true,
      searchQuery: '',
      relatedFilter: '',
      edgeFilter: 1,
      searchResults: [],
      graphData: { nodes: [], links: [] },
      selectedNode: null,
      focusedNodeId: null,
      
      setCollections: (collections) => set({ collections }),
      setActiveCollectionId: (id) => set({ activeCollectionId: id }),
      setExploreMode: (mode) => set({ exploreMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setRelatedFilter: (query) => set({ relatedFilter: query }),
      setEdgeFilter: (filter) => set({ edgeFilter: filter }),
      setSearchResults: (results) => set({ searchResults: results }),
      setGraphData: (data) => set({ graphData: data }),
      setSelectedNode: (node) => set({ selectedNode: node }),
      setFocusedNodeId: (id) => set({ focusedNodeId: id }),
  
      clearRelatedNodes: async () => {
        const { activeCollectionId, graphData, selectedNode } = get();
        if (!activeCollectionId) return;

        try {
          await fetch(`/api/collection/${activeCollectionId}/clear`, {
            method: 'DELETE'
          });
        } catch (err) {
          console.error('Failed to clear related nodes from database', err);
        }

        const newNodes = graphData.nodes.filter(n => n.status === 'seed');
        const seedIds = new Set(newNodes.map(n => n.id));
        const newLinks = graphData.links.filter(l => {
          const sourceId = typeof l.source === 'string' ? l.source : (l.source as any).id;
          const targetId = typeof l.target === 'string' ? l.target : (l.target as any).id;
          return seedIds.has(sourceId) && seedIds.has(targetId);
        });
        
        set({
          graphData: { nodes: newNodes, links: newLinks },
          selectedNode: selectedNode?.status !== 'seed' ? null : selectedNode
        });
      },

  fetchCollections: async () => {
    try {
      const res = await fetch('/api/collections');
      const data = await res.json();
      set({ collections: data });
    } catch (err) {
      console.error('Failed to fetch collections', err);
    }
  },
  
  createCollection: async (name: string) => {
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const newCollection = await res.json();
      set((state) => ({ collections: [newCollection, ...state.collections] }));
      get().setActiveCollectionId(newCollection.id);
      get().setGraphData({ nodes: [], links: [] });
    } catch (err) {
      console.error('Failed to create collection', err);
    }
  },

  loadCollectionGraph: async (collectionId: string) => {
    try {
      const res = await fetch(`/api/collection?collectionId=${collectionId}`);
      const papers = await res.json();
      
      const nodes = papers.map((p: any) => ({
        ...p,
        val: p.status === 'seed' ? 20 : 10
      }));
      
      const linksRes = await fetch(`/api/collection/links?collectionId=${collectionId}`);
      const links = await linksRes.json();
      
      set({ graphData: { nodes, links }, activeCollectionId: collectionId });
    } catch (err) {
      console.error('Failed to load collection graph', err);
    }
  },

  addSeedPaper: async (paper) => {
    const { graphData, activeCollectionId } = get();
    if (!activeCollectionId) return;

    const existingNodeIndex = graphData.nodes.findIndex(n => n.id === paper.id);
    
    if (existingNodeIndex >= 0) {
      if (graphData.nodes[existingNodeIndex].status === 'seed') return;
      
      const newNodes = [...graphData.nodes];
      newNodes[existingNodeIndex] = { ...newNodes[existingNodeIndex], status: 'seed', val: 20 };
      set({
        graphData: {
          nodes: newNodes,
          links: graphData.links,
        }
      });
    } else {
      set({
        graphData: {
          nodes: [...graphData.nodes, { ...paper, status: 'seed', val: 20 }], // Seed nodes are larger
          links: graphData.links,
        }
      });
    }

    try {
      await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paper, status: 'seed', collectionId: activeCollectionId })
      });
    } catch (error) {
      console.error('Failed to add seed to DB', error);
    }
  },

  removeNode: async (id: string) => {
    const { activeCollectionId, graphData, selectedNode } = get();
    if (!activeCollectionId) return;

    try {
      await fetch(`/api/collection/${id}?collectionId=${activeCollectionId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to remove node from database', err);
    }

    // Filter out the node and any links connected to it
    const newNodes = graphData.nodes.filter(n => n.id !== id);
    const newLinks = graphData.links.filter(l => {
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const targetId = typeof l.target === 'string' ? l.target : (l.target as any).id;
      return sourceId !== id && targetId !== id;
    });

    set({ 
      graphData: { nodes: newNodes, links: newLinks },
      selectedNode: selectedNode?.id === id ? null : selectedNode
    });
  },
  
  expandNode: async (id: string, type = 'both') => {
    const { activeCollectionId, exploreMode, graphData } = get();
    if (!activeCollectionId) return;

    try {
      const res = await fetch(`/api/expand/${id}?type=${type}&collectionId=${activeCollectionId}`);
      const data = await res.json();
      
      const newNodes = [...graphData.nodes];
      const newLinks = [...graphData.links];
      
      const addNodesAndLinks = (papers: Paper[], isCitation: boolean) => {
        papers.forEach(p => {
          const existsInGraph = newNodes.find(n => 
            n.id === p.id || 
            (n.title && p.title && n.title.toLowerCase() === p.title.toLowerCase())
          );
          
          let targetNodeId = p.id;
          if (existsInGraph) {
            targetNodeId = existsInGraph.id;
          } else {
            newNodes.push({ ...p, val: 5, status: 'recommended' } as any);
          }

          const source = isCitation ? targetNodeId : id;
          const target = isCitation ? id : targetNodeId;
          
          if (!newLinks.find(l => 
            (typeof l.source === 'string' ? l.source : (l.source as any).id) === source && 
            (typeof l.target === 'string' ? l.target : (l.target as any).id) === target
          )) {
            newLinks.push({ source, target });
          }
        });
      };
      
      if (data.citations) addNodesAndLinks(data.citations, true);
      if (data.references) addNodesAndLinks(data.references, false);
      
      set({ graphData: { nodes: newNodes, links: newLinks } });
    } catch (err) {
      console.error('Failed to expand node', err);
    }
  },

  bulkExpand: async (type: 'citations' | 'references') => {
    const { graphData, expandNode } = get();
    // Snapshot the nodes to avoid infinite loop
    const nodesToExpand = graphData.nodes
      .filter(n => n.status === 'seed')
      .map(n => n.id);
    
    // Fetch rate limit setting
    let delay = 1000;
    try {
      const res = await fetch('/api/settings');
      const settings = await res.json();
      if (settings.semanticScholarRateLimit) {
        const rateLimit = parseInt(settings.semanticScholarRateLimit);
        if (rateLimit > 0) {
          delay = 1000 / rateLimit;
        }
      }
    } catch (e) {
      console.error('Failed to get rate limit settings', e);
    }
    
    for (const id of nodesToExpand) {
      await expandNode(id, type);
      // Wait calculated delay between requests to respect rate limits
      await new Promise(r => setTimeout(r, delay));
    }
  },

  rebuildEdges: async () => {
    const { activeCollectionId, loadCollectionGraph } = get();
    if (!activeCollectionId) return;

    try {
      const res = await fetch(`/api/collection/${activeCollectionId}/rebuild-edges`, {
        method: 'POST'
      });
      if (res.ok) {
        // Refresh collection to load the new edges
        await loadCollectionGraph(activeCollectionId);
      }
    } catch (err) {
      console.error('Failed to rebuild edges', err);
    }
  }
}),
{
    name: 'graph-store',
    partialize: (state) => ({ 
      activeCollectionId: state.activeCollectionId,
      exploreMode: state.exploreMode,
      searchQuery: state.searchQuery,
      searchResults: state.searchResults
    }),
  }
));
