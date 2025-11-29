import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import mermaid from "mermaid";
import { MdZoomIn, MdZoomOut, MdCenterFocusStrong, MdFullscreen, MdDownload } from "react-icons/md";

// Keep track of rendered IDs to avoid conflicts
let renderCounter = 0;

const DEFAULT_CONFIG = {
  startOnLoad: true,
  theme: "forest",
  logLevel: "fatal",
  securityLevel: "strict",
  arrowMarkerAbsolute: false,
  flowchart: {
    htmlLabels: true,
    curve: "linear",
  },
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
    mirrorActors: true,
    bottomMarginAdj: 1,
    useMaxWidth: true,
    rightAngles: false,
    showSequenceNumbers: false,
  },
  gantt: {
    titleTopMargin: 25,
    barHeight: 20,
    barGap: 4,
    topPadding: 50,
    leftPadding: 75,
    gridLineStartPadding: 35,
    fontSize: 11,
    fontFamily: '"Open-Sans", "sans-serif"',
    numberSectionStyles: 4,
    axisFormat: "%Y-%m-%d",
  },
};

export type Dimensions = {
  width: string | number;
  height: string | number;
};

type MermaidComponentProps = {
  name: string;
  chart: string;
  config?: object;
  initialDimensions: Dimensions;
  isResizable?: boolean;
};

const Mermaid = ({
  name,
  chart = "",
  config = {},
  initialDimensions = {
    width: "100%",
    height: "auto",
  },
  isResizable,
}: MermaidComponentProps) => {
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    mermaid.initialize({ ...DEFAULT_CONFIG, ...config });
  }, []);
  
  useEffect(() => {
    mermaid.contentLoaded();
  }, [config]);

  // Use a unique ID for each render to avoid conflicts
  const uniqueId = useMemo(() => {
    renderCounter++;
    return `mermaid_${name?.replace(/[^a-zA-Z0-9]/g, '_') || 'block'}_${renderCounter}_${Date.now()}`;
  }, [name]);
  
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      if (!chart.trim()) {
        setSvgContent('');
        setError('');
        return;
      }
      
      try {
        const isValid = await mermaid.parse(chart, {
          suppressErrors: true,
        });
        
        if (!isValid) {
          if (isMounted) {
            setError("Invalid mermaid code!");
            setSvgContent('');
          }
          return;
        }
        
        // Use a unique ID for this specific render
        const renderId = `${uniqueId}_${Date.now()}`;
        const { svg } = await mermaid.render(renderId, chart);
        
        if (svg && isMounted) {
          setSvgContent(svg);
          setError('');
        }
      } catch (e) {
        if (isMounted) {
          setError("Error rendering mermaid diagram");
          setSvgContent('');
        }
        console.error('Mermaid render error:', e);
      }
    };
    
    renderChart();
    
    return () => {
      isMounted = false;
    };
  }, [chart, uniqueId]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse drag handlers for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.25), 3));
  }, []);

  // Fullscreen toggle
  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  }, []);

  // Download SVG
  const handleDownload = useCallback(() => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mermaid-diagram-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [svgContent]);

  // Helper to format dimension (add px only for numbers)
  const formatDimension = (dim: string | number): string => {
    if (typeof dim === 'number') return `${dim}px`;
    if (dim === 'auto' || dim.endsWith('px') || dim.endsWith('%')) return dim;
    return dim;
  };

  // Toolbar button style
  const toolbarButtonStyle: React.CSSProperties = {
    padding: '6px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  };

  if (!chart.trim()) {
    return (
      <div style={{ padding: "20px", color: "#888", textAlign: "center" }}>
        Enter mermaid code to see preview...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "#ff6b6b", textAlign: "center", backgroundColor: "#fff5f5", borderRadius: "4px" }}>
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-interactive-container"
      style={{
        width: formatDimension(initialDimensions.width),
        minHeight: "200px",
        position: "relative",
        border: isResizable ? "1px solid #e0e0e0" : "none",
        borderRadius: "8px",
        backgroundColor: "#fafafa",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          display: "flex",
          gap: "4px",
          zIndex: 10,
          background: "rgba(255,255,255,0.9)",
          padding: "4px",
          borderRadius: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <button
          style={toolbarButtonStyle}
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <MdZoomIn size={18} />
        </button>
        <button
          style={toolbarButtonStyle}
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <MdZoomOut size={18} />
        </button>
        <button
          style={toolbarButtonStyle}
          onClick={handleResetView}
          title="Reset View"
        >
          <MdCenterFocusStrong size={18} />
        </button>
        <button
          style={toolbarButtonStyle}
          onClick={handleFullscreen}
          title="Fullscreen"
        >
          <MdFullscreen size={18} />
        </button>
        <button
          style={toolbarButtonStyle}
          onClick={handleDownload}
          title="Download SVG"
        >
          <MdDownload size={18} />
        </button>
        <span
          style={{
            padding: "4px 8px",
            fontSize: "12px",
            color: "#666",
            display: "flex",
            alignItems: "center",
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Diagram container with pan and zoom */}
      <div
        style={{
          overflow: "hidden",
          minHeight: "180px",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "180px",
            padding: "20px",
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </div>
  );
};

export default Mermaid;
