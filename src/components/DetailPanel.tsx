'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { useGraphStore, GraphNode } from '@/store/graphStore';
import { formatAuthors } from '@/lib/formatters';

function PaperPopup({ node, onClose, isRightPanelCollapsed }: { node: GraphNode; onClose: () => void; isRightPanelCollapsed?: boolean }) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const { graphData } = useGraphStore();
  const [hasMovedManually, setHasMovedManually] = useState(false);
  const [pos, setPos] = useState({ x: typeof window !== 'undefined' ? Math.max(360, window.innerWidth - (isRightPanelCollapsed ? 446 : 822)) : 300, y: 80 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  // Reset state when a NEW node is selected
  useEffect(() => { 
    setNotes((node as any).notes || ''); 
    setHasMovedManually(false);
    if (typeof window !== 'undefined') {
      setPos({ x: Math.max(360, window.innerWidth - (isRightPanelCollapsed ? 446 : 822)), y: 80 });
    }
    // We intentionally omit isRightPanelCollapsed here so that toggling the panel
    // doesn't completely reset the popup's Y position or wipe the user's manual drag state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  // Track the panel sliding if the user hasn't manually ripped it away yet
  useEffect(() => {
    if (!hasMovedManually && typeof window !== 'undefined') {
      setPos(prev => ({ ...prev, x: Math.max(360, window.innerWidth - (isRightPanelCollapsed ? 446 : 822)) }));
    }
  }, [isRightPanelCollapsed, hasMovedManually]);

  const getDisplayCitationCount = (n: GraphNode) => {
    const loadedCount = graphData.links.filter(l =>
      (typeof l.target === 'object' ? (l.target as any).id : l.target) === n.id
    ).length;
    return Math.max(n.citationCount || 0, loadedCount);
  };

  const handleSaveNotes = async () => {
    const activeCollectionId = useGraphStore.getState().activeCollectionId;
    if (!activeCollectionId) return;
    
    setIsSaving(true);
    try {
      await fetch(`/api/collection/${node.id}?collectionId=${activeCollectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      
      // Update local store in-place so we don't trigger a full graph/physics reload
      const { graphData, selectedNode, setSelectedNode } = useGraphStore.getState();
      const targetNode = graphData.nodes.find(n => n.id === node.id);
      if (targetNode) {
         (targetNode as any).notes = notes;
      }
      
      if (selectedNode?.id === node.id) {
         // Also update the selected node reference so the UI knows about the change
         const updatedSelectedNode = { ...selectedNode, notes } as any;
         setSelectedNode(updatedSelectedNode);
      }
      
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
      
    } catch (error) {
      console.error('Failed to save notes', error);
    } finally {
      setIsSaving(false);
    }
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setHasMovedManually(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.originX + (ev.clientX - dragRef.current.startX),
        y: dragRef.current.originY + (ev.clientY - dragRef.current.startY)
      });
    };
    const onMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [pos]);

  return (
    <div className="glass-panel" style={{
      position: 'fixed',
      left: pos.x,
      top: pos.y,
      width: '400px',
      maxHeight: '80vh',
      padding: '1.5rem',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      zIndex: 100,
      transition: dragRef.current ? 'none' : 'left 0.3s ease, top 0.3s ease',
    }}>
      {/* Explicit Drag Handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          cursor: 'grab',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '-1rem',
          marginBottom: '-0.5rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          userSelect: 'none'
        }}
      >
        <div style={{ width: '36px', height: '4px', background: 'var(--text-tertiary)', borderRadius: '2px', opacity: 0.5 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1, marginRight: '0.5rem', userSelect: 'text' }}>
          {node.title}
        </h2>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1, flexShrink: 0, marginTop: '-0.2rem' }}
        >
          &times;
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
        <div>
          {node.venue && (
            <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', fontWeight: 500 }}>
              {node.venue}
            </p>
          )}
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {formatAuthors(node.authors)}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
            Published: {node.publicationDate ? new Date(node.publicationDate).toISOString().split('T')[0] : node.year} • {getDisplayCitationCount(node)} citations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {node.url && (
            <a href={node.url} target="_blank" rel="noopener noreferrer" style={{
              padding: '0.4rem 0.8rem', borderRadius: '20px', background: 'var(--accent-primary)',
              color: '#fff', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500
            }}>
              Read Paper
            </a>
          )}
        </div>

        {node.status !== 'seed' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => useGraphStore.getState().addSeedPaper(node as any)}
              style={{
                flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-md)',
                background: 'var(--accent-secondary)', color: '#fff', border: 'none',
                cursor: 'pointer', fontWeight: 500, fontSize: '0.75rem'
              }}
            >
              Add to Collection
            </button>
            <button
              onClick={() => useGraphStore.getState().removeNode(node.id)}
              style={{
                flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-md)',
                background: 'transparent', color: '#ef4444', border: '1px solid #ef4444',
                cursor: 'pointer', fontWeight: 500, fontSize: '0.75rem'
              }}
            >
              Remove from Graph
            </button>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Abstract</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {node.abstract || 'No abstract available.'}
          </p>
        </div>

        <div>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Local Notes</h3>
          <div style={{ position: 'relative' }}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                  e.preventDefault();
                  handleSaveNotes();
                }
              }}
              placeholder="Add your personal notes here... (Ctrl+S to save)"
              style={{
                width: '100%', minHeight: '80px', padding: '0.75rem',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)',
                background: 'var(--bg-surface)', color: 'var(--text-primary)',
                resize: 'vertical', outline: 'none', fontFamily: 'inherit', fontSize: '0.85rem'
              }}
            />
            {showSaved && (
              <div style={{
                position: 'absolute', top: '0.5rem', right: '0.5rem',
                background: 'rgba(16, 185, 129, 0.9)', color: 'white',
                padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem',
                fontWeight: 600, pointerEvents: 'none',
                opacity: showSaved ? 1 : 0, transition: 'opacity 0.3s'
              }}>
                Saved ✓
              </div>
            )}
          </div>
          <button
            onClick={handleSaveNotes}
            disabled={isSaving}
            style={{
              marginTop: '0.5rem', width: '100%', padding: '0.5rem',
              borderRadius: 'var(--radius-md)', background: isSaving ? 'var(--bg-surface)' : (showSaved ? '#10b981' : 'var(--accent-secondary)'),
              color: isSaving ? 'var(--text-secondary)' : '#fff', border: isSaving ? '1px solid var(--border-strong)' : 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 500,
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            {isSaving ? 'Saving...' : showSaved ? 'Saved!' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DetailPanel() {
  const { selectedNode, setSelectedNode, activeCollectionId, graphData, relatedFilter, setRelatedFilter, edgeFilter, setEdgeFilter, focusedNodeId } = useGraphStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const scrollPositionRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!selectedNode && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [selectedNode]);

  const getDisplayCitationCount = (node: GraphNode) => {
    const loadedCount = graphData.links.filter(l =>
      (typeof l.target === 'object' ? (l.target as any).id : l.target) === node.id
    ).length;
    return Math.max(node.citationCount || 0, loadedCount);
  };

  if (!activeCollectionId) return null;

  let visibleIds: Set<string> | null = null;
  if (focusedNodeId) {
    visibleIds = new Set<string>();
    visibleIds.add(focusedNodeId);
    graphData.links.forEach(l => {
      const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      if (sId === focusedNodeId) visibleIds!.add(tId);
      if (tId === focusedNodeId) visibleIds!.add(sId);
    });
  }

  const collectionNodes = graphData.nodes.filter(n => n.status === 'seed' && (!visibleIds || visibleIds.has(n.id)));
  const allRelatedNodes = graphData.nodes.filter(n => n.status !== 'seed' && (!visibleIds || visibleIds.has(n.id)));
  
  const filteredRelatedNodes = allRelatedNodes.filter(n => {
    if (!relatedFilter) return true;
    const q = relatedFilter.toLowerCase();
    const authorsStr = Array.isArray(n.authors) ? n.authors.join(', ') : (n.authors || '');
    return n.title.toLowerCase().includes(q) || authorsStr.toLowerCase().includes(q);
  });

  const maxEdges = useMemo(() => {
    const counts = new Map<string, number>();
    const nodeIds = new Set(graphData.nodes.map(n => n.id));
    const collectionIds = new Set(
      graphData.nodes.filter(n => n.status === 'seed' || n.status === 'collection').map(n => n.id)
    );
    
    graphData.links.forEach(l => {
      const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      
      if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
        if (collectionIds.has(targetId)) {
          counts.set(sourceId, (counts.get(sourceId) || 0) + 1);
        }
        if (collectionIds.has(sourceId)) {
          counts.set(targetId, (counts.get(targetId) || 0) + 1);
        }
      }
    });

    let max = 1;
    for (const [id, count] of counts.entries()) {
      const node = graphData.nodes.find(n => n.id === id);
      // The edge filter is only applied to NON-SEED nodes,
      // so the max value on the slider should reflect the max of non-seed nodes.
      if (node && node.status !== 'seed') {
        if (count > max) max = count;
      }
    }
    return max;
  }, [graphData.nodes, graphData.links]);
  const useLogScale = maxEdges > 20;
  
  const stepToValue = (step: number) => {
    if (!useLogScale) return step;
    if (step === 0) return 1;
    return Math.round(Math.pow(maxEdges, step / 100));
  };
  
  const valueToStep = (val: number) => {
    if (!useLogScale) return val;
    if (val <= 1) return 0;
    return Math.round(100 * Math.log(val) / Math.log(maxEdges));
  };

  return (
    <>
      {/* Sidebar — wrapper for toggle animation */}
      <div style={{
        position: 'absolute',
        right: isCollapsed ? '-360px' : '1rem',
        top: '1rem',
        bottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        zIndex: 10,
        transition: 'right 0.3s ease',
      }}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="glass-panel"
          style={{
             width: '30px', height: '60px', marginRight: '0.5rem', 
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             cursor: 'pointer', border: 'none', borderRadius: '8px 0 0 8px',
             color: 'var(--text-primary)', fontWeight: 'bold'
          }}
        >
          {isCollapsed ? '<' : '>'}
        </button>
        
        <div className="glass-panel" style={{
          width: '360px',
          height: '100%',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflow: 'hidden'
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Collection Papers
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {collectionNodes.length} papers in this collection
          </p>

        {collectionNodes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => useGraphStore.getState().bulkExpand('citations')}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-primary)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.75rem'
                }}
              >
                Bulk Load Citations
              </button>
              <button
                onClick={() => useGraphStore.getState().bulkExpand('references')}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-secondary)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.75rem'
                }}
              >
                Bulk Load References
              </button>
            </div>
            <button
              onClick={() => {
                const btn = document.getElementById('rebuild-btn');
                if (btn) btn.innerText = 'Rebuilding...';
                useGraphStore.getState().rebuildEdges().then(() => {
                  if (btn) btn.innerText = 'Rebuild Cross-Edges';
                });
              }}
              id="rebuild-btn"
              style={{
                width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)',
                background: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--border-strong)', cursor: 'pointer', fontWeight: 500, fontSize: '0.75rem'
              }}
            >
              Rebuild Cross-Edges
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Minimum Connections</label>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{edgeFilter}</span>
          </div>
          <input
            type="range"
            min={useLogScale ? 0 : 1}
            max={useLogScale ? 100 : maxEdges}
            step="1"
            value={valueToStep(edgeFilter)}
            onChange={(e) => setEdgeFilter(stepToValue(parseInt(e.target.value)))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={(e) => { scrollPositionRef.current = e.currentTarget.scrollTop; }}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}
        >
          {collectionNodes.map(node => (
            <div key={node.id}
              onClick={() => setSelectedNode(node)}
              style={{
                padding: '0.75rem', background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
            >
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{node.title}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {node.year} • {getDisplayCitationCount(node)} citations
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Are you sure you want to remove this paper from your collection?")) {
                      useGraphStore.getState().removeNode(node.id);
                    }
                  }}
                  style={{
                    padding: '0.25rem 0.5rem', background: 'transparent',
                    color: '#ef4444', border: '1px solid #ef4444',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {collectionNodes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
              No papers added yet. Search on the left to add some!
            </div>
          )}

          {allRelatedNodes.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem', marginBottom: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Related Papers
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {allRelatedNodes.length} citations and references
                  </p>
                </div>
                <button
                  onClick={() => useGraphStore.getState().clearRelatedNodes()}
                  style={{
                    padding: '0.25rem 0.5rem', background: 'transparent',
                    color: 'var(--text-secondary)', border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem'
                  }}
                >
                  Clear Graph
                </button>
              </div>



              <input
                type="text"
                placeholder="Search title or author..."
                value={relatedFilter}
                onChange={(e) => setRelatedFilter(e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem 0.75rem', marginBottom: '0.5rem',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface)', color: 'var(--text-primary)',
                  outline: 'none', fontSize: '0.85rem'
                }}
              />

              {filteredRelatedNodes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  No related papers match your search.
                </div>
              ) : (
                filteredRelatedNodes.map(node => (
                  <div key={node.id}
                    onClick={() => setSelectedNode(node)}
                    style={{
                      padding: '0.75rem', background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
                      cursor: 'pointer', opacity: 0.8
                    }}
                  >
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{node.title}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {node.year} • {getDisplayCitationCount(node)} citations
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          useGraphStore.getState().addSeedPaper(node as any);
                        }}
                        style={{
                          padding: '0.25rem 0.5rem', background: 'var(--accent-primary)',
                          color: 'white', border: 'none',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem'
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>

      {/* Floating draggable popup — only when a node is selected */}
      {selectedNode && (
        <PaperPopup node={selectedNode} onClose={() => setSelectedNode(null)} isRightPanelCollapsed={isCollapsed} />
      )}
    </>
  );
}
