import { createReactBlockSpec } from "@blocknote/react";
import {
  BlockNoteEditor,
  insertOrUpdateBlock,
  PropSchema,
  defaultProps,
  BlockConfig,
} from "@blocknote/core";
import Mermaid from "./Mermaid";
import { MdNote, MdCode, MdExpandMore, MdExpandLess } from "react-icons/md";
import ReactCodeMirror from "@uiw/react-codemirror";
import { mermaid as mermaidLang } from "codemirror-lang-mermaid";
import { MERMAID_EXAMPLES, MermaidExample } from "./example";
import { useMemo, useCallback, useState } from "react";

const TYPE = "mermaid" as const;

type Dimensions = {
  width: number | string;
  height: number | string;
};

const DEFAULT_MERMAID_CODE = `flowchart TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]` as const;

const mermaidPropSchema = {
  ...defaultProps,
  data: {
    default: DEFAULT_MERMAID_CODE,
  },
  width: {
    default: "400px" as const,
  },
  height: {
    default: "auto" as const,
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
      const { data, width, height } = block.props;

      const dimensions: Dimensions = { width, height };

      const onInputChange = useCallback((val: string) => {
        editor.updateBlock(block, {
          props: { ...block.props, data: val },
        });
      }, [editor, block]);

      // Use the dedicated mermaid language extension
      const mermaidExtension = mermaidLang();
      
      // Local state for UI
      const [showEditor, setShowEditor] = useState(true);
      const [showExamples, setShowExamples] = useState(false);
      const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
      
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

      // Button styles
      const buttonStyle: React.CSSProperties = {
        padding: '6px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        background: 'white',
        cursor: 'pointer',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
      };
      
      const categoryButtonStyle = (isActive: boolean): React.CSSProperties => ({
        padding: '4px 10px',
        border: isActive ? '1px solid #4dabf7' : '1px solid #ddd',
        borderRadius: '16px',
        background: isActive ? '#e7f5ff' : 'white',
        color: isActive ? '#1c7ed6' : '#495057',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: isActive ? 500 : 400,
        transition: 'all 0.2s',
      });
      
      const exampleCardStyle: React.CSSProperties = {
        padding: '8px 12px',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        background: 'white',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
      };

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            border: !isReadOnly ? "1px solid #dee2e6" : "none",
            padding: !isReadOnly ? "16px" : "0",
            borderRadius: "12px",
            width: "100%",
            backgroundColor: !isReadOnly ? "#f8f9fa" : "transparent",
          }}
        >
          {/* Toolbar */}
          {!isReadOnly && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e9ecef",
                paddingBottom: "12px",
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  style={{
                    ...buttonStyle,
                    background: showEditor ? '#e7f5ff' : 'white',
                    borderColor: showEditor ? '#4dabf7' : '#ddd',
                  }}
                  onClick={() => setShowEditor(!showEditor)}
                >
                  <MdCode size={16} />
                  {showEditor ? 'Hide Editor' : 'Show Editor'}
                </button>
                <button
                  style={{
                    ...buttonStyle,
                    background: showExamples ? '#e7f5ff' : 'white',
                    borderColor: showExamples ? '#4dabf7' : '#ddd',
                  }}
                  onClick={() => setShowExamples(!showExamples)}
                >
                  {showExamples ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
                  Templates
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#868e96' }}>
                Mermaid Diagram
              </div>
            </div>
          )}
          
          {/* Examples Section */}
          {!isReadOnly && showExamples && (
            <div
              style={{
                background: 'white',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid #e9ecef',
              }}
            >
              {/* Category Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button
                  style={categoryButtonStyle(selectedCategory === null)}
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    style={categoryButtonStyle(selectedCategory === cat)}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              {/* Example Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
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
                        (e.target as HTMLDivElement).style.borderColor = '#4dabf7';
                        (e.target as HTMLDivElement).style.background = '#f8f9fa';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLDivElement).style.borderColor = '#e9ecef';
                        (e.target as HTMLDivElement).style.background = 'white';
                      }}
                    >
                      <div style={{ fontWeight: 500, fontSize: '13px', color: '#212529' }}>
                        {example.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#868e96', marginTop: '2px' }}>
                        {example.description}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Code Editor */}
          {!isReadOnly && showEditor && (
            <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
              <ReactCodeMirror
                placeholder={"Write your mermaid code here..."}
                style={{ width: "100%" }}
                extensions={[mermaidExtension as any]}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  syntaxHighlighting: true,
                }}
                theme={"dark"}
                value={data}
                width="100%"
                height="200px"
                onChange={onInputChange}
              />
            </div>
          )}
          
          {/* Preview */}
          <div
            style={{
              width: "100%",
              background: !isReadOnly ? "white" : "transparent",
              borderRadius: !isReadOnly ? "8px" : "0",
              border: !isReadOnly ? "1px solid #e9ecef" : "none",
            }}
          >
            <Mermaid
              name={block.id}
              chart={data.trim()}
              isResizable={!isReadOnly}
              initialDimensions={dimensions}
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
