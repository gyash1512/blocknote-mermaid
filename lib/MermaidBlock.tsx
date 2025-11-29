import { createReactBlockSpec } from "@blocknote/react";
import {
  BlockNoteEditor,
  insertOrUpdateBlock,
  PropSchema,
  defaultProps,
  BlockConfig,
} from "@blocknote/core";
import Mermaid from "./Mermaid";
import { MdNote, MdCode, MdExpandMore, MdExpandLess, MdLock, MdLockOpen, MdEdit, MdUnfoldMore, MdUnfoldLess } from "react-icons/md";
import ReactCodeMirror from "@uiw/react-codemirror";
import { mermaid as mermaidLang } from "codemirror-lang-mermaid";
import { MERMAID_EXAMPLES, MermaidExample } from "./example";
import { useMemo, useCallback, useState, useRef, useEffect } from "react";

// Breakpoint definitions
const BREAKPOINTS = {
  sm: 400,
  md: 600,
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

const TYPE = "mermaid" as const;

const DEFAULT_MERMAID_CODE = `flowchart TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]`;

const mermaidPropSchema = {
  ...defaultProps,
  data: {
    default: DEFAULT_MERMAID_CODE as string,
  },
  title: {
    default: "Untitled Diagram" as string,
  },
  collapsed: {
    default: "false" as string,
  },
  locked: {
    default: "false" as string,
  },
} satisfies PropSchema;

// Export the prop schema for use in types
export type MermaidBlockProps = typeof mermaidPropSchema;

export const MermaidBlock = createReactBlockSpec(
  {
    type: TYPE,
    propSchema: mermaidPropSchema,
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const isReadOnly = useMemo(() => !editor.isEditable, [editor]);
      const { data, locked, title, collapsed } = block.props;
      const isLocked = locked === "true";
      const isCollapsed = collapsed === "true";

      // Container ref for responsive width detection
      const containerRef = useRef<HTMLDivElement>(null);
      const containerWidth = useContainerWidth(containerRef);
      const isCompact = containerWidth > 0 && containerWidth < BREAKPOINTS.sm;
      const isMedium = containerWidth >= BREAKPOINTS.sm && containerWidth < BREAKPOINTS.md;

      const onInputChange = useCallback((val: string) => {
        editor.updateBlock(block, {
          props: { ...block.props, data: val },
        });
      }, [editor, block]);

      const onTitleChange = useCallback((val: string) => {
        editor.updateBlock(block, {
          props: { ...block.props, title: val },
        });
      }, [editor, block]);

      const toggleLock = useCallback(() => {
        editor.updateBlock(block, {
          props: { ...block.props, locked: isLocked ? "false" : "true" },
        });
      }, [editor, block, isLocked]);

      const toggleCollapse = useCallback(() => {
        editor.updateBlock(block, {
          props: { ...block.props, collapsed: isCollapsed ? "false" : "true" },
        });
      }, [editor, block, isCollapsed]);

      // Use the dedicated mermaid language extension
      const mermaidExtension = mermaidLang();
      
      // Local state for UI
      const [showEditor, setShowEditor] = useState(true);
      const [showExamples, setShowExamples] = useState(false);
      const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
      const [isEditingTitle, setIsEditingTitle] = useState(false);

      // Responsive icon sizes
      const iconSize = isCompact ? 12 : isMedium ? 16 : 20;
      
      // Group examples by category
      const examplesByCategory = useMemo(() => {
        const grouped: Record<string, MermaidExample[]> = {};
        MERMAID_EXAMPLES.forEach((example) => {
          if (!grouped[example.category]) {
            grouped[example.category] = [];
          }
          grouped[example.category].push(example);
        });
        return grouped;
      }, []);
      
      const categories = useMemo(() => Object.keys(examplesByCategory), [examplesByCategory]);

      // Responsive button styles based on container width
      const buttonStyle: React.CSSProperties = useMemo(() => ({
        padding: isCompact ? '4px 6px' : isMedium ? '6px 10px' : '8px 14px',
        border: '1px solid #ddd',
        borderRadius: isCompact ? '4px' : isMedium ? '6px' : '8px',
        background: 'white',
        cursor: 'pointer',
        fontSize: isCompact ? '10px' : isMedium ? '12px' : '14px',
        display: 'flex',
        alignItems: 'center',
        gap: isCompact ? '3px' : isMedium ? '5px' : '6px',
        transition: 'all 0.15s ease-in-out',
        fontWeight: 500,
        minHeight: isCompact ? '26px' : isMedium ? '32px' : '40px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        userSelect: 'none' as const,
        WebkitTapHighlightColor: 'transparent',
        whiteSpace: 'nowrap' as const,
      }), [isCompact, isMedium]);
      
      const categoryButtonStyle = useCallback((isActive: boolean): React.CSSProperties => ({
        padding: isCompact ? '3px 6px' : isMedium ? '4px 10px' : '6px 14px',
        border: isActive ? '2px solid #4dabf7' : '1px solid #ddd',
        borderRadius: isCompact ? '10px' : isMedium ? '14px' : '16px',
        background: isActive ? '#e7f5ff' : 'white',
        color: isActive ? '#1c7ed6' : '#495057',
        cursor: 'pointer',
        fontSize: isCompact ? '9px' : isMedium ? '11px' : '13px',
        fontWeight: isActive ? 600 : 500,
        transition: 'all 0.15s ease-in-out',
        minHeight: isCompact ? '22px' : isMedium ? '28px' : '34px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isActive ? '0 2px 4px rgba(77, 171, 247, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
        userSelect: 'none' as const,
        WebkitTapHighlightColor: 'transparent',
      }), [isCompact, isMedium]);
      
      const exampleCardStyle: React.CSSProperties = useMemo(() => ({
        padding: isCompact ? '6px 8px' : isMedium ? '8px 12px' : '12px 16px',
        border: '1px solid #e9ecef',
        borderRadius: isCompact ? '6px' : isMedium ? '8px' : '10px',
        background: 'white',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease-in-out',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        userSelect: 'none' as const,
        WebkitTapHighlightColor: 'transparent',
      }), [isCompact, isMedium]);

      // Hover handler for buttons
      const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isHover: boolean) => {
        const btn = e.currentTarget;
        if (isHover) {
          btn.style.transform = 'translateY(-1px)';
          btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        } else {
          btn.style.transform = 'translateY(0)';
          btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        }
      };

      // Active handler for buttons
      const handleButtonActive = (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => {
        const btn = e.currentTarget;
        if (isActive) {
          btn.style.transform = 'translateY(0) scale(0.98)';
          btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
        } else {
          btn.style.transform = 'translateY(-1px)';
          btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        }
      };

      // Collapsed view - shows a compact bar with title and Mermaid badge
      if (isCollapsed) {
        return (
          <div
            ref={containerRef}
            onClick={toggleCollapse}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isCompact ? "8px 10px" : isMedium ? "12px 16px" : "16px 20px",
              borderRadius: isCompact ? "8px" : isMedium ? "10px" : "12px",
              border: "1px solid #e9ecef",
              background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              userSelect: "none",
              flexWrap: "wrap",
              gap: isCompact ? "6px" : isMedium ? "10px" : "12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4dabf7';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(77, 171, 247, 0.15)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e9ecef';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: isCompact ? "6px" : isMedium ? "12px" : "14px", flex: "1 1 auto", minWidth: 0 }}>
              <div
                style={{
                  width: isCompact ? "22px" : isMedium ? "28px" : "36px",
                  height: isCompact ? "22px" : isMedium ? "28px" : "36px",
                  borderRadius: isCompact ? "6px" : isMedium ? "8px" : "10px",
                  background: "linear-gradient(135deg, #4dabf7 0%, #339af0 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  boxShadow: "0 2px 6px rgba(77, 171, 247, 0.3)",
                  flexShrink: 0,
                }}
              >
                <MdNote size={isCompact ? 12 : isMedium ? 16 : 20} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: isCompact ? "11px" : isMedium ? "14px" : "16px", color: "#212529", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {title || "Untitled Diagram"}
                </div>
                {!isCompact && (
                  <div style={{ fontSize: isMedium ? "11px" : "13px", color: "#868e96", marginTop: isMedium ? "2px" : "3px" }}>
                    Click to expand
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: isCompact ? "4px" : isMedium ? "8px" : "10px", flexShrink: 0 }}>
              {isLocked && !isCompact && (
                <span style={{
                  background: '#fff3bf',
                  color: '#e67700',
                  padding: isCompact ? '2px 5px' : isMedium ? '3px 10px' : '4px 12px',
                  borderRadius: isCompact ? '6px' : isMedium ? '8px' : '10px',
                  fontSize: isCompact ? '8px' : isMedium ? '11px' : '13px',
                  fontWeight: 600,
                }}>
                  Locked
                </span>
              )}
              <span
                style={{
                  background: "linear-gradient(135deg, #4dabf7 0%, #339af0 100%)",
                  color: "white",
                  padding: isCompact ? "3px 6px" : isMedium ? "4px 10px" : "6px 14px",
                  borderRadius: isCompact ? "10px" : isMedium ? "14px" : "16px",
                  fontSize: isCompact ? "8px" : isMedium ? "11px" : "13px",
                  fontWeight: 600,
                  boxShadow: "0 2px 6px rgba(77, 171, 247, 0.3)",
                }}
              >
                Mermaid
              </span>
              <MdUnfoldMore size={isCompact ? 12 : isMedium ? 18 : 22} color="#868e96" />
            </div>
          </div>
        );
      }

      return (
        <div
          ref={containerRef}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? "8px" : isMedium ? "10px" : "12px",
            border: !isReadOnly ? "1px solid #dee2e6" : "none",
            padding: !isReadOnly ? (isCompact ? "10px" : isMedium ? "12px" : "14px") : "0",
            borderRadius: isCompact ? "8px" : "10px",
            width: "100%",
            backgroundColor: !isReadOnly ? (isLocked ? "#f1f3f5" : "#f8f9fa") : "transparent",
            boxSizing: "border-box",
          }}
        >
          {/* Title Section */}
          {!isReadOnly && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: isCompact ? "6px" : "8px",
                paddingBottom: isCompact ? "8px" : "10px",
                borderBottom: "1px solid #e9ecef",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: isCompact ? "20px" : isMedium ? "26px" : "32px",
                  height: isCompact ? "20px" : isMedium ? "26px" : "32px",
                  borderRadius: isCompact ? "4px" : isMedium ? "6px" : "8px",
                  background: "linear-gradient(135deg, #4dabf7 0%, #339af0 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  flexShrink: 0,
                }}
              >
                <MdNote size={isCompact ? 10 : isMedium ? 14 : 18} />
              </div>
              {isEditingTitle ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false);
                    }
                  }}
                  autoFocus
                  style={{
                    flex: 1,
                    minWidth: "80px",
                    fontSize: isCompact ? "11px" : isMedium ? "14px" : "16px",
                    fontWeight: 600,
                    color: "#212529",
                    border: "2px solid #4dabf7",
                    borderRadius: isCompact ? "4px" : "6px",
                    padding: isCompact ? "4px 6px" : "6px 10px",
                    outline: "none",
                    background: "white",
                  }}
                  placeholder="Enter title..."
                />
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: isCompact ? "4px" : "6px",
                    cursor: !isLocked ? "pointer" : "default",
                    minWidth: 0,
                  }}
                  onClick={() => !isLocked && setIsEditingTitle(true)}
                >
                  <span style={{ fontSize: isCompact ? "11px" : isMedium ? "14px" : "16px", fontWeight: 600, color: "#212529", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {title || "Untitled Diagram"}
                  </span>
                  {!isLocked && !isCompact && (
                    <MdEdit size={isCompact ? 10 : isMedium ? 14 : 18} color="#868e96" style={{ opacity: 0.6, flexShrink: 0 }} />
                  )}
                </div>
              )}
              <button
                style={{
                  ...buttonStyle,
                  padding: isCompact ? "3px 5px" : isMedium ? "6px 10px" : "8px 12px",
                  minHeight: isCompact ? "22px" : isMedium ? "32px" : "38px",
                  background: "#f8f9fa",
                  borderColor: "#ddd",
                }}
                onClick={toggleCollapse}
                title="Collapse diagram"
                onMouseEnter={(e) => handleButtonHover(e, true)}
                onMouseLeave={(e) => handleButtonHover(e, false)}
              >
                <MdUnfoldLess size={isCompact ? 10 : isMedium ? 16 : 20} />
                {!isCompact && <span style={{ fontSize: isCompact ? "9px" : isMedium ? "12px" : "14px" }}>Collapse</span>}
              </button>
            </div>
          )}

          {/* Toolbar */}
          {!isReadOnly && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e9ecef",
                paddingBottom: isCompact ? "8px" : "10px",
                flexWrap: "wrap",
                gap: isCompact ? "6px" : "8px",
              }}
            >
              <div style={{ display: "flex", gap: isCompact ? "4px" : "6px", flexWrap: "wrap" }}>
                {!isLocked && (
                  <>
                    <button
                      style={{
                        ...buttonStyle,
                        background: showEditor ? '#e7f5ff' : 'white',
                        borderColor: showEditor ? '#4dabf7' : '#ddd',
                        color: showEditor ? '#1c7ed6' : '#495057',
                      }}
                      onClick={() => setShowEditor(!showEditor)}
                      onMouseEnter={(e) => handleButtonHover(e, true)}
                      onMouseLeave={(e) => handleButtonHover(e, false)}
                      onMouseDown={(e) => handleButtonActive(e, true)}
                      onMouseUp={(e) => handleButtonActive(e, false)}
                    >
                      <MdCode size={iconSize} />
                      {!isCompact && <span>{showEditor ? 'Hide' : 'Editor'}</span>}
                    </button>
                    <button
                      style={{
                        ...buttonStyle,
                        background: showExamples ? '#e7f5ff' : 'white',
                        borderColor: showExamples ? '#4dabf7' : '#ddd',
                        color: showExamples ? '#1c7ed6' : '#495057',
                      }}
                      onClick={() => setShowExamples(!showExamples)}
                      onMouseEnter={(e) => handleButtonHover(e, true)}
                      onMouseLeave={(e) => handleButtonHover(e, false)}
                      onMouseDown={(e) => handleButtonActive(e, true)}
                      onMouseUp={(e) => handleButtonActive(e, false)}
                    >
                      {showExamples ? <MdExpandLess size={iconSize} /> : <MdExpandMore size={iconSize} />}
                      {!isCompact && <span>Templates</span>}
                    </button>
                  </>
                )}
                <button
                  style={{
                    ...buttonStyle,
                    background: isLocked ? '#fff3bf' : 'white',
                    borderColor: isLocked ? '#fab005' : '#ddd',
                    color: isLocked ? '#e67700' : '#495057',
                  }}
                  onClick={toggleLock}
                  title={isLocked ? 'Unlock to edit' : 'Lock to prevent editing'}
                  onMouseEnter={(e) => handleButtonHover(e, true)}
                  onMouseLeave={(e) => handleButtonHover(e, false)}
                  onMouseDown={(e) => handleButtonActive(e, true)}
                  onMouseUp={(e) => handleButtonActive(e, false)}
                >
                  {isLocked ? <MdLock size={iconSize} /> : <MdLockOpen size={iconSize} />}
                  {!isCompact && <span>{isLocked ? 'Locked' : 'Lock'}</span>}
                </button>
              </div>
              <div style={{ fontSize: isCompact ? '9px' : '11px', color: '#868e96', display: 'flex', alignItems: 'center', gap: isCompact ? '4px' : '6px', fontWeight: 500 }}>
                {isLocked && !isCompact && (
                  <span style={{
                    background: '#fff3bf',
                    color: '#e67700',
                    padding: isCompact ? '1px 5px' : '2px 8px',
                    borderRadius: isCompact ? '6px' : '8px',
                    fontSize: isCompact ? '8px' : '10px',
                    fontWeight: 600,
                  }}>
                    View Only
                  </span>
                )}
                <span
                  style={{
                    background: "linear-gradient(135deg, #4dabf7 0%, #339af0 100%)",
                    color: "white",
                    padding: isCompact ? "2px 5px" : "3px 8px",
                    borderRadius: isCompact ? "8px" : "10px",
                    fontSize: isCompact ? "8px" : "10px",
                    fontWeight: 600,
                  }}
                >
                  Mermaid
                </span>
              </div>
            </div>
          )}
          
          {/* Examples Section */}
          {!isReadOnly && !isLocked && showExamples && (
            <div
              style={{
                background: 'white',
                borderRadius: isCompact ? '8px' : '10px',
                padding: isCompact ? '8px' : isMedium ? '10px' : '12px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              {/* Category Tabs */}
              <div style={{ display: 'flex', gap: isCompact ? '4px' : '6px', marginBottom: isCompact ? '8px' : '12px', flexWrap: 'wrap' }}>
                <button
                  style={categoryButtonStyle(selectedCategory === null)}
                  onClick={() => setSelectedCategory(null)}
                  onMouseEnter={(e) => {
                    if (selectedCategory !== null) {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== null) {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    style={categoryButtonStyle(selectedCategory === cat)}
                    onClick={() => setSelectedCategory(cat)}
                    onMouseEnter={(e) => {
                      if (selectedCategory !== cat) {
                        e.currentTarget.style.background = '#f8f9fa';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCategory !== cat) {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              {/* Example Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isCompact ? 'repeat(auto-fill, minmax(100px, 1fr))' : 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: isCompact ? '6px' : '8px',
                  maxHeight: isCompact ? '140px' : '180px',
                  overflowY: 'auto',
                  padding: '2px',
                }}
              >
                {MERMAID_EXAMPLES
                  .filter((ex) => !selectedCategory || ex.category === selectedCategory)
                  .map((example) => (
                    <div
                      key={example.name}
                      style={exampleCardStyle}
                      onClick={() => {
                        onInputChange(example.code);
                        setShowExamples(false);
                      }}
                      onMouseEnter={(e) => {
                        const card = e.currentTarget;
                        card.style.borderColor = '#4dabf7';
                        card.style.background = '#f8f9fa';
                        card.style.transform = 'translateY(-2px)';
                        card.style.boxShadow = '0 4px 12px rgba(77, 171, 247, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        const card = e.currentTarget;
                        card.style.borderColor = '#e9ecef';
                        card.style.background = 'white';
                        card.style.transform = 'translateY(0)';
                        card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                      }}
                      onMouseDown={(e) => {
                        const card = e.currentTarget;
                        card.style.transform = 'translateY(0) scale(0.98)';
                      }}
                      onMouseUp={(e) => {
                        const card = e.currentTarget;
                        card.style.transform = 'translateY(-2px)';
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: isCompact ? '10px' : isMedium ? '13px' : '15px', color: '#212529' }}>
                        {example.name}
                      </div>
                      {!isCompact && (
                        <div style={{ fontSize: isMedium ? '11px' : '13px', color: '#868e96', marginTop: isMedium ? '3px' : '4px', lineHeight: 1.3 }}>
                          {example.description}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Code Editor */}
          {!isReadOnly && !isLocked && showEditor && (
            <div style={{ borderRadius: isCompact ? '8px' : '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <ReactCodeMirror
                placeholder={"Write your mermaid code here..."}
                style={{ width: "100%" }}
                extensions={[mermaidExtension as any]}
                basicSetup={{
                  lineNumbers: !isCompact,
                  foldGutter: !isCompact,
                  syntaxHighlighting: true,
                }}
                theme={"dark"}
                value={data}
                width="100%"
                height={isCompact ? "120px" : isMedium ? "160px" : "220px"}
                onChange={onInputChange}
              />
            </div>
          )}
          
          {/* Preview */}
          <div
            style={{
              width: "100%",
              background: !isReadOnly ? "white" : "transparent",
              borderRadius: !isReadOnly ? "10px" : "0",
              border: !isReadOnly ? "1px solid #e9ecef" : "none",
              boxShadow: !isReadOnly ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
              overflow: "hidden",
            }}
          >
            <Mermaid
              name={block.id}
              chart={data.trim()}
              isResizable={!isReadOnly && !isLocked}
              showToolbar={!isReadOnly}
            />
          </div>
        </div>
      );
    },
  }
);

export const insertMermaid = () => ({
  title: "Mermaid",
  group: "Other",
  onItemClick: <
    BSchema extends Record<string, BlockConfig>
  >(
    editor: BlockNoteEditor<BSchema>
  ) => {
    insertOrUpdateBlock(editor, {
      type: TYPE,
    });
  },
  aliases: ["mermaid"],
  icon: <MdNote />,
  subtext: "Insert a Mermaid chart",
});
