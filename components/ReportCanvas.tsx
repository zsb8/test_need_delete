import React from 'react';
import { useDrop } from 'react-dnd';
import { Card, Input, Upload, Button, Table } from 'antd';
import { EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { ReportComponent, ComponentType } from '@/types/report';
import styles from '@/styles/ReportCanvas.module.css';

interface ReportCanvasProps {
  components: ReportComponent[];
  selectedComponent: ReportComponent | null;
  onSelectComponent: (component: ReportComponent | null) => void;
  onUpdateComponent: (id: string, updates: Partial<ReportComponent>) => void;
  onDeleteComponent: (id: string) => void;
}

const ReportCanvas: React.FC<ReportCanvasProps> = ({
  components,
  selectedComponent,
  onSelectComponent,
  onUpdateComponent,
  onDeleteComponent,
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'COMPONENT',
    drop: (item: { type: ComponentType }, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset) {
        const newComponent: ReportComponent = {
          id: Date.now().toString(),
          type: item.type,
          data: item.type === ComponentType.TEXT ? { content: 'New Text' } :
                item.type === ComponentType.IMAGE ? { url: '', position: 'left' } :
                { headers: [], rows: [] },
          position: { x: offset.x, y: offset.y },
          size: { width: '100%', height: 'auto' },
        };
        onUpdateComponent(newComponent.id, newComponent);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const renderComponent = (component: ReportComponent) => {
    const isSelected = selectedComponent?.id === component.id;

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (component.type === ComponentType.TEXT) {
        onUpdateComponent(component.id, {
          data: { ...component.data, content: e.target.value },
        });
      }
    };

    const handleImageUpload = (info: any) => {
      if (info.file.status === 'done') {
        if (component.type === ComponentType.IMAGE) {
          onUpdateComponent(component.id, {
            data: { ...component.data, url: info.file.response.url },
          });
        }
      }
    };

    switch (component.type) {
      case ComponentType.TEXT:
        return (
          <Card
            className={`${styles.component} ${isSelected ? styles.selected : ''}`}
            style={{ position: 'absolute', left: component.position.x, top: component.position.y }}
            onClick={() => onSelectComponent(component)}
          >
            <Input.TextArea
              value={(component.data as any).content}
              onChange={handleTextChange}
              autoSize
            />
          </Card>
        );

      case ComponentType.IMAGE:
        return (
          <Card
            className={`${styles.component} ${isSelected ? styles.selected : ''}`}
            style={{ position: 'absolute', left: component.position.x, top: component.position.y }}
            onClick={() => onSelectComponent(component)}
          >
            {(component.data as any).url ? (
              <img
                src={(component.data as any).url}
                alt="Uploaded"
                style={{ maxWidth: '100%' }}
              />
            ) : (
              <Upload
                accept="image/*"
                onChange={handleImageUpload}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />}>Upload Image</Button>
              </Upload>
            )}
          </Card>
        );

      case ComponentType.TABLE:
        const tableData = component.data as any;
        return (
          <Card
            className={`${styles.component} ${isSelected ? styles.selected : ''}`}
            style={{ position: 'absolute', left: component.position.x, top: component.position.y }}
            onClick={() => onSelectComponent(component)}
          >
            <Table
              dataSource={tableData.rows.map((row: string[], index: number) => ({
                key: index,
                ...row.reduce((acc: any, cell: string, i: number) => {
                  acc[tableData.headers[i]] = cell;
                  return acc;
                }, {}),
              }))}
              columns={tableData.headers.map((header: string) => ({
                title: header,
                dataIndex: header,
                key: header,
              }))}
              size="small"
              pagination={false}
            />
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={drop}
      className={`${styles.canvas} ${isOver ? styles.dragOver : ''}`}
    >
      {/* 标题始终在最上方 */}
      {components.filter(c => c.type === ComponentType.TEXT).map(component => (
        <div key={component.id} style={{ position: 'relative', marginBottom: 32 }}>
          <Card
            className={`${styles.component} ${selectedComponent?.id === component.id ? styles.selected : ''}`}
            style={{ position: 'static', fontSize: 28, fontWeight: 600, textAlign: 'center', marginBottom: 24 }}
            onClick={() => onSelectComponent(component)}
          >
            <Input
              value={(component.data as any).content}
              onChange={e => onUpdateComponent(component.id, { data: { ...component.data, content: e.target.value } })}
              style={{ fontSize: 28, fontWeight: 600, textAlign: 'center', border: 'none', boxShadow: 'none', outline: 'none' }}
              bordered={false}
            />
          </Card>
        </div>
      ))}
      {/* 其他组件自由布局 */}
      {components.filter(c => c.type !== ComponentType.TEXT).map((component) => (
        <div key={component.id}>
          {renderComponent(component)}
          {selectedComponent?.id === component.id && (
            <div className={styles.componentActions}>
              <Button
                icon={<EditOutlined />}
                onClick={() => onSelectComponent(component)}
              />
              <Button
                icon={<DeleteOutlined />}
                onClick={() => onDeleteComponent(component.id)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReportCanvas; 