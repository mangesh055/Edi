import React, { useState, useEffect } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import ChartRenderer from './ChartRenderer';
import { motion } from 'framer-motion';

export default function PowerBIDashboard({ charts, chartCustomization, handleRename, handleDelete }) {
  const [layout, setLayout] = useState([]);

  useEffect(() => {
    // Generate initial layout for new charts
    const newLayout = charts.map((c, i) => {
      return {
        i: c.id,
        x: (i * 6) % 12,
        y: Math.floor(i / 2) * 4,
        w: 6,
        h: 4,
        minW: 4,
        minH: 3
      };
    });
    setLayout(newLayout);
  }, [charts]);

  const onLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', minHeight: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>📊</span> Power BI-Style Interactive Canvas
        </h3>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Drag to move • Drag bottom-right corner to resize
        </div>
      </div>
      
      {charts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          Generate charts using the AI Builder to see them on the canvas.
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          onLayoutChange={onLayoutChange}
          isDraggable={true}
          isResizable={true}
          draggableHandle=".drag-handle"
          margin={[20, 20]}
        >
          {charts.map((chart) => (
            <div key={chart.id} style={{ 
              backgroundColor: '#fff', 
              borderRadius: '16px', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}>
              {/* Power BI style drag handle header */}
              <div className="drag-handle" style={{ 
                cursor: 'grab', 
                padding: '8px 16px', 
                background: '#f8fafc', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#64748b'
              }}>
                <span style={{ cursor: 'move' }}>⋮⋮</span>
                <span style={{ fontWeight: 600 }}>{chart.type.toUpperCase()}</span>
                <span></span>
              </div>
              
              <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
                <ChartRenderer 
                  chart={chart} 
                  customization={chartCustomization} 
                  onRenameClick={handleRename} 
                  onDeleteClick={handleDelete} 
                />
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
