import React, { useState } from "react";
import { Layout, Menu, Button, Upload, message, Space, Divider, Input, Radio, Select } from "antd";
import { LogoutOutlined, UploadOutlined, EditOutlined, CheckOutlined, CloseOutlined, SaveOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useRouter } from "next/router";
import styles from "../styles/home.module.css";
import { isAuthorized } from "@/util/user-util";
import { Column, Line, Scatter } from '@ant-design/plots';
import { query_graph_data, save_report_settings } from "@/util/aws-api";

interface AWSResponse {
  message: string;
  result?: {
    status: string;
    id: string;
    message: string;
  };
}

const { Header, Content } = Layout;

const DEFAULT_LOGO = "/logo-default.png";

export default function ReportDesigner() {
  const router = useRouter();
  const [title, setTitle] = useState<string>("Report Title");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoPosition, setLogoPosition] = useState<'left' | 'right'>('left');
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [tableRows, setTableRows] = useState<string[][]>([]);
  const [selectedCol1, setSelectedCol1] = useState<string | undefined>(undefined);
  const [selectedCol2, setSelectedCol2] = useState<string | undefined>(undefined);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'scatter'>('bar');
  const [showChartDesign, setShowChartDesign] = useState<boolean>(false);
  const [editingColumn, setEditingColumn] = useState<number | null>(null);
  const [editedColumnName, setEditedColumnName] = useState<string>("");
  const [showGraph, setShowGraph] = useState<boolean>(false);
  const [graphOptions, setGraphOptions] = useState<{
    [key: string]: {
      x_candidates: string[];
      y_candidates: string[];
    };
  }>({});
  const [reportId, setReportId] = useState<string>("");

  // Upload Logo
  const handleLogoUpload = (info: any) => {
    let file = info.file?.originFileObj || info.file;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoUrl(e.target?.result as string);
      message.success('Logo uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    
    // Update report_json in localStorage
    const reportJson = localStorage.getItem('report_json');
    if (reportJson) {
      const data = JSON.parse(reportJson);
      data.title = newTitle;
      localStorage.setItem('report_json', JSON.stringify(data));
    }
  };

  // Upload CSV
  const handleFileUpload = (file: File) => {
    if (file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvData = e.target?.result as string;
          const lines = csvData.split('\n').filter(line => line.trim() !== '');
          const headers = lines[0].split(',');
          const rows = lines.slice(1).map(line => line.split(','));
          setTableHeaders(headers);
          setTableRows(rows);
          
          // Convert CSV data to JSON and store in localStorage
          const jsonData = {
            headers: headers,
            rows: rows,
            title: title // Save current title
          };
          localStorage.setItem('report_json', JSON.stringify(jsonData));
          
          // Reset chart selections
          setSelectedCol1(undefined);
          setSelectedCol2(undefined);
          setShowGraph(false);
          
          message.success('CSV file uploaded successfully');
        } catch (error) {
          message.error('Failed to parse CSV file');
        }
      };
      reader.readAsText(file);
    } else {
      message.error('Please upload a CSV file');
    }
    return false;
  };

  // Logout
  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  // Reset all settings
  const handleReset = () => {
    setTitle("Report Title");
    setLogoUrl("");
    setLogoPosition('left');
    setTableHeaders([]);
    setTableRows([]);
    setSelectedCol1(undefined);
    setSelectedCol2(undefined);
    setChartType('bar');
    setShowChartDesign(false);
    localStorage.removeItem('report_json');
  };

  // Handle chart design button click
  const handleChartDesign = async () => {
    try {
      const reportJson = localStorage.getItem('report_json');
      if (!reportJson) {
        message.error('Please upload CSV file first');
        return;
      }

      const csvData = JSON.parse(reportJson);
      const result = await query_graph_data(csvData);
      
      if (result.message === "Success") {
        setGraphOptions(result.result);
        setShowChartDesign(true);
      } else {
        message.error('Failed to get chart options');
      }
    } catch (error) {
      console.error('Error fetching graph options:', error);
      message.error('Failed to get chart options');
    }
  };

  // Handle show graph
  const handleShowGraph = () => {
    if (!selectedCol1 || !selectedCol2) {
      message.error('Please select X and Y axes');
      return;
    }
    setShowGraph(true);
  };

  // Get chart data
  const getChartData = () => {
    return tableRows.map(row => ({
      x: row[tableHeaders.indexOf(selectedCol1!)],
      y: Number(row[tableHeaders.indexOf(selectedCol2!)])
    })).filter(item => item.x && !isNaN(item.y));
  };

  // Render chart
  const renderChart = () => {
    const data = getChartData();
    const commonProps = {
      data,
      xField: 'x',
      yField: 'y',
      xAxis: { title: { text: selectedCol1 } },
      yAxis: { title: { text: selectedCol2 } },
      label: { position: 'top' },
      height: 320
    };

    switch (chartType) {
      case 'bar':
        return <Column {...commonProps} />;
      case 'line':
        return <Line {...commonProps} />;
      case 'scatter':
        return <Scatter {...commonProps} />;
      default:
        return null;
    }
  };

  // Handle column name edit
  const handleEditColumn = (index: number) => {
    setEditingColumn(index);
    setEditedColumnName(tableHeaders[index]);
  };

  // Save column name edit
  const handleSaveColumnEdit = async () => {
    if (editingColumn !== null) {
      const newHeaders = [...tableHeaders];
      newHeaders[editingColumn] = editedColumnName;
      setTableHeaders(newHeaders);
      
      // Update report_json in localStorage
      const reportJson = localStorage.getItem('report_json');
      if (reportJson) {
        const data = JSON.parse(reportJson);
        data.headers = newHeaders;
        localStorage.setItem('report_json', JSON.stringify(data));

        // Refresh graph options
        try {
          const result = await query_graph_data(data);
          if (result.message === "Success") {
            setGraphOptions(result.result);
          }
        } catch (error) {
          console.error('Error fetching graph options:', error);
          message.error('Failed to update graph options');
        }
      }

      // Clear chart display and selections
      setShowGraph(false);
      setSelectedCol1(undefined);
      setSelectedCol2(undefined);
      
      setEditingColumn(null);
      setEditedColumnName("");
    }
  };

  // Cancel column name edit
  const handleCancelColumnEdit = () => {
    setEditingColumn(null);
    setEditedColumnName("");
  };

  // Generate random data
  const generateRandomData = () => {
    const firstNames = ['John', 'Ian', 'Mike', 'Cailin', 'Ava', 'Emma', 'David', 'Sarah', 'Michael', 'Lisa'];
    const lastNames = ['Smith', 'Peterson', 'Ninson', 'Mills', 'Muffinson', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'IT', 'Operations', 'Research', 'Development', 'Support'];
    
    const headers = ["id", "first_name", "last_name", "salary", "department"];
    const rows = [];
    
    // Generate 10 random data rows
    for (let i = 1; i <= 10; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const department = departments[Math.floor(Math.random() * departments.length)];
      const salary = Math.floor(Math.random() * 90000) + 10000; // Random number between 10000-100000
      
      rows.push([
        i.toString(),
        firstName,
        lastName,
        salary.toString(),
        department
      ]);
    }

    const randomData = {
      headers,
      rows,
      title: title // Save current title
    };

    // Save to localStorage
    localStorage.setItem('report_json', JSON.stringify(randomData));
    
    // Update state
    setTableHeaders(headers);
    setTableRows(rows);
    
    // Reset chart selections
    setSelectedCol1(undefined);
    setSelectedCol2(undefined);
    setShowGraph(false);
    
    message.success('Random data generated successfully');
  };

  // Save report settings to AWS
  const handleSaveToAWS = async () => {
    try {
      const reportJson = localStorage.getItem('report_json');
      if (!reportJson) {
        message.error('No report data to save');
        return;
      }

      const reportData = JSON.parse(reportJson);
      const reportSettings = {
        title: title,
        logo: {
          url: logoUrl,
          position: logoPosition
        },
        data: {
          headers: reportData.headers,
          rows: reportData.rows
        },
        chart: {
          type: chartType,
          xAxis: selectedCol1,
          yAxis: selectedCol2
        }
      };

      // Save to localStorage
      localStorage.setItem('report_settings', JSON.stringify(reportSettings));

      // Save to AWS
      const result = await save_report_settings(reportSettings) as AWSResponse;
      if (result.message === "Success") {
        setReportId(result.result?.id || "");
        message.success('Report settings saved successfully');
      } else {
        message.error('Failed to save report settings');
      }
    } catch (error) {
      console.error('Error saving report settings:', error);
      message.error('Failed to save report settings');
    }
  };

  const menuItems: MenuProps["items"] = [
    {
      label: "Report Designer",
      key: "designer",
    },
    {
      label: "Logout",
      key: "logout",
      icon: <LogoutOutlined />,
    },
  ];

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    if (e.key === "logout") {
      handleLogout();
    }
  };

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.logo}>Report Designer</div>
        <Menu
          theme="dark"
          mode="horizontal"
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Header>
      <Content className={styles.content}>
        <div className={styles.toolbar}>
          <Space>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={() => false}
              onChange={handleLogoUpload}
            >
              <Button icon={<UploadOutlined />}>Upload Logo</Button>
            </Upload>
            <Radio.Group
              value={logoPosition}
              onChange={e => setLogoPosition(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <Radio.Button value="left">Logo Left</Radio.Button>
              <Radio.Button value="right">Logo Right</Radio.Button>
            </Radio.Group>
            <Input
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              style={{ width: 300 }}
              placeholder="Enter report title"
            />
            <Upload
              accept=".csv"
              beforeUpload={handleFileUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>Upload CSV</Button>
            </Upload>
            <Button onClick={generateRandomData}>Random Data</Button>
            <Button onClick={handleReset} danger>Reset</Button>
          </Space>
        </div>
        {/* Show chart design button when table data exists */}
        {tableHeaders.length > 0 && !showChartDesign && (
          <div style={{ margin: '24px 0', textAlign: 'center' }}>
            <Button type="primary" onClick={handleChartDesign}>
              Customize Chart
            </Button>
          </div>
        )}
        {/* Chart display settings area */}
        {tableHeaders.length > 0 && showChartDesign && (
          <div style={{ margin: '24px 0', background: '#f7f7f7', padding: '16px 24px', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <span style={{ fontWeight: 500 }}>Chart Display Settings:</span>
              <span>Chart Type:</span>
              <Radio.Group value={chartType} onChange={e => {
                setChartType(e.target.value);
                setSelectedCol1(undefined);
                setSelectedCol2(undefined);
                setShowGraph(false);
              }}>
                {Object.keys(graphOptions).map(type => (
                  <Radio.Button key={type} value={type}>{type === 'bar' ? 'Bar Chart' : type === 'line' ? 'Line Chart' : 'Scatter Plot'}</Radio.Button>
                ))}
              </Radio.Group>
              <span>Select X Axis:</span>
              <Select
                style={{ width: 120 }}
                placeholder="Select X Axis"
                value={selectedCol1}
                onChange={(value) => {
                  setSelectedCol1(value);
                  setShowGraph(false);
                }}
              >
                {graphOptions[chartType]?.x_candidates.map(col => (
                  <Select.Option key={col} value={col}>{col}</Select.Option>
                ))}
              </Select>
              <span>Select Y Axis:</span>
              <Select
                style={{ width: 120 }}
                placeholder="Select Y Axis"
                value={selectedCol2}
                onChange={(value) => {
                  setSelectedCol2(value);
                  setShowGraph(false);
                }}
              >
                {graphOptions[chartType]?.y_candidates.map(col => (
                  <Select.Option key={col} value={col}>{col}</Select.Option>
                ))}
              </Select>
              <Button type="primary" onClick={handleShowGraph}>
                Show Chart
              </Button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSaveToAWS}
              >
                Save Report Settings to AWS
              </Button>
              {reportId && (
                <span style={{ marginLeft: 8, color: '#52c41a' }}>
                  Report ID: {reportId}
                </span>
              )}
            </div>
          </div>
        )}
        <Divider />
        <div className={styles.designer}>
          <div className={styles.reportArea}>
            {/* Title and Logo layout */}
            <div className={styles.titleRow}>
              {logoPosition === 'left' && (
                <img
                  src={logoUrl || DEFAULT_LOGO}
                  alt="logo"
                  className={styles.logoImg}
                  style={{ width: 48, height: 48 }}
                />
              )}
              <span className={styles.reportTitle} style={{ lineHeight: `48px`, height: 48 }}>{title}</span>
              {logoPosition === 'right' && (
                <img
                  src={logoUrl || DEFAULT_LOGO}
                  alt="logo"
                  className={styles.logoImg}
                  style={{ width: 48, height: 48 }}
                />
              )}
            </div>
            {/* Table */}
            {tableHeaders.length > 0 && (
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    {tableHeaders.map((header, idx) => (
                      <th key={idx}>
                        {editingColumn === idx ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Input
                              value={editedColumnName}
                              onChange={(e) => setEditedColumnName(e.target.value)}
                              style={{ width: '120px' }}
                              autoFocus
                            />
                            <Button
                              type="text"
                              icon={<CheckOutlined />}
                              onClick={handleSaveColumnEdit}
                              style={{ padding: '4px' }}
                            />
                            <Button
                              type="text"
                              icon={<CloseOutlined />}
                              onClick={handleCancelColumnEdit}
                              style={{ padding: '4px' }}
                            />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {header}
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => handleEditColumn(idx)}
                              style={{ padding: '4px' }}
                            />
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, cidx) => (
                        <td key={cidx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Chart display area */}
            {showGraph && selectedCol1 && selectedCol2 && (
              <div style={{ marginTop: 40, padding: '0 24px' }}>
                {renderChart()}
              </div>
            )}
          </div>
        </div>
      </Content>
    </Layout>
  );
}
