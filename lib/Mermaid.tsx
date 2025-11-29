import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import mermaid from "mermaid";
import { MdZoomIn, MdZoomOut, MdCenterFocusStrong, MdFullscreen, MdFullscreenExit, MdDownload } from "react-icons/md";

// Keep track of rendered IDs to avoid conflicts
let renderCounter = 0;

// Breakpoint definitions
const BREAKPOINTS = {
  sm: 400,   // Small (compact)
  md: 600,   // Medium
  lg: 900,   // Large
};

// Custom hook to detect container width
const useContainerWidth = (ref: React.RefObject<HTMLDivElement | null>) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(element);
    setWidth(element.offsetWidth);

    return () => resizeObserver.disconnect();
  }, [ref]);

  return width;
};

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
  isResizable?: boolean;
  showToolbar?: boolean;
};

const Mermaid = ({
  name,
  chart = "",
  config = {},
  isResizable,
  showToolbar = true,
}: MermaidComponentProps) => {
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  // Responsive width detection
  const containerWidth = useContainerWidth(containerRef);
  const isCompact = containerWidth > 0 && containerWidth < BREAKPOINTS.sm;
  const isMedium = containerWidth >= BREAKPOINTS.sm && containerWidth < BREAKPOINTS.md;
  
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

  // Zoom controls - using buttons only to avoid browser conflicts
  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleResetView = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse drag handlers for panning - only within the diagram area
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag if left click and not on a button
    if (e.button === 0 && (e.target as HTMLElement).closest('.mermaid-diagram-area')) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Fullscreen toggle with state tracking
  const handleFullscreen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    }
  }, []);

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Use refs to track state in event listeners without causing re-renders
  const stateRef = useRef({ isPinching, isDragging, lastPinchDistance, pan, dragStart, zoom });
  useEffect(() => {
    stateRef.current = { isPinching, isDragging, lastPinchDistance, pan, dragStart, zoom };
  }, [isPinching, isDragging, lastPinchDistance, pan, dragStart, zoom]);

  // Attach touch and wheel event listeners with { passive: false } to allow preventDefault
  useEffect(() => {
    const element = diagramRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        setIsPinching(true);
        setLastPinchDistance(getTouchDistance(e.touches));
      } else if (e.touches.length === 1) {
        // Single touch for pan
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - stateRef.current.pan.x,
          y: e.touches[0].clientY - stateRef.current.pan.y,
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const { isPinching: pinching, isDragging: dragging, lastPinchDistance: lastDist, dragStart: start } = stateRef.current;
      
      if (pinching && e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        if (lastDist > 0) {
          const scale = currentDistance / lastDist;
          setZoom(prev => {
            const newZoom = prev * scale;
            return Math.min(Math.max(newZoom, 0.25), 3);
          });
        }
        setLastPinchDistance(currentDistance);
      } else if (dragging && e.touches.length === 1) {
        e.preventDefault();
        setPan({
          x: e.touches[0].clientX - start.x,
          y: e.touches[0].clientY - start.y,
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        setIsPinching(false);
        setLastPinchDistance(0);
      }
      if (e.touches.length === 0) {
        setIsDragging(false);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Check if it's a pinch gesture (Ctrl key is held on trackpad pinch)
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(prev => Math.min(Math.max(prev + delta, 0.25), 3));
      }
    };

    // Add event listeners with { passive: false } to allow preventDefault
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [getTouchDistance]);

  // Download SVG
  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mermaid-diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [svgContent]);

  // Responsive toolbar button styles
  const toolbarButtonStyle: React.CSSProperties = useMemo(() => ({
    padding: isCompact ? '4px' : isMedium ? '6px' : '8px',
    border: '1px solid #ddd',
    borderRadius: isCompact ? '4px' : isMedium ? '6px' : '8px',
    background: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease-in-out',
    minWidth: isCompact ? '24px' : isMedium ? '30px' : '38px',
    minHeight: isCompact ? '24px' : isMedium ? '30px' : '38px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
  }), [isCompact, isMedium]);

  // Icon size based on container width
  const iconSize = isCompact ? 14 : isMedium ? 18 : 22;

  // Hover handler for toolbar buttons
  const handleToolbarButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isHover: boolean) => {
    const btn = e.currentTarget;
    if (isHover) {
      btn.style.transform = 'translateY(-1px)';
      btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
      btn.style.background = '#f8f9fa';
    } else {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
      btn.style.background = 'white';
    }
  };

  const handleToolbarButtonActive = (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => {
    const btn = e.currentTarget;
    if (isActive) {
      btn.style.transform = 'scale(0.95)';
      btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
    } else {
      btn.style.transform = 'translateY(-1px)';
      btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
    }
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
        width: "100%",
        minHeight: showToolbar ? (isCompact ? "120px" : isMedium ? "140px" : "160px") : "auto",
        position: "relative",
        border: isResizable ? "1px solid #e0e0e0" : "none",
        borderRadius: isCompact ? "8px" : "10px",
        backgroundColor: isFullscreen ? "#fff" : (showToolbar ? "#fafafa" : "transparent"),
      }}
    >
      {/* Toolbar - responsive positioning and sizing */}
      {showToolbar && (
        <div
          className="mermaid-toolbar"
          style={{
            position: "absolute",
            bottom: isCompact ? "6px" : isMedium ? "10px" : "12px",
            right: isCompact ? "6px" : isMedium ? "10px" : "12px",
            display: "flex",
            gap: isCompact ? "2px" : isMedium ? "4px" : "6px",
            zIndex: 100,
            background: "rgba(255,255,255,0.95)",
            padding: isCompact ? "3px 4px" : isMedium ? "5px 6px" : "8px 10px",
            borderRadius: isCompact ? "6px" : isMedium ? "8px" : "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            border: "1px solid #e9ecef",
            flexWrap: "nowrap",
          }}
        >
          <button
            style={toolbarButtonStyle}
            onClick={handleZoomOut}
            title="Zoom Out"
            type="button"
            onMouseEnter={(e) => handleToolbarButtonHover(e, true)}
            onMouseLeave={(e) => handleToolbarButtonHover(e, false)}
            onMouseDown={(e) => handleToolbarButtonActive(e, true)}
            onMouseUp={(e) => handleToolbarButtonActive(e, false)}
          >
            <MdZoomOut size={iconSize} />
          </button>
          <span
            style={{
              padding: isCompact ? "2px 4px" : isMedium ? "4px 6px" : "5px 8px",
              fontSize: isCompact ? "9px" : isMedium ? "11px" : "13px",
              color: "#333",
              display: "flex",
              alignItems: "center",
              fontWeight: 600,
              minWidth: isCompact ? "28px" : isMedium ? "36px" : "48px",
              justifyContent: "center",
              background: "#f1f3f5",
              borderRadius: isCompact ? "4px" : "6px",
              border: "1px solid #e9ecef",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            style={toolbarButtonStyle}
            onClick={handleZoomIn}
            title="Zoom In"
            type="button"
            onMouseEnter={(e) => handleToolbarButtonHover(e, true)}
            onMouseLeave={(e) => handleToolbarButtonHover(e, false)}
            onMouseDown={(e) => handleToolbarButtonActive(e, true)}
            onMouseUp={(e) => handleToolbarButtonActive(e, false)}
          >
            <MdZoomIn size={iconSize} />
          </button>
          {/* Show separator and extra buttons only on medium+ screens */}
          {!isCompact && (
            <>
              <div style={{ width: "1px", background: "#e9ecef", margin: "0 2px", alignSelf: "stretch" }} />
              <button
                style={toolbarButtonStyle}
                onClick={handleResetView}
                title="Reset View"
                type="button"
                onMouseEnter={(e) => handleToolbarButtonHover(e, true)}
                onMouseLeave={(e) => handleToolbarButtonHover(e, false)}
                onMouseDown={(e) => handleToolbarButtonActive(e, true)}
                onMouseUp={(e) => handleToolbarButtonActive(e, false)}
              >
                <MdCenterFocusStrong size={iconSize} />
              </button>
              <button
                style={toolbarButtonStyle}
                onClick={handleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                type="button"
                onMouseEnter={(e) => handleToolbarButtonHover(e, true)}
                onMouseLeave={(e) => handleToolbarButtonHover(e, false)}
                onMouseDown={(e) => handleToolbarButtonActive(e, true)}
                onMouseUp={(e) => handleToolbarButtonActive(e, false)}
              >
                {isFullscreen ? <MdFullscreenExit size={iconSize} /> : <MdFullscreen size={iconSize} />}
              </button>
            </>
          )}
          <button
            style={{
              ...toolbarButtonStyle,
              background: "linear-gradient(135deg, #4dabf7 0%, #339af0 100%)",
              color: "white",
              border: "none",
              boxShadow: "0 1px 4px rgba(77, 171, 247, 0.25)",
            }}
            onClick={handleDownload}
            title="Download as SVG"
            type="button"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(77, 171, 247, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(77, 171, 247, 0.25)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
          >
            <MdDownload size={iconSize} />
          </button>
        </div>
      )}

      {/* Diagram container with pan and zoom */}
      <div
        className="mermaid-diagram-area"
        ref={diagramRef}
        style={{
          overflow: "hidden",
          minHeight: isFullscreen ? "100vh" : (showToolbar ? (isCompact ? "80px" : isMedium ? "100px" : "120px") : "auto"),
          cursor: showToolbar ? (isDragging ? "grabbing" : "grab") : "default",
          paddingTop: isCompact ? "6px" : "10px",
          paddingBottom: showToolbar ? (isCompact ? "36px" : isMedium ? "42px" : "50px") : "10px",
          touchAction: showToolbar ? "none" : "auto",
        }}
        onMouseDown={showToolbar ? handleMouseDown : undefined}
        onMouseMove={showToolbar ? handleMouseMove : undefined}
        onMouseUp={showToolbar ? handleMouseUp : undefined}
        onMouseLeave={showToolbar ? handleMouseUp : undefined}
      >
        <div
          style={{
            transform: showToolbar ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : "none",
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: isFullscreen ? "calc(100vh - 80px)" : (showToolbar ? (isCompact ? "60px" : "80px") : "auto"),
            padding: isCompact ? "6px" : "10px",
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      {/* Pan/Zoom hint - only show on larger screens */}
      {showToolbar && isResizable && !isCompact && (
        <div
          style={{
            position: "absolute",
            bottom: isMedium ? "6px" : "8px",
            left: isMedium ? "6px" : "8px",
            fontSize: isMedium ? "9px" : "10px",
            color: "#868e96",
            background: "rgba(255,255,255,0.9)",
            padding: isMedium ? "3px 6px" : "4px 8px",
            borderRadius: "6px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            border: "1px solid #e9ecef",
            fontWeight: 500,
          }}
        >
          {isMedium ? "Drag • Pinch" : "Drag to pan • Pinch to zoom"}
        </div>
      )}
    </div>
  );
};

export default Mermaid;
