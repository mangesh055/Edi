import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { executePythonCode } from '../../api/api';
import toast from 'react-hot-toast';

export default function PythonNotebook({ sessionId }) {
  const [code, setCode] = useState(`# The dataset is pre-loaded as a pandas DataFrame named 'df'.
# Pandas ('pd') and matplotlib ('plt') are also available.

print("Dataset Shape:", df.shape)
print("\\nFirst 5 rows:")
print(df.head())

# Example Plot:
# df['Units_Sold'].plot(kind='hist')
# plt.title('Units Sold Distribution')
# plt.show()
`);

  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [figures, setFigures] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput(null);
    setError(null);
    setFigures([]);
    
    const tid = toast.loading('Running Python code...');
    try {
      const res = await executePythonCode(sessionId, code);
      if (res.success) {
        setOutput(res.stdout);
        setError(res.stderr);
        setFigures(res.figures || []);
        toast.success('Execution completed!', { id: tid });
      }
    } catch (err) {
      toast.error('Execution failed.', { id: tid });
      setError(err.response?.data?.detail || err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🐍 Python Sandbox
          </h3>
          <button 
            onClick={handleRun}
            disabled={isRunning}
            style={{
              padding: '6px 16px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isRunning ? 'Running...' : '▶ Run Code'}
          </button>
        </div>
        
        <Editor
          height="40vh"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val)}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            padding: { top: 16 }
          }}
        />
      </div>

      {(output || error || figures.length > 0) && (
        <div style={{ backgroundColor: '#1e1e1e', borderRadius: '12px', padding: '20px', color: '#d4d4d4', fontFamily: 'Consolas, monospace', fontSize: '13px', overflowX: 'auto' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#a3a3a3', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Output</h4>
          
          {output && (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#d4d4d4' }}>
              {output}
            </pre>
          )}
          
          {error && (
            <pre style={{ margin: output ? '16px 0 0 0' : 0, whiteSpace: 'pre-wrap', color: '#f87171' }}>
              {error}
            </pre>
          )}

          {figures.length > 0 && (
            <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {figures.map((b64, idx) => (
                <div key={idx} style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '8px' }}>
                  <img src={`data:image/png;base64,${b64}`} alt={`Plot ${idx + 1}`} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
