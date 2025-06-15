import React from 'react';
import { Card } from 'antd';
import { useDrag } from 'react-dnd';
import { ComponentType } from '@/types/report';
import styles from '@/styles/ComponentPalette.module.css';

interface DraggableComponentProps {
  type: ComponentType;
  label: string;
}

const DraggableComponent: React.FC<DraggableComponentProps> = ({ type, label }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'COMPONENT',
    item: { type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={styles.draggableComponent}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <Card size="small" hoverable>
        {label}
      </Card>
    </div>
  );
};

const ComponentPalette: React.FC = () => {
  return (
    <div className={styles.palette}>
      <h3>Components</h3>
      <DraggableComponent type={ComponentType.IMAGE} label="Image" />
      <DraggableComponent type={ComponentType.TABLE} label="Table" />
    </div>
  );
};

export default ComponentPalette; 